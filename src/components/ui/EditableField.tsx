import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { InlineAIButton } from './InlineAIButton';
import { PromptDialog } from './PromptDialog';
import { Unlink, ExternalLink } from 'lucide-react';
import { sanitizeInlineHtml } from '../../lib/resumeSanitizer';

interface Props {
    value: string;
    onSave: (value: string) => void;
    tagName?: keyof React.JSX.IntrinsicElements;
    className?: string;
    isEditable?: boolean;
    placeholder?: string;
    mode?: 'text' | 'html';
    aiProps?: {
        type: 'bullet' | 'summary' | 'role' | 'description';
        context?: {
            role?: string;
            company?: string;
            jobDescription?: string;
            projectName?: string;
            techStack?: string[];
        };
    };
    actions?: React.ReactNode;
    controlsLayout?: 'local' | 'parent';
    /** Called when Enter is pressed (without Shift). If provided, Enter adds a new bullet instead of blurring. */
    onEnterKey?: () => void;
    /** Called when Backspace is pressed on an empty field. Typically deletes the bullet. */
    onBackspaceEmpty?: () => void;
    /** If set, shows a warning when text exceeds this character count. */
    maxRecommendedLength?: number;
    /** data-bullet-index for focusing after Enter/Backspace */
    bulletIndex?: number;
}

