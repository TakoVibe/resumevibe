import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    Check,
    CheckCircle2,
    ChevronDown,
    CircleDot,
    Clipboard,
    FileCheck2,
    FileText,
    Gauge,
    Lightbulb,
    LockKeyhole,
    MessageSquareText,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Target,
    TriangleAlert,
    XCircle,
    Zap,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { Providers } from '../Providers';
import { Footer } from '../ui/Footer';
import { LoginModal } from '../ui/LoginModal';
import { Navbar } from '../ui/Navbar';
import { UpgradeModal } from '../ui/UpgradeModal';
import { TailoredApplicationReview, type AppliedApplicationPackage } from '../TailoredApplicationReview';
import { useAuth } from '../../context/AuthContext';
import { useToken } from '../../context/TokenContext';
import { useResume } from '../../hooks/useResume';
import { analyzeJobFit, createInterviewQuestions, createRecruiterMessage } from '../../lib/jobFit';
import type { EvidenceReport, FitDecision, FitStatus, JobApplicationRecord } from '../../types/application';

const DRAFT_STORAGE_KEY = 'application-copilot-draft-v1';
const APPLICATIONS_STORAGE_KEY = 'application-copilot-records-v1';

type WorkspaceStep = 'input' | 'report' | 'ready';

const decisionCopy: Record<FitDecision, { label: string; headline: string; description: string; tone: string }> = {
    apply: {
        label: 'Apply',
        headline: 'Your resume has credible evidence for this role.',
        description: 'Lead with the strongest matches and review the remaining gaps before submitting.',
        tone: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
    },
    stretch: {
        label: 'Stretch',
        headline: 'This role is plausible, but needs a focused application.',
        description: 'Several requirements have indirect evidence. Clarify what is true and leave real gaps visible.',
        tone: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
    skip: {
        label: 'Consider skipping',
        headline: 'Critical requirements are not supported yet.',
        description: 'Apply only if you can add genuine evidence that is missing from the current resume.',
        tone: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
    },
};

const statusIcon: Record<FitStatus, typeof CheckCircle2> = {
    matched: CheckCircle2,
    partial: TriangleAlert,
    gap: XCircle,
};

const statusStyle: Record<FitStatus, string> = {
    matched: 'bg-green-500/10 text-green-700 dark:text-green-400',
    partial: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    gap: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export function ApplicationCopilotContent() {
    return (
        <Providers>
            <ApplicationCopilotWorkspace />
        </Providers>
    );
}

function ApplicationCopilotWorkspace() {
    const { data: resume } = useResume();
    const { isAuthenticated } = useAuth();
    const { tokenBalance, showUpgradeModal, setShowUpgradeModal } = useToken();
    const [step, setStep] = useState<WorkspaceStep>('input');
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [report, setReport] = useState<EvidenceReport | null>(null);
    const [error, setError] = useState('');
    const [showPackageReview, setShowPackageReview] = useState(false);
    const [applications, setApplications] = useState<JobApplicationRecord[]>([]);
    const [readyApplication, setReadyApplication] = useState<JobApplicationRecord | null>(null);
    const [expandedRequirement, setExpandedRequirement] = useState<string | null>(null);

    const isSampleResume = resume.personalInfo?.email === 'johnathan.doe@example.com';
    const resumeEvidenceCount = useMemo(() => (
        resume.experience.reduce((total, item) => total + item.metrics.length, 0)
        + resume.skills.reduce((total, group) => total + group.items.length, 0)
        + resume.projects.reduce((total, project) => total + (project.metrics?.length || 0), 0)
    ), [resume]);

    useEffect(() => {
        try {
            const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}');
            setCompany(typeof draft.company === 'string' ? draft.company : '');
            setRole(typeof draft.role === 'string' ? draft.role : '');
            setJobDescription(typeof draft.jobDescription === 'string' ? draft.jobDescription : resume.targetJD || '');
            const stored = JSON.parse(localStorage.getItem(APPLICATIONS_STORAGE_KEY) || '[]');
            setApplications(Array.isArray(stored) ? stored : []);
        } catch {
            setJobDescription(resume.targetJD || '');
        }
    }, [resume.targetJD]);

    useEffect(() => {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ company, role, jobDescription }));
    }, [company, role, jobDescription]);

    const persistApplications = (records: JobApplicationRecord[]) => {
        setApplications(records);
        localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(records.slice(0, 25)));
    };

    const handleAnalyze = () => {
        if (jobDescription.trim().length < 350) {
            setError('Paste more of the job description—include responsibilities and requirements for a useful comparison.');
            return;
        }

        const result = analyzeJobFit(resume, jobDescription.trim());
        if (result.requirements.length < 3) {
            setError('We could not identify enough concrete requirements. Paste the requirements or qualifications section as well.');
            return;
        }

        setReport(result);
        setError('');
        setStep('report');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const openPackageReview = () => {
        if (!isAuthenticated) {
            window.dispatchEvent(new CustomEvent('show-login-modal'));
            return;
        }
        if (tokenBalance < 30) {
            setShowUpgradeModal(true);
            return;
        }
        setShowPackageReview(true);
    };

    const handlePackageApplied = (applicationPackage: AppliedApplicationPackage) => {
        if (!report) return;
        const now = new Date().toISOString();
        const record: JobApplicationRecord = {
            id: `application-${Date.now()}`,
            company: company.trim(),
            role: role.trim(),
            jobDescription: jobDescription.trim(),
            status: 'ready',
            evidenceReport: report,
            resumeSnapshot: applicationPackage.approvedResume,
            coverLetter: applicationPackage.coverLetter || undefined,
            recruiterMessage: createRecruiterMessage(applicationPackage.approvedResume, role.trim(), company.trim(), report),
            interviewQuestions: createInterviewQuestions(report),
            createdAt: now,
            updatedAt: now,
        };
        const nextRecords = [record, ...applications.filter((item) => item.id !== record.id)];
        persistApplications(nextRecords);
        setReadyApplication(record);
        setStep('ready');
        setShowPackageReview(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const markApplied = (record: JobApplicationRecord) => {
        const updated: JobApplicationRecord = {
            ...record,
            status: 'applied',
            appliedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        persistApplications(applications.map((item) => item.id === record.id ? updated : item));
        if (readyApplication?.id === record.id) setReadyApplication(updated);
        toast.success('Application marked as applied.');
    };

    const startAnother = () => {
        setStep('input');
        setCompany('');
        setRole('');
        setJobDescription('');
        setReport(null);
        setReadyApplication(null);
        setError('');
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)]">
            <Navbar>
                <div className="flex min-w-0 flex-1 items-center justify-center">
                    <div className="hidden items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] p-1 sm:flex">
                        {(['input', 'report', 'ready'] as const).map((item, index) => (
                            <div key={item} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold ${step === item ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
                                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[8px]">{index + 1}</span>
                                {item === 'input' ? 'Job' : item === 'report' ? 'Fit' : 'Ready'}
                            </div>
                        ))}
                    </div>
                    <span className="truncate text-xs font-semibold sm:hidden">Application Copilot</span>
                </div>
            </Navbar>
            <LoginModal />

            <main className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_58%_0%,var(--accent-glow),transparent_43%)] opacity-80" />
                <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
                    <a href="/" className="mb-7 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] transition hover:text-[var(--text-main)]">
                        <ArrowLeft size={13} /> Back to resume
                    </a>

                    {step === 'input' && (
                        <InputStep
                            resumeName={resume.personalInfo.fullName || 'Untitled resume'}
                            resumeTitle={resume.personalInfo.title || 'No target title yet'}
                            resumeEvidenceCount={resumeEvidenceCount}
                            isSampleResume={isSampleResume}
                            company={company}
                            role={role}
                            jobDescription={jobDescription}
                            error={error}
                            onCompanyChange={setCompany}
                            onRoleChange={setRole}
                            onJobDescriptionChange={setJobDescription}
                            onAnalyze={handleAnalyze}
                        />
                    )}

                    {step === 'report' && report && (
                        <ReportStep
                            report={report}
                            company={company}
                            role={role}
                            tokenBalance={tokenBalance}
                            expandedRequirement={expandedRequirement}
                            onExpandedRequirementChange={setExpandedRequirement}
                            onEdit={() => setStep('input')}
                            onCreatePackage={openPackageReview}
                        />
                    )}

                    {step === 'ready' && readyApplication && (
                        <ReadyStep
                            application={readyApplication}
                            onMarkApplied={() => markApplied(readyApplication)}
                            onStartAnother={startAnother}
                        />
                    )}

                    {applications.length > 0 && step !== 'ready' && (
                        <ApplicationHistory applications={applications} onMarkApplied={markApplied} />
                    )}
                </div>
            </main>

            <Footer />
            <TailoredApplicationReview
                isOpen={showPackageReview}
                onClose={() => setShowPackageReview(false)}
                initialJobDescription={jobDescription}
                onApplied={handlePackageApplied}
            />
            <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
            <Toaster position="bottom-center" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' } }} />
        </div>
    );
}

