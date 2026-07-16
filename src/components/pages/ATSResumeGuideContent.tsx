import React from 'react';
import {
    ArrowRight,
    Check,
    ChevronLeft,
    FileCheck2,
    FileText,
    Mail,
    SearchCheck,
    ShieldCheck,
    Sparkles,
    Target,
} from 'lucide-react';
import { AuthOnlyProviders } from '../Providers';
import { Footer } from '../ui/Footer';
import { Navbar } from '../ui/Navbar';

const foundations = [
    {
        number: '01',
        title: 'Make the document easy to parse',
        description: 'Use a single reading order, familiar section names, selectable text, and consistent dates. Decorative layouts should never interrupt the resume’s content hierarchy.',
    },
    {
        number: '02',
        title: 'Lead with evidence, not keyword volume',
        description: 'Relevant terminology helps only when it is supported by your actual work. Connect skills to responsibilities, outcomes, scope, and tools you can confidently discuss.',
    },
    {
        number: '03',
        title: 'Tailor for one role at a time',
        description: 'A strong application prioritizes the evidence that matters for the current job instead of trying to represent every possible direction in one document.',
    },
];

const reviewChecks = [
    'Every metric and outcome already exists in your source resume.',
    'Tools and skills are attached to experience you can explain in an interview.',
    'The summary describes demonstrated strengths rather than unsupported requirements.',
    'The cover letter matches the resume edits you actually approve.',
];

