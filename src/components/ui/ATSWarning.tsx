import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ATSWarningProps {
    type: 'formatting' | 'label' | 'score' | 'date';
    text?: string;
    className?: string;
}

export function ATSWarning({ type, text, className = '' }: ATSWarningProps) {
    const warnings = {
        formatting: {
            title: "Formatting Detection",
            desc: "Complex HTML tags (bold, italics, links) detected. Legacy ATS parsers may fail to extract this text or merge it incorrectly.",
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

    return (
        <div className={`ats-warning flex gap-3 p-3 rounded-xl border ${config.bg} ${config.border} ${className} animate-in fade-in slide-in-from-top-1 duration-300`}>
            <div className={`${config.color} shrink-0 mt-0.5`}>
                <AlertTriangle size={14} />
            </div>
            <div>
                <h4 className={`text-[10px] font-black uppercase tracking-wider ${config.color} mb-1`}>
                    {config.title}
                </h4>
                <p className="text-[11px] font-medium text-[var(--text-muted)] leading-relaxed">
                    {text || config.desc}
                </p>
            </div>
        </div>
    );
}