function InputStep({
    resumeName,
    resumeTitle,
    resumeEvidenceCount,
    isSampleResume,
    company,
    role,
    jobDescription,
    error,
    onCompanyChange,
    onRoleChange,
    onJobDescriptionChange,
    onAnalyze,
}: {
    resumeName: string;
    resumeTitle: string;
    resumeEvidenceCount: number;
    isSampleResume: boolean;
    company: string;
    role: string;
    jobDescription: string;
    error: string;
    onCompanyChange: (value: string) => void;
    onRoleChange: (value: string) => void;
    onJobDescriptionChange: (value: string) => void;
    onAnalyze: () => void;
}) {
    return (
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <header className="lg:sticky lg:top-28">
                <p className="rv-kicker">Evidence-first job fit</p>
                <h1 className="mt-4 max-w-2xl font-serif-ed text-5xl leading-[0.94] tracking-tight sm:text-6xl lg:text-7xl">
                    Know if the job is <span className="italic text-[var(--accent)]">worth your time.</span>
                </h1>
                <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
                    Compare a job with evidence already in your resume. See what is supported, what is weak, and what you should never claim.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    {[
                        { icon: Gauge, label: 'Fit decision', value: 'Apply, stretch or skip' },
                        { icon: ShieldCheck, label: 'Factual boundary', value: 'No invented experience' },
                        { icon: Zap, label: 'Free first step', value: 'No tokens to analyze' },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                            <item.icon size={15} className="text-[var(--accent)]" />
                            <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{item.label}</p>
                            <p className="mt-1 text-xs font-semibold text-[var(--text-main)]">{item.value}</p>
                        </div>
                    ))}
                </div>
            </header>

            <section className="rv-panel overflow-hidden">
                <div className="border-b border-[var(--border-color)] p-5 sm:p-7">
                    <div className="flex items-start gap-3">
                        <span className="rv-icon-tile"><FileCheck2 size={18} /></span>
                        <div className="min-w-0">
                            <p className="rv-kicker">Resume evidence</p>
                            <h2 className="mt-1 truncate font-serif-ed text-3xl">{resumeName}</h2>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">{resumeTitle} · {resumeEvidenceCount} evidence points available</p>
                        </div>
                        <a href="/" className="ml-auto shrink-0 text-[10px] font-semibold text-[var(--accent)] hover:underline">Edit resume</a>
                    </div>
                    {isSampleResume && (
                        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                            This is ResumeVibe’s sample resume. Replace it with your own resume before relying on the result.
                        </div>
                    )}
                </div>

                <div className="p-5 sm:p-7">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-[11px] font-semibold">Target role <span className="font-normal text-[var(--text-muted)]">(optional)</span></span>
                            <input value={role} onChange={(event) => onRoleChange(event.target.value)} className="rv-field h-11 w-full px-3 text-sm" placeholder="Senior Backend Engineer" />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-[11px] font-semibold">Company <span className="font-normal text-[var(--text-muted)]">(optional)</span></span>
                            <input value={company} onChange={(event) => onCompanyChange(event.target.value)} className="rv-field h-11 w-full px-3 text-sm" placeholder="Acme" />
                        </label>
                    </div>

                    <label className="mb-2 mt-5 block text-[11px] font-semibold">Job description</label>
                    <textarea
                        value={jobDescription}
                        onChange={(event) => onJobDescriptionChange(event.target.value)}
                        className="rv-field min-h-[22rem] w-full resize-y px-4 py-4 text-sm leading-6"
                        placeholder="Paste the responsibilities and requirements here…"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5"><LockKeyhole size={12} /> The free comparison runs in this browser.</span>
                        <span>{jobDescription.trim().length.toLocaleString()} characters</span>
                    </div>
                    {error && <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}</div>}

                    <button onClick={onAnalyze} className="rv-button-primary mt-6 w-full py-3 text-sm">
                        Analyze my fit — free <ArrowRight size={16} />
                    </button>
                </div>
            </section>
        </div>
    );
}

