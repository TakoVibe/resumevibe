import React from 'react';
import {
    ArrowRight,
    BarChart3,
    Check,
    FileSearch,
    FileUp,
    Mail,
    MessageSquareText,
    PackageCheck,
    ShieldCheck,
    Sparkles,
    WandSparkles,
} from 'lucide-react';
import { AuthOnlyProviders } from '../Providers';
import { Navbar } from '../ui/Navbar';
import { Footer } from '../ui/Footer';
import { LoginModal } from '../ui/LoginModal';

const aiFeatures = [
    {
        icon: FileSearch,
        eyebrow: 'Best first step',
        title: 'Job Fit & Evidence Map',
        description: 'Paste a job description and see which requirements your resume supports, partially supports, or cannot prove yet.',
        value: 'Stop wasting applications on roles you cannot support—and find the exact gaps worth fixing.',
        outputs: ['Apply, Stretch, or Skip guidance', 'Requirement-by-requirement evidence', 'No invented experience'],
        price: 'Free',
        href: '/application-copilot',
        action: 'Check a job fit',
        featured: true,
    },
    {
        icon: PackageCheck,
        eyebrow: 'Complete application',
        title: 'AI Application Package',
        description: 'Turn one job description into focused resume proposals and a cover letter, then approve or reject every change.',
        value: 'Move from job post to a reviewed, role-specific application in one workflow.',
        outputs: ['Tailored resume proposals', 'Cover letter draft', 'Recruiter message and interview prep'],
        price: '30 tokens',
        href: '/application-copilot#build-package',
        action: 'Build an application',
        featured: true,
    },
    {
        icon: BarChart3,
        eyebrow: 'Recruiter perspective',
        title: 'Deep AI Resume Audit',
        description: 'Get a structured review of impact, clarity, evidence, ATS readiness, and job alignment before you send the resume.',
        value: 'Catch weak positioning and missing proof while you can still fix it.',
        outputs: ['Recruiter-style diagnostic', 'Prioritized risks and strengths', 'Actionable improvement guidance'],
        price: '30 tokens',
        href: '/?ai=audit',
        action: 'Open AI audit',
    },
    {
        icon: WandSparkles,
        eyebrow: 'Inside the editor',
        title: 'AI Writing Assist',
        description: 'Use the sparkle button beside a summary, role, project, or bullet to produce a stronger version in context.',
        value: 'Improve one weak sentence without rewriting or replacing the rest of your resume.',
        outputs: ['Before-and-after comparison', 'ATS-aware phrasing', 'Accept or discard control'],
        price: '5 tokens / suggestion',
        href: '/?ai=writing',
        action: 'Improve resume text',
    },
    {
        icon: Mail,
        eyebrow: 'Focused document',
        title: 'AI Cover Letter',
        description: 'Create an editable cover letter from your current resume and the full job description without changing the resume.',
        value: 'Start from a grounded first draft instead of a blank page.',
        outputs: ['Resume-grounded draft', 'Role-specific positioning', 'Editable and ready to copy'],
        price: '30 tokens',
        href: '/?ai=cover-letter',
        action: 'Create cover letter',
    },
    {
        icon: FileUp,
        eyebrow: 'Fast setup',
        title: 'AI Resume Import',
        description: 'Upload an existing PDF and convert its content into editable ResumeVibe sections instead of typing everything again.',
        value: 'Get from an old resume to a clean, editable workspace in minutes.',
        outputs: ['Structured resume sections', 'Editable imported content', 'Immediate template preview'],
        price: 'Available now',
        href: '/?ai=import',
        action: 'Import a resume',
    },
];

const workflow = [
    { number: '01', title: 'Bring your resume', text: 'Import a PDF or continue your last saved resume.' },
    { number: '02', title: 'Strengthen the evidence', text: 'Use writing assist only where the content is weak.' },
    { number: '03', title: 'Check one target role', text: 'See the supported requirements and the real gaps for free.' },
    { number: '04', title: 'Build and review', text: 'Generate the application package and approve every proposed change.' },
];

