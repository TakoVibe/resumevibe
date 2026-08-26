import React from 'react';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    FileQuestion,
    FileText,
    Search,
    Sparkles,
    Target,
} from 'lucide-react';
import { AuthOnlyProviders } from '../Providers';
import { Navbar } from '../ui/Navbar';
import { Footer } from '../ui/Footer';
import { LoginModal } from '../ui/LoginModal';

const helpfulLinks = [
    {
        href: '/job-fit',
        icon: Target,
        eyebrow: 'Compare',
        title: 'Check a job fit',
        description: 'See where your resume matches a role and where the evidence is thin.',
    },
    {
        href: '/ats-resume-guide',
        icon: BookOpen,
        eyebrow: 'Learn',
        title: 'Read the ATS guide',
        description: 'Build a resume that is easy for both recruiters and software to read.',
    },
    {
        href: '/profile',
        icon: FileText,
        eyebrow: 'Organize',
        title: 'Open your resumes',
        description: 'Return to your saved drafts, versions, and application workspace.',
    },
];

export function NotFoundContent() {
    return (
        <AuthOnlyProviders>
            <div className="flex min-h-screen flex-col overflow-hidden bg-[var(--bg-main)] font-sans-ed text-[var(--text-main)]">
                <Navbar>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        <FileQuestion size={12} className="text-[var(--accent)]" /> Error 404
                    </span>
                </Navbar>
                <LoginModal />

                <main className="relative flex-1">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_28%_10%,var(--accent-glow),transparent_42%)] opacity-80" />
                    <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(var(--text-main)_1px,transparent_1px),linear-gradient(90deg,var(--text-main)_1px,transparent_1px)] [background-size:36px_36px]" />

                    <div className="relative mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
                        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20">
                            <section className="max-w-2xl">
                                <div className="mb-7 flex items-center gap-4">
                                    <p className="rv-kicker">Page not found</p>
                                    <div className="h-px w-14 bg-[var(--accent)]/50" />
                                </div>

                                <h1 className="font-serif-ed text-5xl font-normal leading-[0.92] tracking-tight sm:text-7xl lg:text-[5.6rem]">
                                    This page missed the <span className="italic text-[var(--accent)]">final draft.</span>
                                </h1>

                                <p className="mt-7 max-w-xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
                                    The link may have moved, changed names, or never made it past review. Your resume and saved work are still safe.
                                </p>

                                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                                    <a href="/" className="rv-button-primary min-h-12 px-6">
                                        <ArrowLeft size={15} /> Back to resume builder
                                    </a>
                                    <a href="/ai-tools" className="rv-button-secondary min-h-12 px-6">
                                        <Sparkles size={15} className="text-[var(--accent)]" /> Explore AI tools
                                    </a>
                                </div>

                                <p className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                    <Search size={13} className="text-[var(--accent)]" /> No resume data was harmed along the way.
                                </p>
                            </section>

                            <aside aria-label="Missing resume page illustration" className="relative mx-auto w-full max-w-xl lg:max-w-none">
                                <div className="absolute -left-4 top-10 h-[82%] w-[88%] -rotate-3 rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-card)]/45" />
                                <div className="rv-panel relative overflow-hidden p-4 sm:p-6">
                                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                                        <div className="flex gap-1.5" aria-hidden="true">
                                            <span className="h-2 w-2 rounded-full bg-[var(--border-color)]" />
                                            <span className="h-2 w-2 rounded-full bg-[var(--border-color)]" />
                                            <span className="h-2 w-2 rounded-full bg-[var(--accent)]/60" />
                                        </div>
                                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Untitled page</span>
                                    </div>

                                    <div className="relative mt-5 min-h-[25rem] overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-7 shadow-inner sm:p-10">
                                        <span aria-hidden="true" className="absolute -right-3 -top-12 font-serif-ed text-[13rem] leading-none text-[var(--accent)] opacity-[0.08] sm:text-[17rem]">404</span>

                                        <div className="relative">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="h-3 w-36 rounded-full bg-[var(--text-main)]/75" />
                                                    <div className="mt-3 h-2 w-24 rounded-full bg-[var(--accent)]/55" />
                                                </div>
                                                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-[var(--accent)]/45 text-[var(--accent)]">
                                                    <FileQuestion size={18} />
                                                </span>
                                            </div>

                                            <div className="mt-10 border-t border-[var(--border-color)] pt-6">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Experience</span>
                                                    <span className="h-px flex-1 bg-[var(--border-color)]" />
                                                </div>
                                                <div className="mt-6 space-y-4">
                                                    {[92, 76, 84].map((width) => (
                                                        <div key={width} className="flex items-center gap-3">
                                                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]/65" />
                                                            <span className="h-2 rounded-full bg-[var(--text-main)]/12" style={{ width: `${width}%` }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-10 rounded-xl border border-dashed border-[var(--accent)]/40 bg-[var(--accent-subtle)] p-5 text-center">
                                                <p className="font-serif-ed text-3xl italic text-[var(--accent)]">Section not found</p>
                                                <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Try another route</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>

                        <section className="mt-16 border-t border-[var(--border-color)] pt-10 lg:mt-20" aria-labelledby="helpful-routes-title">
                            <div className="mb-6 flex items-end justify-between gap-4">
                                <div>
                                    <p className="rv-kicker">Useful routes</p>
                                    <h2 id="helpful-routes-title" className="mt-2 font-serif-ed text-3xl">Pick up where you left off.</h2>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                {helpfulLinks.map((item) => (
                                    <a key={item.href} href={item.href} className="group rv-panel flex min-h-40 flex-col p-5 transition-transform duration-200 hover:-translate-y-1 sm:p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <span className="rv-icon-tile"><item.icon size={17} /></span>
                                            <ArrowRight size={15} className="text-[var(--text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
                                        </div>
                                        <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{item.eyebrow}</p>
                                        <h3 className="mt-1 text-sm font-semibold">{item.title}</h3>
                                        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{item.description}</p>
                                    </a>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>

                <Footer />
            </div>
        </AuthOnlyProviders>
    );
}
