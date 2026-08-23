import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Check, ChevronLeft, MousePointerClick, Sparkles, X } from 'lucide-react';

export interface ProductTourStep {
    id: string;
    title: string;
    description: string;
    target?: string;
    advanceOn?: 'next' | 'target-click';
    instruction?: string;
}

interface ProductTourProps {
    steps: ProductTourStep[];
    storageKey?: string;
    onStart?: () => void;
    onStepChange?: (nextIndex: number, previousIndex: number) => void;
    onEnd?: (reason: 'completed' | 'skipped') => void;
}

interface TourRect {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
}

const TOUR_EVENT = 'resumevibe:start-tour';
const DEFAULT_STORAGE_KEY = 'resumevibe:product-tour:v1';
const TARGET_PADDING = 8;
const VIEWPORT_GUTTER = 12;

function getVisibleTarget(selector?: string): HTMLElement | null {
    if (!selector) return null;

    try {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
        return candidates.find((element) => {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            return rect.width > 0
                && rect.height > 0
                && styles.display !== 'none'
                && styles.visibility !== 'hidden';
        }) || null;
    } catch {
        return null;
    }
}

function getPaddedRect(element: HTMLElement): TourRect {
    const rect = element.getBoundingClientRect();
    const left = Math.max(VIEWPORT_GUTTER / 2, rect.left - TARGET_PADDING);
    const top = Math.max(VIEWPORT_GUTTER / 2, rect.top - TARGET_PADDING);
    const right = Math.min(window.innerWidth - VIEWPORT_GUTTER / 2, rect.right + TARGET_PADDING);
    const bottom = Math.min(window.innerHeight - VIEWPORT_GUTTER / 2, rect.bottom + TARGET_PADDING);

    return {
        top,
        right,
        bottom,
        left,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
    };
}

