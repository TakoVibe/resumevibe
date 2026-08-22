import React from 'react';
import { Logo } from '../ui/Logo';

interface BrandSwitcherProps {
    compact?: boolean;
}

export function BrandSwitcher({ compact = false }: BrandSwitcherProps) {
    return (
        <a
            href="/"
            aria-label="ResumeVibe home"
            title="ResumeVibe home"
            className="group flex items-center justify-center rounded-xl border border-transparent p-1 transition hover:border-[var(--border-color)] hover:bg-[var(--bg-input)]"
        >
            <Logo
                className={`${compact ? 'h-8 w-8' : 'h-9 w-9'} rounded-full border border-[var(--border-color)] bg-white p-0.5 shadow-sm transition-transform duration-200 group-hover:scale-105`}
            />
        </a>
    );
}
