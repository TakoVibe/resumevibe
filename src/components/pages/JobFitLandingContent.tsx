import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    BriefcaseBusiness,
    Check,
    CheckCircle2,
    ChevronRight,
    FileCheck2,
    FileText,
    Gauge,
    Loader2,
    LockKeyhole,
    LogIn,
    ShieldCheck,
    Sparkles,
    Target,
    ThumbsUp,
    TriangleAlert,
    Upload,
    UserRoundCheck,
    X,
    XCircle,
    Zap,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { Providers } from '../Providers';
import { useAuth } from '../../context/AuthContext';
import { useToken } from '../../context/TokenContext';
import { useResume } from '../../hooks/useResume';
import { initialResume } from '../../data/sample-resume';
import { analyzeJobFit } from '../../lib/jobFit';
import { captureCampaignAttribution, trackCampaignEvent } from '../../lib/campaign';
import type { EvidenceReport, FitDecision, FitStatus } from '../../types/application';
import type { ResumeSchema } from '../../types/resume';
import { FeedbackWidget } from '../ui/FeedbackWidget';
import { Footer } from '../ui/Footer';
import { LoginModal } from '../ui/LoginModal';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { UpgradeModal } from '../ui/UpgradeModal';

type ResumeSource = 'pdf' | 'text' | 'sample' | 'saved';

const APPLICATION_HANDOFF_KEY = 'application-copilot-handoff-v1';
const PRODUCT_TOUR_KEY = 'resumevibe:product-tour:v1';
const MAX_PDF_SIZE = 5 * 1024 * 1024;

const SAMPLE_JOB_DESCRIPTION = `Senior Platform Engineer

We are looking for a Senior Platform Engineer with at least 6 years of software engineering experience building reliable distributed systems.
You must have hands-on experience with Go or Python and strong knowledge of Kubernetes in production environments.
Experience designing cloud infrastructure on AWS and managing infrastructure as code with Terraform is required.
You will build observable microservices and should be familiar with OpenTelemetry, Prometheus, or Grafana.
The role requires experience improving CI/CD systems and partnering with engineers across multiple teams.
Preferred experience includes mentoring engineers, operating high-throughput systems, and working with gRPC or event-driven architecture.
A background in incident response, reliability engineering, and cost optimization is preferred.
You should be able to communicate technical tradeoffs clearly to engineering and product stakeholders.`;