export function EditableField({
    value,
    onSave,
    tagName: Tag = 'span',
    className = '',
    isEditable = true,
    placeholder = 'Click to edit...',
    aiProps,
    actions,
    controlsLayout = 'local',
    onEnterKey,
    onBackspaceEmpty,
    maxRecommendedLength,
    bulletIndex
}: Props) {
    const [isFocused, setIsFocused] = useState(false);
    const [showLinkPrompt, setShowLinkPrompt] = useState(false);
    const [hoveredLink, setHoveredLink] = useState<HTMLAnchorElement | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
    const showLinkPromptRef = useRef(false);
    const contentRef = useRef<HTMLElement>(null);
    const selectionRef = useRef<Range | null>(null);

    // Use a ref for onSave to keep handlers stable
    const onSaveRef = useRef(onSave);
    React.useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    const safeValue = React.useMemo(() => sanitizeInlineHtml(value), [value]);
    const hasAI = isEditable && aiProps;
    const hasActions = isEditable && actions;
    // Always show toolbar if editable to allow linking
    const showToolbar = isEditable;

    const containerClasses = [
        'resume-editable-field',
        className,
        isEditable ? 'rounded-sm transition-[opacity,outline,background-color] duration-200 cursor-text' : '',
        isFocused ? 'outline outline-2 outline-[var(--accent)]/30 z-10 relative' : '',
        !safeValue && isEditable ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400' : '',
        '[&_a]:!underline [&_a]:underline-offset-2 [&_a]:text-[var(--accent)] [&_a]:cursor-pointer [&_a]:relative'
    ].join(' ');

    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLElement>) => {
        // Did we blur because of the prompt?
        if (showLinkPromptRef.current) return;

        setIsFocused(false);
        const newValue = sanitizeInlineHtml(e.currentTarget.innerHTML);

        if (newValue !== safeValue) {
            onSaveRef.current(newValue);
        }
    }, [safeValue]);

    // Keep refs for callbacks to keep handleKeyDown stable
    const onEnterKeyRef = useRef(onEnterKey);
    React.useEffect(() => { onEnterKeyRef.current = onEnterKey; }, [onEnterKey]);
    const onBackspaceEmptyRef = useRef(onBackspaceEmpty);
    React.useEffect(() => { onBackspaceEmptyRef.current = onBackspaceEmpty; }, [onBackspaceEmpty]);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter') {
            if (Tag === 'h1' || Tag === 'h2' || Tag === 'h3' || Tag === 'span') {
                e.preventDefault();
                // If onEnterKey is provided and Shift is NOT held, create a new bullet
                if (onEnterKeyRef.current && !e.shiftKey) {
                    // Save current content first
                    const currentValue = sanitizeInlineHtml(e.currentTarget.innerHTML);
                    if (currentValue !== safeValue) {
                        onSaveRef.current(currentValue);
                    }
                    onEnterKeyRef.current();
                } else {
                    e.currentTarget.blur();
                }
            }
        }
        if (e.key === 'Backspace') {
            const el = e.currentTarget;
            const text = el.innerText?.trim() || '';
            if (text.length === 0 && onBackspaceEmptyRef.current) {
                e.preventDefault();
                onBackspaceEmptyRef.current();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();

            // Save selection
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                selectionRef.current = selection.getRangeAt(0);
                setShowLinkPrompt(true);
                showLinkPromptRef.current = true;
            }
        }
    }, [Tag, safeValue]);

    const handleLinkConfirm = React.useCallback((url: string) => {
        setShowLinkPrompt(false);
        showLinkPromptRef.current = false;

        // Restore selection
        const selection = window.getSelection();
        if (selection && selectionRef.current) {
            selection.removeAllRanges();
            selection.addRange(selectionRef.current);

            // Ensure focus is back on the element
            if (contentRef.current) {
                contentRef.current.focus();
            }

            if (url) {
                document.execCommand('createLink', false, url);
                if (contentRef.current) {
                    onSaveRef.current(sanitizeInlineHtml(contentRef.current.innerHTML));
                }
            }
        }
        selectionRef.current = null;
    }, []);

    const isEmpty = safeValue.length === 0;

    // If not editable and empty, hide completely
    if (isEmpty && !isEditable) {
        return null;
    }

    const handleMouseOver = React.useCallback((e: React.MouseEvent<HTMLElement>) => {
        if (!isEditable) return;
        const target = e.target as HTMLElement;
        const link = target.closest('a');

        if (link) {
            const rect = link.getBoundingClientRect();
            setHoveredLink(link as HTMLAnchorElement);
            setTooltipPosition({
                top: rect.bottom + window.scrollY + 5,
                left: rect.left + window.scrollX + (rect.width / 2)
            });
        }
    }, [isEditable]);

    const handleUnlink = React.useCallback(() => {
        if (hoveredLink) {
            const parent = hoveredLink.parentNode;
            while (hoveredLink.firstChild) {
                parent?.insertBefore(hoveredLink.firstChild, hoveredLink);
            }
            parent?.removeChild(hoveredLink);

            // Trigger save
            if (contentRef.current) {
                onSaveRef.current(sanitizeInlineHtml(contentRef.current.innerHTML));
            }
            setHoveredLink(null);
        }
    }, [hoveredLink]);

    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLElement>) => {
        setIsFocused(true);
        if (isEmpty && isEditable && e.currentTarget.textContent === placeholder) {
            e.currentTarget.textContent = '';
        }
    }, [isEmpty, isEditable, placeholder]);

    // Bullet length warning
    const plainText = safeValue.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    const isOverLength = maxRecommendedLength && plainText.length > maxRecommendedLength;

    // Memoize props to prevent unnecessary updates to element
    const commonProps = React.useMemo(() => ({
        ref: contentRef,
        className: containerClasses,
        contentEditable: isEditable,
        suppressContentEditableWarning: true,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
        onMouseOver: handleMouseOver,
        'data-placeholder': placeholder,
        ...(bulletIndex !== undefined ? { 'data-bullet-index': bulletIndex } : {})
    }), [containerClasses, isEditable, placeholder, handleFocus, handleBlur, handleKeyDown, handleMouseOver, bulletIndex]);

    // Memoize the element to prevent re-rendering when prompt opens (unless value changes)
    const contentElement = React.useMemo(() => (
        isEmpty && isEditable ? (
            React.createElement(Tag as string, {
                ...commonProps,
                className: `${commonProps.className} min-w-[1ch] inline-block align-bottom empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:italic`
            })
        ) : isEmpty ? (
            React.createElement(Tag as string, commonProps)
        ) : (
            React.createElement(Tag as string, {
                ...commonProps,
                dangerouslySetInnerHTML: { __html: safeValue }
            })
        )
    ), [isEmpty, isEditable, Tag, commonProps, safeValue]);

    const prompt = (
        <PromptDialog
            isOpen={showLinkPrompt}
            title="Enter Link URL"
            placeholder="https://example.com"
            onConfirm={handleLinkConfirm}
            onCancel={() => {
                setShowLinkPrompt(false);
                showLinkPromptRef.current = false;
                selectionRef.current = null;
            }}
        />
    );

    // Tooltip Portal for managing links
    const linkTooltip = hoveredLink && tooltipPosition && (
        createPortal(
            <div
                className="fixed z-[9999] flex items-center gap-2 px-2 py-1.5 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 backdrop-blur-sm transform -translate-x-1/2"
                style={{ top: tooltipPosition.top - window.scrollY, left: tooltipPosition.left - window.scrollX }}
                onMouseEnter={() => { /* keep open */ }}
                onMouseLeave={() => setHoveredLink(null)}
            >
                <div className="max-w-[200px] truncate opacity-80 border-r border-white/20 pr-2 mr-1">
                    {hoveredLink.getAttribute('href')}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(hoveredLink.getAttribute('href') || '', '_blank');
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-blue-300"
                    title="Open Link"
                >
                    <ExternalLink size={12} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleUnlink();
                    }}
                    className="p-1 hover:bg-red-500/20 hover:text-red-300 rounded transition-colors text-white/70"
                    title="Remove Link"
                >
                    <Unlink size={12} />
                </button>
            </div>,
            document.body
        )
    );

    if (showToolbar) {
        const isInline = Tag === 'span';
        const Wrapper = isInline ? 'span' : 'div';
        const isParentAnchor = controlsLayout === 'parent';

        // Wrapper is relative unless we intentionally want to anchor controls to a parent container
        const wrapperClasses = `${isParentAnchor ? '' : 'relative'} group/field stop-row-hover ${isInline ? '' : 'w-full'}`;

        // Determine position: Parent anchor forces right-side gutter positioning (left-full of parent)
        // Otherwise, Inline uses right-0 (end of text), Block uses left-full (end of box)
        const positionClass = isParentAnchor || !isInline ? 'left-[100%] pl-2 top-0 h-full' : 'right-0 bottom-full mb-1';

        return (
            <Wrapper className={wrapperClasses}>
                {contentElement}
                {isOverLength && (
                    <span
                        className="inline-flex items-center gap-1 text-[10px] text-amber-600 mt-0.5 print:hidden"
                        title={`This bullet is ${plainText.length} characters. Keep bullets to 1-2 lines for best readability.`}
                    >
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {plainText.length} chars — consider shortening
                    </span>
                )}
                {prompt}
                {linkTooltip}
                <div className={`absolute ${positionClass} flex items-center z-[100] print:hidden`}>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover/field:opacity-100 focus-within:opacity-100 transition-all duration-200">
                        {hasAI && (
                            <InlineAIButton
                                text={value}
                                type={aiProps!.type}
                                context={aiProps!.context}
                                onAccept={onSave}
                                className="border border-[var(--accent)]/20 shadow-lg"
                            />
                        )}
                        {actions && (
                            <div className="flex items-center gap-1 bg-[var(--bg-card)] shadow-lg border border-[var(--border-color)] rounded-lg p-1">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>
            </Wrapper>
        );
    }

    return (
        <>
            {contentElement}
            {prompt}
            {linkTooltip}
        </>
    );


}
