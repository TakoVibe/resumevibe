import React, { useRef, useState } from 'react';
import { ArrowUp, ArrowDown, EyeOff, Trash2, Copy, ChevronDown, Check, GripVertical } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
    id: string;
    title?: string;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onHide: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    /** Drag and drop: place the dragged section before or after this one. */
    onDropSection?: (draggedId: string, place: 'before' | 'after') => void;
    children: React.ReactNode;
    isEditable: boolean;
    forceMobileControls?: boolean;
    assistantState?: 'preview' | 'applied';
}

const SECTION_DRAG_TYPE = 'application/x-resume-section';

export function SectionControls({
    id,
    title,
    isFirst,
    isLast,
    onMoveUp,
    onMoveDown,
    onHide,
    onDelete,
    onDuplicate,
    onDropSection,
    children,
    isEditable,
    forceMobileControls = false,
    assistantState,
}: Props) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dropPlace, setDropPlace] = useState<'before' | 'after' | null>(null);
    const sectionRef = useRef<HTMLDivElement>(null);

    if (!isEditable) return <>{children}</>;

    // Touch screens have no native drag and drop, so the arrows stay the way to reorder there.
    const canDrag = Boolean(onDropSection) && !forceMobileControls;
    // Only section drags carry this type; bullet drags (text/plain) pass through untouched.
    const isSectionDrag = (event: React.DragEvent) => event.dataTransfer.types.includes(SECTION_DRAG_TYPE);
    const dropHandlers = canDrag ? {
        onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
            if (!isSectionDrag(event)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            const rect = event.currentTarget.getBoundingClientRect();
            setDropPlace(event.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
        },
        onDragLeave: (event: React.DragEvent<HTMLDivElement>) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropPlace(null);
        },
        onDrop: (event: React.DragEvent<HTMLDivElement>) => {
            if (!isSectionDrag(event)) return;
            event.preventDefault();
            const draggedId = event.dataTransfer.getData(SECTION_DRAG_TYPE);
            if (draggedId && draggedId !== id && dropPlace) onDropSection?.(draggedId, dropPlace);
            setDropPlace(null);
        },
    } : {};

    const ControlsContent = () => (
        <>
            <span className="text-[10px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest px-2 sm:px-3 py-1 bg-[var(--bg-input)] rounded-lg mr-auto sm:mr-2 self-center select-none border border-[var(--border-color)] truncate max-w-[120px] sm:max-w-none">
                {title || id}
            </span>

            <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                    onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                    disabled={isFirst}
                    className="p-1.5 sm:p-2 hover:bg-[var(--bg-input)] rounded-lg text-[var(--text-main)] disabled:opacity-20 disabled:hover:bg-transparent "
                    title="Move Up"
                >
                    <ArrowUp size={14} className="sm:w-4 sm:h-4" />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                    disabled={isLast}
                    className="p-1.5 sm:p-2 hover:bg-[var(--bg-input)] rounded-lg text-[var(--text-main)] disabled:opacity-20 disabled:hover:bg-transparent "
                    title="Move Down"
                >
                    <ArrowDown size={14} className="sm:w-4 sm:h-4" />
                </button>
            </div>

            <div className="w-px h-4 sm:h-6 bg-[var(--border-color)] mx-0.5 sm:mx-1" />

            {onDuplicate && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                    className="p-1.5 sm:p-2 hover:bg-[var(--bg-input)] rounded-lg text-[var(--text-main)] "
                    title="Duplicate Section"
                >
                    <Copy size={14} className="sm:w-4 sm:h-4" />
                </button>
            )}

            {onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                    className="p-1.5 sm:p-2 hover:bg-red-500/10 text-red-500 hover:text-red-400 rounded-lg "
                    title="Delete Section"
                >
                    <Trash2 size={14} className="sm:w-4 sm:h-4" />
                </button>
            )}

            <button
                onClick={(e) => { e.stopPropagation(); onHide(); }}
                className="p-1.5 sm:p-2 hover:bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg "
                title="Hide Section"
            >
                <EyeOff size={14} className="sm:w-4 sm:h-4" />
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
                className={`p-1.5 sm:p-2 hover:bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg  ${isCollapsed ? 'bg-[var(--bg-input)] text-[var(--accent)]' : ''}`}
                title={isCollapsed ? "Expand Section" : "Collapse Section"}
            >
                <ChevronDown size={14} className={`sm:w-4 sm:h-4 transition-transform ${isCollapsed ? '-rotate-180' : ''}`} />
            </button>
        </>
    );

    return (
        <div
            ref={sectionRef}
            data-resume-section={id}
            {...dropHandlers}
            className={`group/section relative mb-2 rounded-lg transition-[outline,box-shadow,background-color,opacity] duration-300 sm:mb-4 ${assistantState ? `rv-assistant-target rv-assistant-target-${assistantState}` : ''} ${isDragging ? 'opacity-40' : ''}`}
        >
            {dropPlace && (
                <span className={`pointer-events-none absolute left-0 right-0 z-[80] h-[3px] rounded-full bg-[var(--accent)] print:hidden ${dropPlace === 'before' ? '-top-1.5' : '-bottom-1.5'}`} />
            )}
            {canDrag && (
                <div
                    draggable
                    data-section-drag-handle={id}
                    onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData(SECTION_DRAG_TYPE, id);
                        if (sectionRef.current) event.dataTransfer.setDragImage(sectionRef.current, 24, 16);
                        setIsDragging(true);
                    }}
                    onDragEnd={() => {
                        setIsDragging(false);
                        setDropPlace(null);
                    }}
                    className="absolute -left-7 top-1 z-[75] flex h-7 w-6 cursor-grab items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--bg-input)] hover:!opacity-100 active:cursor-grabbing group-hover/section:opacity-60 print:hidden"
                    title={`Drag to move ${title || 'this section'}`}
                    aria-label={`Drag to move ${title || 'this section'}`}
                >
                    <GripVertical size={16} />
                </div>
            )}
            {assistantState && (
                <span className={`pointer-events-none absolute -right-2 -top-2 z-[75] flex h-6 items-center gap-1 rounded-full px-2 text-[9px] font-bold shadow-lg print:hidden ${assistantState === 'applied' ? 'rv-assistant-applied-badge' : 'rv-assistant-preview-badge'}`}>
                    {assistantState === 'applied' ? <Check size={10} /> : 'AI'}
                    {assistantState === 'applied' ? 'Updated' : 'Preview'}
                </span>
            )}
            {/* Desktop Controls (Hover) or Mobile Header (Always visible) */}
            <div className={`
                ${forceMobileControls
                    ? 'flex w-full items-center gap-1 bg-[var(--bg-card)] border-b border-[var(--border-color)] rounded-t-lg p-2 mb-0 overflow-x-auto no-scrollbar'
                    : 'absolute top-0 right-0 -translate-y-[calc(100%+8px)] hidden group-hover/section:flex items-center gap-1 z-[70] bg-[var(--bg-card)] shadow-[var(--shadow)] border border-[var(--border-color)] rounded-xl p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200'}
            `}>
                {!forceMobileControls && (
                    <div className="absolute -bottom-2 left-0 w-full h-2 bg-transparent" />
                )}
                <ControlsContent />
            </div>

            {/* Content */}
            <div className={`p-1 relative z-30 transition-all duration-300 ${isCollapsed ? 'h-0 overflow-hidden opacity-0 m-0 p-0' : 'opacity-100'}`}>
                {children}
            </div>
            {isCollapsed && forceMobileControls && (
                <div
                    className="p-4 text-center text-[var(--text-muted)] text-sm italic bg-[var(--bg-input)]/30 cursor-pointer"
                    onClick={() => setIsCollapsed(false)}
                >
                    Tap to expand {title}
                </div>
            )}

            {onDelete && (
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    title="Delete Section"
                    message="Are you sure you want to delete this entire section? This action cannot be undone."
                    onConfirm={() => {
                        onDelete();
                        setShowDeleteConfirm(false);
                    }}
                    onCancel={() => setShowDeleteConfirm(false)}
                    confirmText="Delete"
                    isDestructive={true}
                />
            )}
        </div>
    );
}