function ReportStep({
    report,
    company,
    role,
    tokenBalance,
    expandedRequirement,
    onExpandedRequirementChange,
    onEdit,
    onCreatePackage,
}: {
    report: EvidenceReport;
    company: string;
    role: string;
    tokenBalance: number;
    expandedRequirement: string | null;
    onExpandedRequirementChange: (id: string | null) => void;
    onEdit: () => void;
    onCreatePackage: () => void;
}) {
    const decision = decisionCopy[report.decision];
    return (
        <div>
            <header className="grid gap-6 border-b border-[var(--border-color)] pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                    <p className="rv-kicker">Your evidence map</p>
                    <h1 className="mt-3 font-serif-ed text-5xl leading-none sm:text-6xl">{role || 'Target role'}{company ? <span className="italic text-[var(--accent)]"> · {company}</span> : null}</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">This is an explainable comparison—not a prediction of whether an employer will interview you.</p>
                </div>
                <button onClick={onEdit} className="rv-button-secondary w-fit"><ArrowLeft size={14} /> Edit job details</button>
            </header>

            <section className="grid gap-5 py-8 lg:grid-cols-[1fr_19rem]">
                <div className="space-y-5">
                    <div className={`rounded-3xl border p-6 sm:p-8 ${decision.tone}`}>
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]"><CircleDot size={13} /> Recommendation</div>
                                <h2 className="mt-2 font-serif-ed text-4xl sm:text-5xl">{decision.label}</h2>
                                <p className="mt-2 text-sm font-semibold">{decision.headline}</p>
                                <p className="mt-1 max-w-xl text-xs leading-5 opacity-80">{decision.description}</p>
                            </div>
                            <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-8 border-current/10 bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm">
                                <span className="font-serif-ed text-4xl leading-none">{report.coverage}%</span>
                                <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Evidence</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <MetricCard label="Supported" value={report.matchedCount} icon={CheckCircle2} tone="text-green-600" />
                        <MetricCard label="Partial" value={report.partialCount} icon={TriangleAlert} tone="text-amber-600" />
                        <MetricCard label="Real gaps" value={report.gapCount} icon={XCircle} tone="text-red-500" />
                    </div>

                    <section className="rv-panel overflow-hidden">
                        <div className="border-b border-[var(--border-color)] p-5 sm:p-6">
                            <p className="text-sm font-semibold">Requirement-to-evidence map</p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">Open any requirement to see the supporting evidence and safe next action.</p>
                        </div>
                        <div className="divide-y divide-[var(--border-color)]">
                            {report.requirements.map((item) => {
                                const StatusIcon = statusIcon[item.status];
                                const expanded = expandedRequirement === item.id;
                                return (
                                    <article key={item.id}>
                                        <button onClick={() => onExpandedRequirementChange(expanded ? null : item.id)} className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[var(--bg-input)] sm:p-5">
                                            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${statusStyle[item.status]}`}><StatusIcon size={15} /></span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-semibold text-[var(--text-main)] sm:text-sm">{item.requirement}</span>
                                                    <span className="rounded-full bg-[var(--bg-input)] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{item.priority}</span>
                                                </span>
                                                <span className="mt-1 block text-[10px] capitalize text-[var(--text-muted)]">{item.status} · {item.score}% evidence similarity</span>
                                            </span>
                                            <ChevronDown size={15} className={`mt-2 shrink-0 text-[var(--text-muted)] transition ${expanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        {expanded && (
                                            <div className="grid gap-3 bg-[var(--bg-input)] px-4 pb-5 pt-1 sm:grid-cols-2 sm:px-16">
                                                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                                                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Resume evidence</p>
                                                    <p className="mt-2 text-xs leading-5">{item.evidence}</p>
                                                    {item.evidenceSource && <p className="mt-2 text-[9px] font-semibold text-[var(--accent)]">{item.evidenceSource}</p>}
                                                </div>
                                                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                                                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Safe next action</p>
                                                    <p className="mt-2 text-xs leading-5">{item.recommendation}</p>
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                    <div id="build-package" className="rv-panel scroll-mt-24 p-5">
                        <span className="rv-icon-tile"><Sparkles size={17} /></span>
                        <h2 className="mt-4 font-serif-ed text-3xl">Build the application.</h2>
                        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Create a tailored resume and cover letter, then approve or reject every proposal.</p>
                        <div className="mt-5 space-y-2 border-y border-[var(--border-color)] py-4 text-xs">
                            {['Tailored resume', 'Cover letter', 'Recruiter message', 'Interview questions'].map((item) => <div key={item} className="flex items-center gap-2"><Check size={13} className="text-green-500" />{item}</div>)}
                        </div>
                        <button onClick={onCreatePackage} className="rv-button-primary mt-5 w-full py-3">
                            Create package <span className="rounded bg-white/15 px-1.5 py-0.5 text-[9px]">30 tokens</span>
                        </button>
                        <p className="mt-2 text-center text-[9px] text-[var(--text-muted)]">Your balance: {tokenBalance} tokens</p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                        <p className="flex items-center gap-2 text-xs font-semibold"><Target size={14} className="text-[var(--accent)]" /> Strongest evidence</p>
                        <ul className="mt-3 space-y-2 text-[11px] leading-4 text-[var(--text-muted)]">
                            {(report.strengths.length ? report.strengths : ['No strong evidence identified yet.']).map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                    </div>
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                        <p className="flex items-center gap-2 text-xs font-semibold"><Lightbulb size={14} className="text-amber-500" /> Risks to prepare for</p>
                        <ul className="mt-3 space-y-2 text-[11px] leading-4 text-[var(--text-muted)]">
                            {(report.risks.length ? report.risks : ['No major gaps identified.']).map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                    </div>
                </aside>
            </section>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof CheckCircle2; tone: string }) {
    return <div className="rv-panel flex items-center gap-3 p-4 !shadow-none"><span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-input)] ${tone}`}><Icon size={16} /></span><div><p className="font-serif-ed text-3xl leading-none">{value}</p><p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p></div></div>;
}

function ReadyStep({ application, onMarkApplied, onStartAnother }: { application: JobApplicationRecord; onMarkApplied: () => void; onStartAnother: () => void }) {
    const copy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied.`);
        } catch {
            toast.error(`Could not copy ${label.toLowerCase()}.`);
        }
    };

    return (
        <div>
            <header className="mx-auto max-w-3xl text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-500/10 text-green-600"><FileCheck2 size={28} /></span>
                <p className="rv-kicker mt-6">Application ready</p>
                <h1 className="mt-3 font-serif-ed text-5xl sm:text-6xl">{application.role || 'Target role'}{application.company ? <span className="italic text-[var(--accent)]"> · {application.company}</span> : null}</h1>
                <p className="mt-4 text-sm text-[var(--text-muted)]">Your approved resume changes and application assets are saved in this browser.</p>
            </header>

            <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
                <ReadyAsset icon={FileText} title="Tailored resume" description="Approved changes are now in your ResumeVibe editor.">
                    <a href="/" className="rv-button-primary w-full">Open resume & export <ArrowRight size={14} /></a>
                </ReadyAsset>
                <ReadyAsset icon={MessageSquareText} title="Recruiter message" description="A concise introduction grounded in your strongest evidence.">
                    <button onClick={() => copy(application.recruiterMessage || '', 'Recruiter message')} className="rv-button-secondary w-full" disabled={!application.recruiterMessage}><Clipboard size={14} /> Copy message</button>
                </ReadyAsset>
                <ReadyAsset icon={BriefcaseBusiness} title="Cover letter" description="The letter you reviewed as part of the package.">
                    <button onClick={() => copy(application.coverLetter || '', 'Cover letter')} className="rv-button-secondary w-full" disabled={!application.coverLetter}><Clipboard size={14} /> Copy cover letter</button>
                </ReadyAsset>
                <ReadyAsset icon={Target} title="Interview preparation" description="Questions focused on your strongest evidence and weakest gaps.">
                    <div className="space-y-2 text-left text-xs leading-5 text-[var(--text-muted)]">{(application.interviewQuestions || []).map((question, index) => <p key={question}><strong className="text-[var(--text-main)]">{index + 1}.</strong> {question}</p>)}</div>
                </ReadyAsset>
            </div>

            <div className="mx-auto mt-6 flex max-w-5xl flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-semibold">Application status: <span className="capitalize text-[var(--accent)]">{application.status}</span></p><p className="mt-1 text-[10px] text-[var(--text-muted)]">Keep the job, resume version and outcome connected.</p></div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    {application.status !== 'applied' && <button onClick={onMarkApplied} className="rv-button-primary"><Check size={14} /> Mark as applied</button>}
                    <button onClick={onStartAnother} className="rv-button-secondary"><RotateCcw size={14} /> Analyze another job</button>
                </div>
            </div>
        </div>
    );
}

function ReadyAsset({ icon: Icon, title, description, children }: { icon: typeof FileText; title: string; description: string; children: React.ReactNode }) {
    return <section className="rv-panel flex min-h-56 flex-col p-5 sm:p-6"><span className="rv-icon-tile"><Icon size={17} /></span><h2 className="mt-4 font-serif-ed text-3xl">{title}</h2><p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{description}</p><div className="mt-auto pt-5">{children}</div></section>;
}

function ApplicationHistory({ applications, onMarkApplied }: { applications: JobApplicationRecord[]; onMarkApplied: (record: JobApplicationRecord) => void }) {
    return (
        <section className="mt-16 border-t border-[var(--border-color)] pt-10">
            <div className="mb-5 flex items-end justify-between gap-4"><div><p className="rv-kicker">Your recent work</p><h2 className="mt-2 font-serif-ed text-4xl">Application workspaces</h2></div><span className="text-[10px] text-[var(--text-muted)]">Stored on this device</span></div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {applications.slice(0, 6).map((application) => (
                    <article key={application.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                        <div className="flex items-start justify-between gap-3"><span className="rv-icon-tile h-9 w-9"><BriefcaseBusiness size={15} /></span><span className="rounded-full bg-[var(--bg-input)] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{application.status}</span></div>
                        <h3 className="mt-4 font-serif-ed text-2xl">{application.role || 'Target role'}</h3>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{application.company || 'Company not specified'}</p>
                        <div className="mt-4 flex items-center justify-between border-t border-[var(--border-color)] pt-3 text-[10px] text-[var(--text-muted)]"><span>{application.evidenceReport.coverage}% evidence</span><span>{new Date(application.updatedAt).toLocaleDateString()}</span></div>
                        {application.status === 'ready' && <button onClick={() => onMarkApplied(application)} className="rv-button-secondary mt-4 w-full"><Check size={13} /> Mark applied</button>}
                    </article>
                ))}
            </div>
        </section>
    );
}