export function ATSResumeGuideContent() {
    return (
        <AuthOnlyProviders>
            <Navbar>
                <a href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]">
                    <ChevronLeft size={14} /> Back to editor
                </a>
            </Navbar>

            <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-20">
                <header className="grid gap-10 border-b border-[var(--border-color)] pb-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:pb-20">
                    <div>
                        <p className="rv-kicker">ResumeVibe expert guide</p>
                        <h1 className="mt-5 max-w-4xl font-serif-ed text-5xl leading-[0.98] text-[var(--text-main)] sm:text-6xl lg:text-7xl">
                            Build an application that is clear, relevant, and defensible.
                        </h1>
                        <p className="mt-7 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
                            ATS compatibility starts with readable structure. A strong application goes further: it connects the job’s requirements to evidence you have already earned, then gives you final control over every proposed change.
                        </p>
                    </div>
                    <div className="rv-panel p-5 sm:p-6">
                        <div className="flex items-start gap-3">
                            <span className="rv-icon-tile"><ShieldCheck size={17} /></span>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-main)]">The non-negotiable rule</p>
                                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Never add a skill, metric, responsibility, or outcome simply because it appears in the job description. Surface unsupported requirements as gaps.</p>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="py-16 lg:py-24">
                    <div className="mb-10 max-w-2xl">
                        <p className="rv-kicker">Part I · Foundations</p>
                        <h2 className="mt-3 font-serif-ed text-4xl text-[var(--text-main)] sm:text-5xl">What an ATS-friendly resume needs</h2>
                    </div>
                    <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--border-color)] lg:grid-cols-3">
                        {foundations.map((item) => (
                            <article key={item.number} className="bg-[var(--bg-card)] p-6 sm:p-8">
                                <span className="font-serif-ed text-3xl text-[var(--accent)]">{item.number}</span>
                                <h3 className="mt-8 text-base font-semibold text-[var(--text-main)]">{item.title}</h3>
                                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{item.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="border-y border-[var(--border-color)] py-16 lg:py-24">
                    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
                        <div>
                            <p className="rv-kicker">Part II · Agent workflow</p>
                            <h2 className="mt-3 font-serif-ed text-4xl text-[var(--text-main)] sm:text-5xl">Tailor the complete application together</h2>
                            <p className="mt-5 text-sm leading-7 text-[var(--text-muted)]">ResumeVibe uses the same source evidence to prepare both artifacts. That keeps the cover letter aligned with the resume proposal and makes the full package reviewable in one place.</p>
                        </div>
                        <div className="space-y-3">
                            {[
                                { icon: Target, label: 'Paste the job description', detail: 'Include responsibilities, requirements, and the role context.' },
                                { icon: Sparkles, label: 'Generate one application package', detail: 'The agent prepares targeted resume edits, requirement coverage, risks, and a cover letter together.' },
                                { icon: SearchCheck, label: 'Review the evidence', detail: 'See which requirements are matched, partially supported, or missing from the source resume.' },
                                { icon: FileCheck2, label: 'Approve with control', detail: 'Accept or reject proposals individually, then save approved resume edits as a new version.' },
                            ].map((step, index) => (
                                <div key={step.label} className="rv-panel flex items-start gap-4 p-4 sm:p-5">
                                    <span className="rv-icon-tile shrink-0"><step.icon size={16} /></span>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Step {index + 1}</p>
                                        <h3 className="mt-1 text-sm font-semibold text-[var(--text-main)]">{step.label}</h3>
                                        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{step.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-16 lg:py-24">
                    <div className="mb-10 max-w-2xl">
                        <p className="rv-kicker">Part III · The review screen</p>
                        <h2 className="mt-3 font-serif-ed text-4xl text-[var(--text-main)] sm:text-5xl">Where everything lives</h2>
                        <p className="mt-5 text-sm leading-7 text-[var(--text-muted)]">After generation, use the two visible tabs at the top of Tailored Application Review.</p>
                    </div>
                    <div className="grid gap-5 lg:grid-cols-2">
                        <article className="rv-panel overflow-hidden">
                            <div className="border-b border-[var(--border-color)] bg-[var(--bg-input)] p-5">
                                <div className="flex items-center gap-3"><FileText size={18} className="text-[var(--accent)]" /><h3 className="text-base font-semibold text-[var(--text-main)]">Resume changes</h3></div>
                            </div>
                            <div className="p-5 sm:p-6">
                                <p className="text-sm leading-6 text-[var(--text-muted)]">This tab contains requirement coverage, evidence gaps, before-and-after edits, why each change helps, and its risk level.</p>
                                <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.08em]">
                                    <span className="rounded-full bg-green-500/10 px-3 py-1.5 text-green-600">Matched</span>
                                    <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-amber-600">Partial</span>
                                    <span className="rounded-full bg-red-500/10 px-3 py-1.5 text-red-500">Gap</span>
                                </div>
                            </div>
                        </article>
                        <article className="rv-panel overflow-hidden border-[var(--accent)]/30">
                            <div className="border-b border-[var(--border-color)] bg-[var(--accent-subtle)] p-5">
                                <div className="flex items-center gap-3"><Mail size={18} className="text-[var(--accent)]" /><h3 className="text-base font-semibold text-[var(--text-main)]">Cover letter</h3></div>
                            </div>
                            <div className="p-5 sm:p-6">
                                <p className="text-sm leading-6 text-[var(--text-muted)]">Open the dedicated <strong className="text-[var(--text-main)]">Cover letter</strong> tab to read the complete draft and accept or reject it. The footer also includes a direct “Review cover letter” button.</p>
                                <p className="mt-4 rounded-xl bg-[var(--bg-input)] p-3 text-xs leading-5 text-[var(--text-muted)]">The letter is saved only when you approve it. Resume edits you reject are not applied.</p>
                                <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]"><strong className="text-[var(--text-main)]">Need only the letter?</strong> Choose “Generate cover letter” in the editor. It uses your current resume and job description without proposing resume changes.</p>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="rv-panel grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_0.9fr] lg:p-12">
                    <div>
                        <p className="rv-kicker">Final approval checklist</p>
                        <h2 className="mt-3 font-serif-ed text-4xl text-[var(--text-main)]">Read it like an interviewer</h2>
                        <p className="mt-5 text-sm leading-7 text-[var(--text-muted)]">The agent can prioritize and rewrite evidence, but you remain the authority on whether every claim is accurate.</p>
                    </div>
                    <div className="space-y-3">
                        {reviewChecks.map((check) => (
                            <div key={check} className="flex items-start gap-3 rounded-xl bg-[var(--bg-input)] p-3.5">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600"><Check size={12} /></span>
                                <p className="text-xs leading-5 text-[var(--text-main)]">{check}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="py-20 text-center lg:py-28">
                    <p className="rv-kicker">Ready when you are</p>
                    <h2 className="mx-auto mt-4 max-w-3xl font-serif-ed text-4xl text-[var(--text-main)] sm:text-6xl">Create a package you can confidently stand behind.</h2>
                    <a href="/" className="rv-button-primary mx-auto mt-8 w-fit px-6 py-3">
                        Open resume editor <ArrowRight size={15} />
                    </a>
                </section>
            </main>
            <Footer />
        </AuthOnlyProviders>
    );
}