export function AIFeaturesContent() {
    return (
        <AuthOnlyProviders>
            <Navbar>
                <div className="flex min-w-0 flex-1 items-center justify-end">
                    <a href="/" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]">
                        Back to resume <ArrowRight size={13} />
                    </a>
                </div>
            </Navbar>
            <LoginModal />

            <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)]">
                <section className="relative overflow-hidden border-b border-[var(--border-color)] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
                    <div className="pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-3xl" />
                    <div className="relative mx-auto max-w-7xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accent-subtle)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                            <Sparkles size={13} /> ResumeVibe AI tools
                        </div>
                        <div className="mt-7 grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
                            <div>
                                <h1 className="max-w-4xl font-serif-ed text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                                    From resume to <span className="italic text-[var(--accent)]">ready-to-send</span> application.
                                </h1>
                                <p className="mt-7 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
                                    Choose the problem you need to solve. ResumeVibe shows the output, cost, and review step before you commit.
                                </p>
                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <a href="/application-copilot" className="rv-button-primary px-5 py-3"><FileSearch size={16} /> Check a job fit free</a>
                                    <a href="/?ai=audit" className="rv-button-secondary px-5 py-3"><BarChart3 size={16} /> Audit my resume</a>
                                </div>
                            </div>
                            <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="rv-icon-tile"><ShieldCheck size={18} /></span>
                                    <div>
                                        <p className="text-sm font-semibold">You stay in control</p>
                                        <p className="text-[11px] text-[var(--text-muted)]">Review before anything changes</p>
                                    </div>
                                </div>
                                <div className="mt-5 space-y-3">
                                    {['Your resume remains the source of truth', 'AI suggestions are never applied silently', 'Real skill gaps stay visible'].map((item) => (
                                        <div key={item} className="flex items-start gap-2.5 text-xs leading-5 text-[var(--text-muted)]"><Check size={14} className="mt-0.5 shrink-0 text-green-500" />{item}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-20" aria-labelledby="ai-feature-heading">
                    <div className="max-w-2xl">
                        <p className="rv-kicker">Choose by outcome</p>
                        <h2 id="ai-feature-heading" className="mt-3 font-serif-ed text-4xl sm:text-5xl">Every AI feature, in one place</h2>
                        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">Start with the free fit check if you are unsure what to do next.</p>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {aiFeatures.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <article key={feature.title} className={`group flex flex-col rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-lg ${feature.featured ? 'border-[var(--accent)]/35 bg-[var(--accent-subtle)]' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <span className="rv-icon-tile"><Icon size={18} /></span>
                                        <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{feature.price}</span>
                                    </div>
                                    <p className="mt-6 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">{feature.eyebrow}</p>
                                    <h3 className="mt-2 text-xl font-semibold tracking-tight">{feature.title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{feature.description}</p>
                                    <div className="mt-5 rounded-2xl bg-[var(--bg-input)] p-4">
                                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Why it matters</p>
                                        <p className="mt-2 text-xs leading-5">{feature.value}</p>
                                    </div>
                                    <ul className="mt-5 space-y-2">
                                        {feature.outputs.map((output) => <li key={output} className="flex items-start gap-2 text-xs text-[var(--text-muted)]"><Check size={13} className="mt-0.5 shrink-0 text-green-500" />{output}</li>)}
                                    </ul>
                                    <a href={feature.href} className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] transition group-hover:gap-3">{feature.action} <ArrowRight size={14} /></a>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="border-y border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <p className="rv-kicker">Recommended workflow</p>
                                <h2 className="mt-3 font-serif-ed text-4xl sm:text-5xl">A focused path, not a toolbox maze</h2>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><MessageSquareText size={15} className="text-[var(--accent)]" /> One job at a time works best</div>
                        </div>
                        <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--border-color)] sm:grid-cols-2 xl:grid-cols-4">
                            {workflow.map((step) => (
                                <div key={step.number} className="bg-[var(--bg-main)] p-6">
                                    <p className="font-mono text-xs text-[var(--accent)]">{step.number}</p>
                                    <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
                                    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{step.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-3xl bg-[var(--text-main)] p-6 text-[var(--bg-main)] sm:flex-row sm:items-center sm:p-8">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-60">Start with clarity</p>
                                <p className="mt-2 max-w-2xl font-serif-ed text-3xl">See whether your resume can prove the job requirements before you pay for AI writing.</p>
                            </div>
                            <a href="/application-copilot" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--bg-main)] px-5 py-3 text-xs font-semibold text-[var(--text-main)]">Check fit free <ArrowRight size={14} /></a>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </AuthOnlyProviders>
    );
}