export function ProductTour({
    steps,
    storageKey = DEFAULT_STORAGE_KEY,
    onStart,
    onStepChange,
    onEnd,
}: ProductTourProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<TourRect | null>(null);
    const [isTargetPending, setIsTargetPending] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    const step = steps[stepIndex];
    const isLastStep = stepIndex === steps.length - 1;
    const requiresTargetClick = step?.advanceOn === 'target-click';

    const startTour = useCallback(() => {
        previousFocusRef.current = document.activeElement as HTMLElement | null;
        onStart?.();
        setStepIndex(0);
        setTargetRect(null);
        setIsTargetPending(false);
        setIsOpen(true);
    }, [onStart]);

    const endTour = useCallback((reason: 'completed' | 'skipped') => {
        try {
            window.localStorage.setItem(storageKey, reason);
        } catch {
            // The tour remains usable when storage is unavailable.
        }

        setIsOpen(false);
        setTargetRect(null);
        setIsTargetPending(false);
        onEnd?.(reason);
        window.setTimeout(() => previousFocusRef.current?.focus?.(), 0);
    }, [onEnd, storageKey]);

    const goToStep = useCallback((nextIndex: number) => {
        if (nextIndex >= steps.length) {
            endTour('completed');
            return;
        }

        const boundedIndex = Math.max(0, nextIndex);
        onStepChange?.(boundedIndex, stepIndex);
        setStepIndex(boundedIndex);
    }, [endTour, onStepChange, stepIndex, steps.length]);

    useEffect(() => {
        const handleReplay = () => startTour();
        window.addEventListener(TOUR_EVENT, handleReplay);

        let hasSeenTour = false;
        try {
            hasSeenTour = Boolean(window.localStorage.getItem(storageKey));
        } catch {
            hasSeenTour = false;
        }

        const params = new URLSearchParams(window.location.search);
        const forceTour = params.get('tour') === '1';
        const isWorkflowDeepLink = params.has('ai') || params.get('view') === 'public';
        const autoStartTimer = (!isWorkflowDeepLink && (forceTour || !hasSeenTour))
            ? window.setTimeout(startTour, 850)
            : undefined;

        return () => {
            window.removeEventListener(TOUR_EVENT, handleReplay);
            if (autoStartTimer) window.clearTimeout(autoStartTimer);
        };
    }, [startTour, storageKey]);

    useEffect(() => {
        if (!isOpen || !step) return;

        let currentTarget: HTMLElement | null = null;
        let clickHandled = false;
        let resizeObserver: ResizeObserver | null = null;
        let missingTimer: number | undefined;

        const updateRect = () => {
            if (!currentTarget) return;
            setTargetRect(getPaddedRect(currentTarget));
        };

        const handleTargetClick = () => {
            if (clickHandled) return;
            clickHandled = true;
            window.setTimeout(() => goToStep(stepIndex + 1), 0);
        };

        const bindTarget = () => {
            const nextTarget = getVisibleTarget(step.target);
            if (nextTarget === currentTarget) {
                updateRect();
                return;
            }

            if (currentTarget) {
                currentTarget.classList.remove('rv-tour-active-target');
                currentTarget.removeEventListener('click', handleTargetClick);
            }
            resizeObserver?.disconnect();

            currentTarget = nextTarget;
            setTargetRect(nextTarget ? getPaddedRect(nextTarget) : null);

            if (!nextTarget) return;

            if (missingTimer) window.clearTimeout(missingTimer);
            setIsTargetPending(false);
            if (requiresTargetClick) nextTarget.classList.add('rv-tour-active-target');

            const rect = nextTarget.getBoundingClientRect();
            const isOutsideViewport = rect.top < 0
                || rect.left < 0
                || rect.bottom > window.innerHeight
                || rect.right > window.innerWidth;
            if (isOutsideViewport) {
                nextTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                window.setTimeout(updateRect, 380);
            }

            if (requiresTargetClick) {
                nextTarget.addEventListener('click', handleTargetClick);
            }

            resizeObserver = new ResizeObserver(updateRect);
            resizeObserver.observe(nextTarget);
        };

        if (step.target) {
            setIsTargetPending(true);
            missingTimer = window.setTimeout(() => setIsTargetPending(false), 1000);
            bindTarget();
        } else {
            setTargetRect(null);
            setIsTargetPending(false);
        }

        const targetPoll = step.target ? window.setInterval(bindTarget, 220) : undefined;
        window.addEventListener('resize', bindTarget);
        window.addEventListener('scroll', updateRect, true);

        return () => {
            if (missingTimer) window.clearTimeout(missingTimer);
            if (targetPoll) window.clearInterval(targetPoll);
            window.removeEventListener('resize', bindTarget);
            window.removeEventListener('scroll', updateRect, true);
            resizeObserver?.disconnect();
            if (currentTarget) {
                currentTarget.classList.remove('rv-tour-active-target');
                currentTarget.removeEventListener('click', handleTargetClick);
            }
        };
    }, [goToStep, isOpen, requiresTargetClick, step, stepIndex]);

    useEffect(() => {
        if (!isOpen) return;

        const focusTimer = window.setTimeout(() => cardRef.current?.focus(), 60);
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                endTour('skipped');
            }
            if (event.key === 'ArrowLeft' && stepIndex > 0) {
                event.preventDefault();
                goToStep(stepIndex - 1);
            }
            if (event.key === 'ArrowRight' && !requiresTargetClick) {
                event.preventDefault();
                goToStep(stepIndex + 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.clearTimeout(focusTimer);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [endTour, goToStep, isOpen, requiresTargetClick, stepIndex]);

    const cardStyle = useMemo<CSSProperties>(() => {
        if (!targetRect) {
            return {
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(390px, calc(100vw - 24px))',
            };
        }

        const cardWidth = Math.min(360, window.innerWidth - (VIEWPORT_GUTTER * 2));
        const estimatedCardHeight = 260;
        const spaceBelow = window.innerHeight - targetRect.bottom;
        const top = spaceBelow >= estimatedCardHeight + 16
            ? targetRect.bottom + 14
            : Math.max(VIEWPORT_GUTTER, targetRect.top - estimatedCardHeight - 14);
        const preferredLeft = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
        const left = Math.min(
            window.innerWidth - cardWidth - VIEWPORT_GUTTER,
            Math.max(VIEWPORT_GUTTER, preferredLeft),
        );

        return { left, top, width: cardWidth };
    }, [targetRect]);

    if (!isOpen || !step) return null;

    const overlayStyle: CSSProperties = {
        position: 'fixed',
        background: 'rgba(7, 7, 7, 0.68)',
        backdropFilter: 'blur(2px)',
        zIndex: 2147483000,
    };

    return (
        <div className="rv-product-tour" aria-live="polite">
            {targetRect ? (
                <>
                    <div aria-hidden="true" style={{ ...overlayStyle, inset: `0 0 auto 0`, height: targetRect.top }} />
                    <div aria-hidden="true" style={{ ...overlayStyle, inset: `${targetRect.bottom}px 0 0 0` }} />
                    <div aria-hidden="true" style={{ ...overlayStyle, left: 0, top: targetRect.top, width: targetRect.left, height: targetRect.height }} />
                    <div aria-hidden="true" style={{ ...overlayStyle, left: targetRect.right, right: 0, top: targetRect.top, height: targetRect.height }} />
                    <div
                        aria-hidden="true"
                        className="rv-tour-focus-ring"
                        style={{
                            position: 'fixed',
                            left: targetRect.left,
                            top: targetRect.top,
                            width: targetRect.width,
                            height: targetRect.height,
                            zIndex: 2147483001,
                        }}
                    >
                        {requiresTargetClick && (
                            <span className="rv-tour-click-marker">
                                <MousePointerClick size={14} />
                            </span>
                        )}
                    </div>
                </>
            ) : (
                <div aria-hidden="true" style={{ ...overlayStyle, inset: 0 }} />
            )}

            <div
                ref={cardRef}
                role="dialog"
                aria-modal={!targetRect}
                aria-labelledby="rv-tour-title"
                aria-describedby="rv-tour-description"
                tabIndex={-1}
                className="rv-tour-card fixed overflow-hidden rounded-[22px] border border-white/10 bg-[var(--bg-card)] text-[var(--text-main)] shadow-[0_32px_100px_-24px_rgba(0,0,0,0.72)] outline-none"
                style={{ ...cardStyle, zIndex: 2147483002 }}
            >
                <div className="h-1 bg-[var(--bg-input)]">
                    <div
                        className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
                        style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                    />
                </div>

                <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                                {isLastStep ? <Check size={16} /> : <Sparkles size={15} />}
                            </span>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                                {stepIndex === 0 ? 'Quick start' : `Step ${stepIndex} of ${steps.length - 1}`}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => endTour('skipped')}
                            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]"
                            aria-label="Skip walkthrough"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <h2 id="rv-tour-title" className="mt-5 font-serif-ed text-[30px] leading-[1.02] tracking-tight">
                        {step.title}
                    </h2>
                    <p id="rv-tour-description" className="mt-3 text-[13px] leading-relaxed text-[var(--text-muted)]">
                        {step.description}
                    </p>

                    {step.instruction && (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-subtle)] px-3 py-2.5 text-[11px] font-semibold text-[var(--accent)]">
                            <MousePointerClick size={14} className="shrink-0" />
                            <span>{step.instruction}</span>
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1">
                            {stepIndex > 0 && (
                                <button
                                    type="button"
                                    onClick={() => goToStep(stepIndex - 1)}
                                    className="rv-button-quiet min-h-9 px-2.5"
                                >
                                    <ChevronLeft size={15} /> Back
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => endTour('skipped')}
                                className="rv-button-quiet min-h-9 px-2.5"
                            >
                                Skip
                            </button>
                        </div>

                        {requiresTargetClick && targetRect ? (
                            <span className="text-right text-[10px] font-semibold leading-tight text-[var(--text-muted)]">
                                Click the highlighted<br />control to continue
                            </span>
                        ) : isTargetPending ? (
                            <span className="text-[10px] font-semibold text-[var(--text-muted)]">Finding control…</span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => goToStep(stepIndex + 1)}
                                className="rv-button-primary min-h-10 px-4"
                            >
                                {isLastStep ? 'Finish tour' : stepIndex === 0 ? 'Show me around' : 'Continue'}
                                {!isLastStep && <ArrowRight size={15} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function replayProductTour() {
    window.dispatchEvent(new CustomEvent(TOUR_EVENT));
}
