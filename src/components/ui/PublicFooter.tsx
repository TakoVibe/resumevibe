import React from 'react';
import { Logo } from '../ui/Logo';

export function PublicFooter() {
    return (
        <div className="mt-16 flex w-full max-w-4xl flex-col items-center border-t border-[var(--border-color)]/40 pt-8">
            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
                <a href="/" className="group flex items-center gap-3">
                    <span className="rv-icon-tile h-9 w-9 bg-white"><Logo className="h-7 w-7" /></span>
                    <span className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Built with</span>
                        <span className="font-serif-ed text-xl text-[var(--text-main)] transition-colors group-hover:text-[var(--accent)]">ResumeVibe</span>
                    </span>
                </a>

                <div className="hidden h-8 w-px bg-[var(--border-color)] sm:block" />

                <a href="https://takovibe.com" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-[var(--border-color)] bg-white p-1">
                        <img src="/takovibe_logo.svg" alt="TakoVibe" className="h-full w-full object-contain" />
                    </span>
                    <span className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Part of</span>
                        <span className="font-serif-ed text-xl text-[var(--text-main)] transition-colors group-hover:text-[var(--accent)]">TakoVibe</span>
                    </span>
                </a>
            </div>

            <p className="mt-7 text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)] opacity-70">
                Professional identity, presented clearly
            </p>
        </div>
    );
}