const decisionContent: Record<FitDecision, { label: string; title: string; description: string; className: string }> = {
    apply: {
        label: 'Apply',
        title: 'Your resume has credible evidence for this role.',
        description: 'Lead with the strongest matches and review the remaining gaps before submitting.',
        className: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
    },
    stretch: {
        label: 'Stretch',
        title: 'This role is plausible, but needs a focused application.',
        description: 'Several requirements have indirect evidence. Clarify what is true and leave real gaps visible.',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
    skip: {
        label: 'Consider skipping',
        title: 'Critical requirements are not supported yet.',
        description: 'Apply only if you can add genuine evidence that is missing from the current resume.',
        className: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
    },
};

const statusContent: Record<FitStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
    matched: { label: 'Supported', icon: CheckCircle2, className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
    partial: { label: 'Partial', icon: TriangleAlert, className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
    gap: { label: 'Gap', icon: XCircle, className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
};

export function JobFitLandingContent() {
    return (
        <Providers>
            <JobFitLanding />
        </Providers>
    );
}

function JobFitLanding() {
    const { data: savedResume, updateResume, isLoaded } = useResume();
    const { user, isAuthenticated } = useAuth();
    const { canAffordTokens, chargeTokensAfterSuccess, freeJobFitAvailable, showUpgradeModal, setShowUpgradeModal } = useToken();
    const [resumeSource, setResumeSource] = useState<ResumeSource>('pdf');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [report, setReport] = useState<EvidenceReport | null>(null);
    const [reportResume, setReportResume] = useState<ResumeSchema | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState('');
    const [waitingForLogin, setWaitingForLogin] = useState(false);
    const [showSuggestionPreview, setShowSuggestionPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasTrackedLanding = useRef(false);

    const hasSavedResume = isLoaded && savedResume.personalInfo?.email !== initialResume.personalInfo.email;
    const selectedResumeReady = resumeSource === 'sample'
        || (resumeSource === 'saved' && hasSavedResume)
        || (resumeSource === 'pdf' && Boolean(resumeFile))
        || (resumeSource === 'text' && resumeText.trim().length >= 120);

    useEffect(() => {
        captureCampaignAttribution();
        if (!hasTrackedLanding.current) {
            hasTrackedLanding.current = true;
            trackCampaignEvent('landing_view', { page: 'job_fit' });
        }
    }, []);

    const selectSource = (source: ResumeSource) => {
        setResumeSource(source);
        setError('');
        trackCampaignEvent('resume_source_selected', { source });
    };

    const acceptFile = (file?: File | null) => {
        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setError('Please choose a PDF resume. Scanned image-only PDFs may not parse correctly.');
            return;
        }
        if (file.size > MAX_PDF_SIZE) {
            setError('Please choose a PDF smaller than 5 MB.');
            return;
        }
        setResumeFile(file);
        setResumeSource('pdf');
        setError('');
        trackCampaignEvent('resume_input_started', { source: 'pdf', file_size_bucket: file.size < 1_000_000 ? 'under_1mb' : '1mb_to_5mb' });
    };

    const parseResume = async () => {
        let response: Response;
        if (resumeSource === 'pdf' && resumeFile) {
            const formData = new FormData();
            formData.append('pdf', resumeFile);
            response = await fetch('/api/parse-resume-pdf', { method: 'POST', body: formData });
        } else {
            response = await fetch('/api/parse-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: resumeText.trim() }),
            });
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data?.details || data?.error || 'We could not read this resume.');
        }
        return response.json() as Promise<ResumeSchema>;
    };

    const runAnalysis = useCallback(async () => {
        if (jobDescription.trim().length < 350) {
            setError('Paste more of the job description, including responsibilities and requirements.');
            return;
        }
        if (!selectedResumeReady) {
            setError('Upload a PDF, paste your resume, use your saved resume, or try the sample.');
            return;
        }

        setIsProcessing(true);
        setError('');
        trackCampaignEvent('fit_analysis_started', { resume_source: resumeSource });

        try {
            let resumeToAnalyze: ResumeSchema;
            let isRedeemingFreeFitCheck = false;
            if (resumeSource === 'sample') {
                resumeToAnalyze = initialResume;
            } else if (resumeSource === 'saved') {
                resumeToAnalyze = savedResume;
            } else {
                isRedeemingFreeFitCheck = freeJobFitAvailable;
                if (!isRedeemingFreeFitCheck && !canAffordTokens(50)) return;
                resumeToAnalyze = await parseResume();
                trackCampaignEvent('resume_parsed', { source: resumeSource, free_first_check: isRedeemingFreeFitCheck });
            }

            const nextReport = analyzeJobFit(resumeToAnalyze, jobDescription.trim());
            if (nextReport.requirements.length < 3) {
                throw new Error('We could not identify enough concrete requirements. Include the qualifications section and try again.');
            }

            if (resumeSource === 'pdf' || resumeSource === 'text') {
                const charged = await chargeTokensAfterSuccess(`job_fit_import_${resumeSource}`, 50);
                if (!charged) return;
            }

            if (resumeSource === 'pdf' || resumeSource === 'text') {
                updateResume({ ...resumeToAnalyze, targetJD: jobDescription.trim() });
            }

            setReportResume(resumeToAnalyze);
            setReport(nextReport);
            if (isRedeemingFreeFitCheck) {
                trackCampaignEvent('free_fit_check_redeemed', { resume_source: resumeSource });
            }
            trackCampaignEvent('fit_report_completed', {
                resume_source: resumeSource,
                decision: nextReport.decision,
                coverage: nextReport.coverage,
                requirement_count: nextReport.requirements.length,
                free_first_check: isRedeemingFreeFitCheck,
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (analysisError) {
            setError(analysisError instanceof Error ? analysisError.message : 'We could not complete the comparison. Please try again.');
            trackCampaignEvent('fit_analysis_failed', { resume_source: resumeSource });
        } finally {
            setIsProcessing(false);
        }
    }, [canAffordTokens, chargeTokensAfterSuccess, freeJobFitAvailable, jobDescription, resumeFile, resumeSource, resumeText, savedResume, selectedResumeReady, updateResume]);

    const handleAnalyze = () => {
        if (jobDescription.trim().length < 350 || !selectedResumeReady) {
            void runAnalysis();
            return;
        }

        const requiresImport = resumeSource === 'pdf' || resumeSource === 'text';
        if (requiresImport && !isAuthenticated) {
            setWaitingForLogin(true);
            trackCampaignEvent('signup_prompted', { reason: 'resume_import', resume_source: resumeSource });
            window.dispatchEvent(new CustomEvent('show-login-modal'));
            return;
        }
        void runAnalysis();
    };

    useEffect(() => {
        if (!waitingForLogin || !isAuthenticated) return;
        setWaitingForLogin(false);
        trackCampaignEvent('signup_completed', { continuation: 'fit_analysis' });
        void runAnalysis();
    }, [isAuthenticated, runAnalysis, waitingForLogin]);

    const useSample = () => {
        setResumeSource('sample');
        setJobDescription(SAMPLE_JOB_DESCRIPTION);
        setResumeFile(null);
        setResumeText('');
        setError('');
        trackCampaignEvent('sample_demo_selected');
        window.setTimeout(() => document.getElementById('job-description')?.focus(), 0);
    };

    const openSuggestionPreview = (stage: 'landing' | 'report') => {
        setShowSuggestionPreview(true);
        trackCampaignEvent('suggestion_preview_opened', { stage });
    };

    const resetToInput = () => {
        setReport(null);
        setReportResume(null);
        setError('');
        if (resumeSource === 'sample') {
            setResumeSource('pdf');
            setJobDescription('');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const continueToWorkspace = () => {
        if (!report || !reportResume || resumeSource === 'sample') {
            resetToInput();
            return;
        }

        window.localStorage.setItem(APPLICATION_HANDOFF_KEY, JSON.stringify({
            report,
            jobDescription: jobDescription.trim(),
            company: '',
            role: '',
            createdAt: new Date().toISOString(),
        }));
        window.localStorage.setItem(PRODUCT_TOUR_KEY, 'skipped');
        trackCampaignEvent('application_workspace_started', { decision: report.decision });
        window.location.href = '/application-copilot';
    };

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)]">
            <CampaignHeader userName={user?.first_name} isAuthenticated={isAuthenticated} />
            <LoginModal />
            <SuggestionPreviewDialog isOpen={showSuggestionPreview} onClose={() => setShowSuggestionPreview(false)} />

            {report ? (
                <ResultView
                    report={report}
                    resumeName={reportResume?.personalInfo.fullName || 'Your resume'}
                    isSample={resumeSource === 'sample'}
                    onBack={resetToInput}
                    onContinue={continueToWorkspace}
                    onPreview={() => openSuggestionPreview('report')}
                />
            ) : (
                <main>
                    <section className="relative overflow-hidden border-b border-[var(--border-color)]">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] bg-[radial-gradient(circle_at_68%_8%,var(--accent-glow),transparent_42%)] opacity-90" />
                        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.86fr_1.14fr] lg:items-start lg:px-8 lg:py-20">
                            <div className="pt-2 lg:sticky lg:top-24">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accent-subtle)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                                    <Target size={13} /> Evidence-first job fit
                                </div>
                                <h1 className="mt-7 max-w-3xl font-serif-ed text-5xl leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
                                    Is your resume strong enough for <span className="italic text-[var(--accent)]">this job?</span>
                                </h1>
                                <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
                                    Add your resume and the job description. ResumeVibe shows what you can prove, what is weak, and what to improve—without inventing experience.
                                </p>
                                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                                    Approve the suggestions you want and ResumeVibe applies them directly to your resume. No rewriting or copy-and-paste.
                                </p>

                                <div className="mt-7 grid max-w-xl gap-3 sm:flex">
                                    <button
                                        type="button"
                                        onClick={useSample}
                                        className="rv-ai-home-glow group inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)] px-4 py-3 text-left text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:brightness-105 motion-reduce:animate-none"
                                    >
                                        <Sparkles size={16} />
                                        <span className="flex-1">
                                            <span className="block">See a sample report</span>
                                            <span className="mt-0.5 block text-[10px] font-normal text-white/75">Try it with a ready-made resume</span>
                                        </span>
                                        <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openSuggestionPreview('landing')}
                                        className="rv-ai-home-glow group inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--accent)]/35 bg-[var(--bg-card)] px-4 py-3 text-left text-xs font-semibold transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] motion-reduce:animate-none"
                                    >
                                        <FileCheck2 size={16} className="shrink-0 text-[var(--accent)]" />
                                        <span className="flex-1">
                                            <span className="block">Preview automatic updates</span>
                                            <span className="mt-0.5 block text-[10px] font-normal text-[var(--text-muted)]">See how edits stay in your control</span>
                                        </span>
                                        <ArrowRight size={15} className="text-[var(--accent)] transition group-hover:translate-x-0.5" />
                                    </button>
                                </div>

                                <div className="mt-8 hidden space-y-3 sm:block">
                                    {[
                                        [Gauge, 'Apply, stretch, or skip guidance'],
                                        [ShieldCheck, 'Every conclusion linked to resume evidence'],
                                        [UserRoundCheck, 'Approved edits are applied automatically'],
                                    ].map(([Icon, label]) => (
                                        <div key={String(label)} className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]"><Icon size={15} /></span>
                                            <span>{String(label)}</span>
                                        </div>
                                    ))}
                                </div>

                            </div>

                            <section className="rv-panel overflow-hidden shadow-[0_30px_90px_-48px_rgba(0,0,0,0.55)]" aria-labelledby="job-fit-form-title">
                                <div className="border-b border-[var(--border-color)] p-5 sm:p-7">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                    <p className="rv-kicker">Free evidence comparison</p>
                                            <h2 id="job-fit-form-title" className="mt-2 font-serif-ed text-3xl sm:text-4xl">Bring the two things that matter.</h2>
                                        </div>
                                        <span className="hidden rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-green-700 dark:text-green-400 sm:inline-flex">No card required</span>
                                    </div>
                                </div>

                                <div className="p-5 sm:p-7">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--text-main)] text-[11px] font-semibold text-[var(--bg-main)]">1</span>
                                        <div>
                                            <h3 className="text-sm font-semibold">Your resume</h3>
                                            <p className="text-[10px] text-[var(--text-muted)]">PDF or pasted text</p>
                                        </div>
                                        {selectedResumeReady && <CheckCircle2 size={17} className="ml-auto text-green-500" />}
                                    </div>

                                    <div className="rv-segmented mt-4">
                                        <button type="button" data-active={resumeSource === 'pdf'} onClick={() => selectSource('pdf')}><Upload size={14} /> Upload PDF</button>
                                        <button type="button" data-active={resumeSource === 'text'} onClick={() => selectSource('text')}><FileText size={14} /> Paste text</button>
                                        {hasSavedResume && <button type="button" data-active={resumeSource === 'saved'} onClick={() => selectSource('saved')}><BadgeCheck size={14} /> Saved</button>}
                                    </div>

                                    {resumeSource === 'pdf' && (
                                        <div
                                            className={`rv-dropzone mt-4 flex min-h-48 cursor-pointer flex-col items-center justify-center p-6 text-center transition ${isDragging ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' : ''}`}
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(event) => {
                                                event.preventDefault();
                                                setIsDragging(false);
                                                acceptFile(event.dataTransfer.files?.[0]);
                                            }}
                                        >
                                            <input ref={fileInputRef} className="hidden" type="file" accept="application/pdf,.pdf" onChange={(event) => acceptFile(event.target.files?.[0])} />
                                            {resumeFile ? (
                                                <>
                                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-600"><FileCheck2 size={22} /></span>
                                                    <p className="mt-4 max-w-full truncate text-sm font-semibold">{resumeFile.name}</p>
                                                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB · Click to replace</p>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="rv-icon-tile h-12 w-12"><Upload size={20} /></span>
                                                    <p className="mt-4 text-sm font-semibold">Drop your resume here</p>
                                                    <p className="mt-1 text-xs text-[var(--text-muted)]">or click to choose a PDF · maximum 5 MB</p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {resumeSource === 'text' && (
                                        <div className="relative mt-4">
                                            <textarea
                                                value={resumeText}
                                                onChange={(event) => {
                                                    setResumeText(event.target.value);
                                                    if (event.target.value.length === 1) trackCampaignEvent('resume_input_started', { source: 'text' });
                                                }}
                                                className="rv-field min-h-52 w-full resize-y px-4 py-4 text-sm leading-6"
                                                placeholder="Paste the full text of your resume…"
                                            />
                                            <span className="absolute bottom-3 right-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 text-[9px] text-[var(--text-muted)]">{resumeText.length.toLocaleString()} chars</span>
                                        </div>
                                    )}

                                    {resumeSource === 'saved' && hasSavedResume && (
                                        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-500/15 text-green-600"><BadgeCheck size={20} /></span>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold">{savedResume.personalInfo.fullName || 'Saved resume'}</p>
                                                <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">{savedResume.personalInfo.title || 'Ready to compare'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {resumeSource === 'sample' && (
                                        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-subtle)] p-4">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--accent)]"><Sparkles size={17} /></span>
                                                <div className="min-w-0"><p className="truncate text-sm font-semibold">Sample · Staff Software Engineer</p><p className="mt-1 text-[10px] text-[var(--text-muted)]">Nothing will be saved to your account</p></div>
                                            </div>
                                            <button type="button" onClick={() => selectSource('pdf')} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card)]" aria-label="Remove sample"><X size={15} /></button>
                                        </div>
                                    )}

                                    <div className="my-7 h-px bg-[var(--border-color)]" />

                                    <div className="flex items-center gap-3">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--text-main)] text-[11px] font-semibold text-[var(--bg-main)]">2</span>
                                        <div>
                                            <h3 className="text-sm font-semibold">The job you want</h3>
                                            <p className="text-[10px] text-[var(--text-muted)]">Paste responsibilities and qualifications</p>
                                        </div>
                                        {jobDescription.trim().length >= 350 && <CheckCircle2 size={17} className="ml-auto text-green-500" />}
                                    </div>

                                    <div className="relative mt-4">
                                        <textarea
                                            id="job-description"
                                            value={jobDescription}
                                            onChange={(event) => {
                                                setJobDescription(event.target.value);
                                                if (event.target.value.length === 1) trackCampaignEvent('job_description_started');
                                            }}
                                            className="rv-field min-h-64 w-full resize-y px-4 py-4 text-sm leading-6"
                                            placeholder="Paste the job description, especially the responsibilities and requirements…"
                                        />
                                        <span className="absolute bottom-3 right-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 text-[9px] text-[var(--text-muted)]">{jobDescription.trim().length.toLocaleString()} chars</span>
                                    </div>

                                    {error && (
                                        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-500">
                                            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
                                        </div>
                                    )}

                                    <button type="button" onClick={handleAnalyze} disabled={isProcessing} className="rv-button-primary mt-6 w-full justify-center py-3.5 text-sm">
                                        {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Reading and comparing…</> : <><Target size={16} /> Check my fit <ArrowRight size={16} /></>}
                                    </button>

                                    <div className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-[var(--text-muted)]">
                                        <LockKeyhole size={12} className="mt-1 shrink-0 text-[var(--accent)]" />
                                        <p>{resumeSource === 'pdf' || resumeSource === 'text'
                                            ? !freeJobFitAvailable
                                                ? 'Your free fit check is complete. Future new resume imports use 50 VibeTokens; the evidence comparison stays free.'
                                                : 'Your first resume import and evidence comparison are free. No VibeTokens are required.'
                                            : 'The evidence comparison runs in this browser. This is guidance, not a prediction of an interview.'}</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </section>

                    <TrustSection onPreview={() => openSuggestionPreview('landing')} />
                </main>
            )}

            <Footer />
            {!report && <FeedbackWidget stage="job_fit_landing" />}
            <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
            <Toaster position="bottom-center" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' } }} />
        </div>
    );
}

