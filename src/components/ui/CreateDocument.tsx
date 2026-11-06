import { useEffect, type MouseEvent } from 'react';
import { X } from 'lucide-react';

type Preview = 'standard' | 'columns' | 'cv';

const FORMATS: Array<{ href: string; label: string; title: string; blurb: string; preview: Preview }> = [
    { href: '/editor?fresh=1', label: 'Most common', title: 'Resume / CV', blurb: 'One or two pages for job applications. What most employers in India, the UK, and Europe call a CV.', preview: 'standard' },
    { href: '/editor?fresh=1&start=one-page', label: 'One page', title: 'One-page resume', blurb: 'A two-column layout that keeps everything on a single page.', preview: 'columns' },
    { href: '/editor?fresh=1&start=academic-cv', label: 'Research & academia', title: 'Academic CV', blurb: 'Research, publications, teaching, and references, across as many pages as you need.', preview: 'cv' },
];

const EXAMPLES = [
    { href: '/resume-examples/backend-developer/edit', title: 'Backend developer', details: 'Mid-level · Python, FastAPI, PostgreSQL' },
    { href: '/resume-examples/software-engineer/edit', title: 'Software engineer', details: 'Early career · TypeScript, React, Node.js' },
];

const IMPORT_HREF = '/editor?fresh=1&ai=import';

const line = 'block h-1 rounded-full bg-[var(--text-muted)]/25';
const heading = 'block h-1 w-10 rounded-full bg-[var(--accent)]/50';

function FormatPreview({ kind }: { kind: Preview }) {
    if (kind === 'columns') {
        return (
            <div className="flex h-full w-28 gap-2 rounded-md bg-[var(--bg-card)] p-2 shadow-sm">
                <div className="flex w-1/3 flex-col gap-1.5 rounded bg-[var(--accent)]/10 p-1.5">
                    <span className="block h-1.5 w-full rounded-full bg-[var(--accent)]/70" />
                    <span className={`${line} w-full`} /><span className={`${line} w-3/4`} /><span className={`${line} w-full`} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 py-1.5">
                    <span className={heading} />
                    <span className={`${line} w-full`} /><span className={`${line} w-full`} /><span className={`${line} w-2/3`} />
                    <span className={heading} />
                    <span className={`${line} w-full`} /><span className={`${line} w-5/6`} />
                </div>
            </div>
        );
    }
    if (kind === 'cv') {
        return (
            <div className="relative h-full w-28">
                <div className="absolute inset-0 translate-x-2.5 -translate-y-1.5 rounded-md bg-[var(--bg-card)] opacity-60 shadow-sm" />
                <div className="relative flex h-full flex-col items-center gap-1.5 rounded-md bg-[var(--bg-card)] p-3 shadow-sm">
                    <span className="block h-1.5 w-14 rounded-full bg-[var(--accent)]/70" />
                    <span className={`${line} w-16`} />
                    {['w-12', 'w-10', 'w-14'].map((width) => (
                        <div key={width} className="flex w-full flex-col gap-1 pt-1">
                            <span className={`block h-1 ${width} rounded-full bg-[var(--accent)]/50`} />
                            <span className={`${line} w-full`} /><span className={`${line} w-4/5`} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="flex h-full w-28 flex-col gap-1.5 rounded-md bg-[var(--bg-card)] p-3 shadow-sm">
            <span className="block h-1.5 w-14 rounded-full bg-[var(--accent)]/70" />
            <span className={`${line} w-20`} />
            <span className={heading} />
            <span className={`${line} w-full`} /><span className={`${line} w-full`} /><span className={`${line} w-3/4`} />
            <span className={heading} />
            <span className={`${line} w-full`} /><span className={`${line} w-5/6`} />
        </div>
    );
}

/** The new-document choices, shared by the /create page and the in-app modal. */
export function CreateOptions({ onChoose }: { onChoose?: (href: string) => void }) {
    const choose = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
        // Let modified clicks open a new tab as usual.
        if (!onChoose || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        onChoose(href);
    };

    return (
        <div className="flex flex-col gap-10">
            <section aria-labelledby="create-formats" className="flex flex-col gap-4">
                <h3 id="create-formats" className="rv-kicker">Start with a format</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    {FORMATS.map((format) => (
                        <a key={format.href} href={format.href} onClick={choose(format.href)} className="group flex flex-col gap-5 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition hover:-translate-y-1 hover:border-[var(--accent)]/50 hover:shadow-xl sm:p-6">
                            <div aria-hidden="true" className="hidden h-36 items-center justify-center rounded-2xl bg-[var(--bg-input)] p-4 sm:flex">
                                <FormatPreview kind={format.preview} />
                            </div>
                            <div className="flex flex-1 flex-col gap-2">
                                <span className="w-fit rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">{format.label}</span>
                                <span className="font-serif-ed text-3xl leading-tight text-[var(--text-main)]">{format.title}</span>
                                <span className="text-sm leading-6 text-[var(--text-muted)]">{format.blurb}</span>
                            </div>
                            <span className="text-xs font-bold text-[var(--accent)]">Start →</span>
                        </a>
                    ))}
                </div>
            </section>

            <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
                <section aria-labelledby="create-examples" className="flex flex-col gap-4">
                    <h3 id="create-examples" className="rv-kicker">Or start from an example</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {EXAMPLES.map((example) => (
                            <a key={example.href} href={example.href} onClick={choose(example.href)} className="flex flex-col gap-1.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent)]/50">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{example.details}</span>
                                <span className="font-serif-ed text-2xl text-[var(--text-main)]">{example.title}</span>
                                <span className="text-xs font-bold text-[var(--accent)]">Edit a copy →</span>
                            </a>
                        ))}
                    </div>
                </section>

                <section aria-labelledby="create-import" className="flex flex-col gap-4">
                    <h3 id="create-import" className="rv-kicker">Already have one?</h3>
                    <a href={IMPORT_HREF} onClick={choose(IMPORT_HREF)} className="flex h-full flex-col gap-1.5 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent)]/50">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">PDF or pasted text</span>
                        <span className="font-serif-ed text-2xl text-[var(--text-main)]">Import a resume or CV</span>
                        <span className="text-xs font-bold text-[var(--accent)]">Upload →</span>
                    </a>
                </section>
            </div>
        </div>
    );
}

export function CreateDocumentModal({ isOpen, onClose, onChoose }: {
    isOpen: boolean;
    onClose: () => void;
    onChoose?: (href: string) => void;
}) {
    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <div className="rv-modal-backdrop absolute inset-0" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-labelledby="create-document-title" className="rv-modal relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-5 py-5 sm:px-7">
                    <div className="flex flex-col gap-1">
                        <p className="rv-kicker">New document</p>
                        <h2 id="create-document-title" className="font-serif-ed text-3xl leading-none text-[var(--text-main)] sm:text-4xl">What would you like to create?</h2>
                        <p className="text-xs text-[var(--text-muted)]">Every format uses the same editor, AI Copilot, autosave, and PDF export.</p>
                    </div>
                    <button type="button" autoFocus onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]">
                        <X size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto p-5 sm:p-7">
                    <CreateOptions onChoose={onChoose} />
                </div>
            </div>
        </div>
    );
}
