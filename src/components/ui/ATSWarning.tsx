import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';

interface ATSWarningProps {
    type: 'formatting' | 'label' | 'score' | 'date';
    text?: string;
    className?: string;
    onFix?: () => void;
}

export function ATSWarning({ type, text, className = '', onFix }: ATSWarningProps) {
    const warnings = {
        formatting: {
            title: "Unsafe Formatting Detected",
            desc: "Structural formatting could change the text order in the exported PDF. Repair it automatically before exporting.",
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            border: "border-orange-500/20"
        },
        label: {
            title: "Non-Standard Section Label",
            desc: "Custom section names can confuse ATS 'Segmentation' logic. Stick to standard labels like 'Experience' or 'Skills' for 100% parse rates.",
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "border-red-500/20"
        },
        score: {
            title: "Below 76% Threshold",
            desc: "Scores below 76% are often automatically rejected by LLM-backed screening tools. Focus on missing critical skills.",
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "border-red-500/20"
        },
        date: {
            title: "Non-Numeric Date Format",
            desc: "Enterprise systems (Workday) prefer numeric MM/YYYY formats. Text-based months can lead to date extraction failures.",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20"
        }
    };

    const config = warnings[type];
    const isActionableFormattingWarning = type === 'formatting' && Boolean(onFix);

    return (
        <div
            role="alert"
            aria-live="polite"
            className={`ats-warning flex gap-3 rounded-xl border p-3 animate-in fade-in slide-in-from-top-1 duration-300 ${
                isActionableFormattingWarning
                    ? 'fixed left-1/2 top-4 z-[80] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 border-[var(--resume-border)] bg-[var(--resume-bg)] text-[var(--resume-text)] shadow-2xl sm:left-auto sm:right-4 sm:translate-x-0'
                    : `${config.bg} ${config.border}`
            } ${className}`}
        >
            <div className={`${config.color} ${config.bg} mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg`}>
                <AlertTriangle size={15} />
            </div>
            <div className="min-w-0 flex-1">
                <h4 className={`text-[10px] font-black uppercase tracking-wider ${config.color} mb-1`}>
                    {config.title}
                </h4>
                <p className={`text-[11px] font-medium leading-relaxed ${isActionableFormattingWarning ? 'text-[var(--resume-gray)]' : 'text-[var(--text-muted)]'}`}>
                    {text || config.desc}
                </p>
                {onFix && (
                    <button
                        type="button"
                        onClick={onFix}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--resume-accent)] px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition hover:brightness-95"
                    >
                        <Sparkles size={12} /> Fix now
                    </button>
                )}
            </div>
        </div>
    );
}