function CampaignHeader({ userName, isAuthenticated }: { userName?: string; isAuthenticated: boolean }) {
    return (
        <header className="sticky top-0 z-[60] border-b border-[var(--border-color)] bg-[var(--glass-bg-strong)] backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <a href="/" className="flex items-center gap-2.5" aria-label="ResumeVibe home">
                    <Logo className="h-8 w-8" />
                    <span className="font-serif-ed text-xl tracking-tight">ResumeVibe</span>
                </a>
                <div className="flex items-center gap-2">
                    <span className="hidden items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-green-700 dark:text-green-400 sm:inline-flex"><ShieldCheck size={11} /> Evidence, not guesses</span>
                    {isAuthenticated ? (
                        <a href="/profile" className="rv-button-quiet px-3">Hi, {userName || 'there'}</a>
                    ) : (
                        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('show-login-modal'))} className="rv-button-quiet px-3"><LogIn size={14} /> Sign in</button>
                    )}
                    <ThemeToggle compact />
                </div>
            </div>
        </header>
    );
}

function ResultView({
    report,
    resumeName,
    isSample,
    onBack,
    onContinue,
    onPreview,
}: {
    report: EvidenceReport;
    resumeName: string;
    isSample: boolean;
    onBack: () => void;
    onContinue: () => void;
    onPreview: () => void;
}) {
    const decision = decisionContent[report.decision];
    const visibleRequirements = useMemo(() => (
        [...report.requirements].sort((a, b) => {
            const order: Record<FitStatus, number> = { gap: 0, partial: 1, matched: 2 };
            return order[a.status] - order[b.status];
        }).slice(0, 6)
    ), [report.requirements]);

    return (
        <main className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_60%_0%,var(--accent-glow),transparent_44%)] opacity-80" />
            <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                <button type="button" onClick={onBack} className="mb-7 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] hover:text-[var(--text-main)]"><ArrowLeft size={13} /> {isSample ? 'Check my own resume' : 'Change inputs'}</button>

                {isSample && (
                    <div className="mb-6 flex items-center gap-2 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-subtle)] px-4 py-3 text-xs text-[var(--accent)]">
                        <Sparkles size={14} /> This is a sample report. Its content is not connected to your resume.
                    </div>
                )}

                <header className="grid gap-7 border-b border-[var(--border-color)] pb-9 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <p className="rv-kicker">Evidence map · {resumeName}</p>
                        <h1 className="mt-4 max-w-4xl font-serif-ed text-5xl leading-[0.95] sm:text-6xl">{decision.title}</h1>
                        <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{decision.description}</p>
                    </div>
                    <div className={`min-w-56 rounded-3xl border p-6 ${decision.className}`}>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] opacity-70">Recommendation</p>
                        <p className="mt-2 font-serif-ed text-4xl leading-none">{decision.label}</p>
                        <div className="mt-5 flex items-end gap-2"><span className="text-3xl font-semibold tabular-nums">{report.coverage}%</span><span className="pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">evidence coverage</span></div>
                    </div>
                </header>

                <section className="mt-8 grid gap-4 sm:grid-cols-3">
                    {[
                        { label: 'Supported', value: report.matchedCount, Icon: CheckCircle2, className: 'text-green-600 bg-green-500/10' },
                        { label: 'Partial', value: report.partialCount, Icon: TriangleAlert, className: 'text-amber-600 bg-amber-500/10' },
                        { label: 'Real gaps', value: report.gapCount, Icon: XCircle, className: 'text-red-500 bg-red-500/10' },
                    ].map(({ label, value, Icon, className }) => (
                        <div key={label} className="rv-panel flex items-center gap-4 p-5">
                            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${className}`}><Icon size={20} /></span>
                            <div><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p></div>
                        </div>
                    ))}
                </section>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
                    <section className="rv-panel overflow-hidden">
                        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] p-5 sm:p-6">
                            <div><p className="rv-kicker">What the job asks for</p><h2 className="mt-2 font-serif-ed text-3xl">Requirement evidence</h2></div>
                            <span className="text-[10px] text-[var(--text-muted)]">Showing {visibleRequirements.length} of {report.requirements.length}</span>
                        </div>
                        <div className="divide-y divide-[var(--border-color)]">
                            {visibleRequirements.map((item) => {
                                const status = statusContent[item.status];
                                const StatusIcon = status.icon;
                                return (
                                    <article key={item.id} className="p-5 sm:p-6">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <h3 className="max-w-2xl text-sm font-semibold leading-6">{item.requirement}</h3>
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${status.className}`}><StatusIcon size={11} /> {status.label}</span>
                                        </div>
                                        <div className="mt-4 rounded-2xl bg-[var(--bg-input)] p-4">
                                            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{item.evidenceSource || 'Current resume'}</p>
                                            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{item.evidence}</p>
                                        </div>
                                        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--text-muted)]"><ChevronRight size={13} className="mt-1 shrink-0 text-[var(--accent)]" /> {item.recommendation}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <aside className="space-y-5 lg:sticky lg:top-24">
                        <div className="rounded-3xl bg-[var(--text-main)] p-6 text-[var(--bg-main)] shadow-xl">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-main)]/10"><Zap size={19} /></span>
                            <p className="mt-6 text-[9px] font-semibold uppercase tracking-[0.16em] opacity-60">Next step</p>
                            <h2 className="mt-2 font-serif-ed text-3xl leading-tight">Turn this evidence into an automatically tailored resume.</h2>
                            <div className="mt-5 space-y-2 text-xs opacity-75">
                                {['Review before-and-after suggestions', 'Approve or reject each change', 'Apply approved edits automatically', 'Save a restorable resume version'].map((item) => <p key={item} className="flex items-center gap-2"><Check size={13} /> {item}</p>)}
                            </div>
                            <button type="button" onClick={onPreview} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--bg-main)]/20 px-4 py-3 text-xs font-semibold transition hover:bg-[var(--bg-main)]/10">
                                <FileCheck2 size={14} /> Preview the suggestion dialog
                            </button>
                            <button type="button" onClick={onContinue} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--bg-main)] px-4 py-3 text-xs font-semibold text-[var(--text-main)] transition hover:-translate-y-0.5">
                                {isSample ? 'Check my own resume' : 'Review suggestions & update'} <ArrowRight size={14} />
                            </button>
                            <p className="mt-3 text-center text-[9px] opacity-55">Approved suggestions are applied for you—no manual copy-and-paste.</p>
                        </div>

                        <FeedbackWidget compact stage="job_fit_report" prompt="Was this evidence map useful?" />
                    </aside>
                </div>

                <p className="mt-8 text-center text-[10px] leading-5 text-[var(--text-muted)]">This comparison explains resume evidence. It does not predict or guarantee an interview.</p>
            </div>
        </main>
    );
}

function SuggestionPreviewDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="suggestion-preview-title">
                <header className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] p-5 sm:p-7">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white"><Sparkles size={19} /></span>
                        <div>
                            <p className="rv-kicker">Suggestion preview</p>
                            <h2 id="suggestion-preview-title" className="mt-1 font-serif-ed text-3xl sm:text-4xl">Review once. We update the resume.</h2>
                            <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--text-muted)]">This example shows the approval dialog. Your real suggestions are generated from your resume and target job.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="shrink-0 rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]" aria-label="Close suggestion preview"><X size={18} /></button>
                </header>

                <div className="overflow-y-auto p-5 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] p-4">
                        <div>
                            <p className="text-sm font-semibold">Professional summary</p>
                            <p className="mt-1 text-[10px] text-[var(--text-muted)]">Suggested for: Kubernetes and AWS experience</p>
                        </div>
                        <span className="rounded-full bg-green-500/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-green-600">Low risk</span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] p-4 sm:p-5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Current resume</p>
                            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Backend engineer with experience building APIs and cloud systems.</p>
                        </div>
                        <div className="rounded-2xl border border-green-500/25 bg-green-500/5 p-4 sm:p-5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-green-600">Proposed update</p>
                            <p className="mt-3 text-sm leading-6">Backend engineer building cloud API systems, highlighting verified Kubernetes and AWS experience relevant to this role.</p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {[
                            ['What changed', 'Relevant, verified experience is moved forward.'],
                            ['Why it helps', 'Recruiters can find the strongest match faster.'],
                            ['Safety check', 'No new skill, metric, or claim is invented.'],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-xl bg-[var(--bg-input)] p-3">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
                                <p className="mt-1.5 text-xs leading-5">{value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                            <div><p className="text-sm font-semibold">You stay in control</p><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Accept one suggestion or approve all. ResumeVibe applies accepted edits and saves a version you can restore—no manual copy-and-paste.</p></div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-semibold text-red-500"><XCircle size={13} /> Reject</span>
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-[10px] font-semibold text-white"><CheckCircle2 size={13} /> Accept</span>
                        </div>
                    </div>
                </div>

                <footer className="flex flex-col gap-3 border-t border-[var(--border-color)] bg-[var(--bg-input)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <p className="text-[10px] leading-5 text-[var(--text-muted)]">Illustrative preview. Real suggestions use only evidence already present in your resume.</p>
                    <button type="button" onClick={onClose} className="rv-button-primary shrink-0 px-5 py-2.5 text-xs">Got it—check my resume <ArrowRight size={14} /></button>
                </footer>
            </section>
        </div>
    );
}

function TrustSection({ onPreview }: { onPreview: () => void }) {
    const items = [
        { icon: ShieldCheck, title: 'No invented experience', text: 'Real gaps remain visible. ResumeVibe never turns a missing skill into a false claim.' },
        { icon: ThumbsUp, title: 'Approve once, then it is done', text: 'Review each proposal; accepted edits are applied automatically and saved as a new version.' },
        { icon: BriefcaseBusiness, title: 'Built around one real job', text: 'Compare against the role in front of you instead of receiving generic resume advice.' },
    ];

    return (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-2xl">
                <p className="rv-kicker">Clarity before commitment</p>
                <h2 className="mt-3 font-serif-ed text-4xl sm:text-5xl">Useful enough to earn your trust.</h2>
                <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">A fit report should show its reasoning. You should never have to guess why a tool reached a conclusion.</p>
            </div>
            <div className="mt-9 grid gap-px overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--border-color)] md:grid-cols-3">
                {items.map((item) => (
                    <article key={item.title} className="bg-[var(--bg-card)] p-6 sm:p-7">
                        <span className="rv-icon-tile"><item.icon size={18} /></span>
                        <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
                        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{item.text}</p>
                    </article>
                ))}
            </div>

            <div className="mt-12 grid gap-8 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                    <p className="rv-kicker">Before you upload</p>
                    <h2 className="mt-3 font-serif-ed text-3xl">Straight answers.</h2>
                    <button type="button" onClick={onPreview} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)]"><FileCheck2 size={14} /> Preview the suggestion dialog <ArrowRight size={14} /></button>
                </div>
                <div className="divide-y divide-[var(--border-color)]">
                    {[
                        ['Will ResumeVibe update my resume automatically?', 'Yes—after you approve the suggestions. Accepted edits are applied directly and saved as a new version, so no manual copy-and-paste is needed.'],
                        ['Does a high fit result guarantee an interview?', 'No. The report explains evidence alignment; hiring decisions involve many factors outside the resume.'],
                        ['Can I see how it works before uploading?', 'Yes. Use the sample report from the top of this page. It does not use your account or tokens.'],
                    ].map(([question, answer]) => (
                        <details key={question} className="group py-4 first:pt-0 last:pb-0">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">{question}<span className="text-[var(--accent)] transition group-open:rotate-45">+</span></summary>
                            <p className="mt-3 max-w-2xl text-xs leading-5 text-[var(--text-muted)]">{answer}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
