import React from 'react';

export function Footer() {
    return (
        <footer className="mt-auto w-full border-t border-[var(--border-color)] bg-[var(--bg-card)]/80 px-6 py-10 text-[var(--text-main)] backdrop-blur-md">
            <div className="mx-auto flex max-w-[100rem] flex-col items-center justify-between gap-7 md:flex-row">
                <div className="flex flex-col items-center md:items-start group">
                    <div className="flex items-center gap-2">
                        <span className="font-serif-ed text-2xl font-normal tracking-tight text-[var(--text-main)]">ResumeVibe</span>
                    </div>
                    <p className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-80">
                        Made with care in India · © 2026 TakoVibe
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-7 md:gap-9">
                    <a href="/ats-resume-guide" className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">Expert Guide</a>
                    <a href="/why-resumevibe" className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">Features</a>
                    <a href="https://takovibe.com" target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">TakoVibe</a>
                </div>
            </div>
        </footer>
    );
}
