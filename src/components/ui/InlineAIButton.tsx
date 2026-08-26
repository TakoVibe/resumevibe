import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { useToken } from '../../context/TokenContext';

interface InlineAIButtonProps {
    text: string;
    type: 'bullet' | 'summary' | 'role' | 'description';
    context?: {
        jobDescription?: string;
        role?: string;
        company?: string;
        projectName?: string;
        techStack?: string[];
    };
    onAccept: (optimizedText: string) => void;
    className?: string;
}

export function InlineAIButton({
    text,
    type,
    context,
    onAccept,
    className = ''
}: InlineAIButtonProps) {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizedText, setOptimizedText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { canAffordTokens, chargeTokensAfterSuccess } = useToken();

    const handleOptimize = async () => {
        if (!text.trim()) return;

        if (!canAffordTokens(5)) return;

        setIsOptimizing(true);
        setError(null);
        try {
            const response = await fetch('/api/optimize-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text.trim(),
                    type,
                    context,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to optimize text');
            }

            if (data.success && data.optimized) {
                const charged = await chargeTokensAfterSuccess('inline_edit', 5, 'resumevibe');
                if (!charged) return;
                setOptimizedText(data.optimized);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleAccept = () => {
        if (optimizedText) {
            onAccept(optimizedText);
            setOptimizedText(null);
        }
    };

    const handleReject = () => {
        setOptimizedText(null);
    };

    const modalContent = optimizedText ? (
        <>
            {/* Backdrop */}
            <div
                className="rv-modal-backdrop fixed inset-0 z-[9999] print:hidden transition-opacity"
                onClick={handleReject}
            />

            {/* Floating Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[90%] max-w-2xl print:hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="rv-modal flex max-h-[90vh] flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5 sm:p-6">
                        <div className="flex items-center gap-4">
                            <div className="rv-icon-tile">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <p className="rv-kicker">AI writing assist</p>
                                <h3 className="mt-1 font-serif-ed text-2xl leading-none text-[var(--text-main)]">Review suggestion</h3>
                            </div>
                        </div>
                        <button
                            onClick={handleReject}
                            className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
                        {/* Side-by-side comparison */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Original */}
                            <div className="space-y-3">
                                <p className="rv-kicker !text-[var(--text-muted)]">Original</p>
                                <div className="h-full min-h-[160px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] p-5 text-[var(--text-main)]">
                                    <p
                                        className="text-sm leading-relaxed whitespace-pre-wrap opacity-80 font-medium"
                                        dangerouslySetInnerHTML={{ __html: text }}
                                    />
                                </div>
                            </div>

                            {/* Optimized */}
                            <div className="space-y-3">
                                <p className="rv-kicker flex items-center gap-1.5">
                                    <Sparkles size={12} /> Suggested
                                </p>
                                <div className="relative h-full min-h-[160px] overflow-hidden rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-subtle)] p-5">
                                    <p
                                        className="relative z-10 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-[var(--text-main)]"
                                        dangerouslySetInnerHTML={{ __html: optimizedText || '' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 justify-end pt-4 border-t border-[var(--border-color)]">
                            <button
                                onClick={handleReject}
                                className="rv-button-quiet"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleAccept}
                                className="rv-button-primary"
                            >
                                <Check size={18} />
                                Apply Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    ) : null;

    const buttonElement = (
        <button
            onClick={handleOptimize}
            disabled={isOptimizing || !text.trim()}
            className={`flex items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-white p-2 text-[var(--accent)] shadow-sm transition hover:bg-[var(--accent-subtle)] ${isOptimizing ? 'opacity-80' : ''} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            title="Enhance with AI"
        >
            {isOptimizing ? (
                <Loader2 size={14} className="animate-spin" />
            ) : (
                <Sparkles size={14} />
            )}
        </button>
    );

    if (error) {
        return (
            <div className={`text-xs text-red-600 ${className}`}>
                {error}
            </div>
        );
    }

    return (
        <>
            {buttonElement}
            {optimizedText && (typeof document !== 'undefined') && createPortal(modalContent, document.body)}
        </>
    );
}
