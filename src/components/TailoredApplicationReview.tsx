import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Check,
    CheckCircle2,
    FileText,
    Loader2,
    Mail,
    ShieldAlert,
    Sparkles,
    Target,
    X,
    XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useToken } from '../context/TokenContext';
import { useResume } from '../hooks/useResume';
import type { ResumeMetadata } from '../context/ResumeContext';
import type { ResumeSchema } from '../types/resume';

type ReviewView = 'input' | 'generating' | 'review';
type ReviewTab = 'resume' | 'coverLetter';
type ReviewSection = 'summary' | 'skills' | 'experience' | 'coverLetter';
type Decision = 'pending' | 'accept' | 'reject';
type ChargeStatus = 'not-charged' | 'unknown';

interface ChangeReview {
    section: Exclude<ReviewSection, 'coverLetter'>;
    whatChanged: string;
    why: string;
    jobRequirement: string;
    riskLevel: 'none' | 'low' | 'high';
    risk: string;
}

interface RequirementReview {
    requirement: string;
    status: 'matched' | 'partial' | 'gap';
    evidence: string;
}

interface TailoredApplicationReviewProps {
    isOpen: boolean;
    onClose: () => void;
    initialJobDescription?: string;
    onApplied?: (applicationPackage: AppliedApplicationPackage) => void;
}

export interface AppliedApplicationPackage {
    approvedResume: ResumeSchema;
    savedResume: ResumeMetadata;
    coverLetter: string;
    acceptedCount: number;
    acceptedResumeChangeCount: number;
    jobDescription: string;
}

const VERSION_STORAGE_KEY = 'resume-versions-v1';
const COVER_LETTER_STORAGE_KEY = 'tailored-cover-letters-v1';
const APPLICATION_CACHE_KEY = 'tailored-application-cache-v1';

const APPLICATION_GENERATION_STAGES = [
    {
        label: 'Match evidence',
        description: 'Compare the job requirements with verified resume content.',
    },
    {
        label: 'Draft changes',
        description: 'Prepare coordinated resume and cover-letter proposals.',
    },
    {
        label: 'Check risks',
        description: 'Flag gaps and remove claims that are not supported.',
    },
    {
        label: 'Prepare review',
        description: 'Organize every proposed change for your approval.',
    },
] as const;

class ApplicationGenerationError extends Error {
    chargeStatus: ChargeStatus;

    constructor(message: string, chargeStatus: ChargeStatus) {
        super(message);
        this.name = 'ApplicationGenerationError';
        this.chargeStatus = chargeStatus;
    }
}

interface TailoredApplicationResult {
    optimizedResume: ResumeSchema;
    coverLetter: string;
    changeReviews: ChangeReview[];
    issues: string[];
    requirements: RequirementReview[];
}

const sectionLabels: Record<ReviewSection, string> = {
    summary: 'Professional summary',
    skills: 'Skills',
    experience: 'Experience',
    coverLetter: 'Cover letter',
};

function hasSectionChanged(original: ResumeSchema, optimized: ResumeSchema, section: Exclude<ReviewSection, 'coverLetter'>) {
    return JSON.stringify(original[section]) !== JSON.stringify(optimized[section]);
}

function fallbackReview(section: Exclude<ReviewSection, 'coverLetter'>): ChangeReview {
    return {
        section,
        whatChanged: `${sectionLabels[section]} was reordered and rewritten for the target role.`,
        why: 'Makes the most relevant evidence easier for a recruiter and ATS to find.',
        jobRequirement: 'Core responsibilities and keywords in the job description',
        riskLevel: 'low',
        risk: 'Confirm that every emphasized skill and outcome reflects your actual experience.',
    };
}

function applicationCacheId(resume: ResumeSchema, jobDescription: string) {
    const input = JSON.stringify({
        summary: resume.summary,
        skills: resume.skills,
        experience: resume.experience,
        personalInfo: resume.personalInfo,
        jobDescription,
    });
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function getCachedApplication(id: string): TailoredApplicationResult | null {
    try {
        const entries = JSON.parse(sessionStorage.getItem(APPLICATION_CACHE_KEY) || '[]');
        const match = Array.isArray(entries) ? entries.find((entry) => entry?.id === id && entry?.version === 2) : null;
        return match?.result || null;
    } catch {
        return null;
    }
}

function cacheApplication(id: string, result: TailoredApplicationResult) {
    try {
        const stored = JSON.parse(sessionStorage.getItem(APPLICATION_CACHE_KEY) || '[]');
        const entries = Array.isArray(stored) ? stored.filter((entry) => entry?.id !== id) : [];
        sessionStorage.setItem(APPLICATION_CACHE_KEY, JSON.stringify([
            { id, version: 2, result, createdAt: Date.now() },
            ...entries,
        ].slice(0, 3)));
    } catch (storageError) {
        console.warn('Could not cache the application package:', storageError);
    }
}

export function TailoredApplicationReview({ isOpen, onClose, initialJobDescription, onApplied }: TailoredApplicationReviewProps) {
    const { data: resume, updateResume, saveToBackend } = useResume();
    const { isAuthenticated } = useAuth();
    const { fetchTokenData, setShowUpgradeModal } = useToken();
    const [view, setView] = useState<ReviewView>('input');
    const [jobDescription, setJobDescription] = useState(resume.targetJD || '');
    const [optimizedResume, setOptimizedResume] = useState<ResumeSchema | null>(null);
    const [coverLetter, setCoverLetter] = useState('');
    const [changeReviews, setChangeReviews] = useState<ChangeReview[]>([]);
    const [issues, setIssues] = useState<string[]>([]);
    const [requirements, setRequirements] = useState<RequirementReview[]>([]);
    const [activeTab, setActiveTab] = useState<ReviewTab>('resume');
    const [decisions, setDecisions] = useState<Record<ReviewSection, Decision>>({
        summary: 'pending',
        skills: 'pending',
        experience: 'pending',
        coverLetter: 'pending',
    });
    const [generationStage, setGenerationStage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [failureChargeStatus, setFailureChargeStatus] = useState<ChargeStatus | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        if (isOpen && view === 'input') setJobDescription(initialJobDescription || resume.targetJD || '');
    }, [initialJobDescription, isOpen, resume.targetJD, view]);

    useEffect(() => {
        if (view !== 'generating') return;
        let currentStage = 0;
        setGenerationStage(currentStage);
        const interval = window.setInterval(() => {
            currentStage = Math.min(currentStage + 1, APPLICATION_GENERATION_STAGES.length - 1);
            setGenerationStage(currentStage);
        }, 2800);
        return () => window.clearInterval(interval);
    }, [view]);

    const changedSections = useMemo(() => {
        if (!optimizedResume) return [] as Array<Exclude<ReviewSection, 'coverLetter'>>;
        return (['summary', 'skills', 'experience'] as const).filter((section) =>
            hasSectionChanged(resume, optimizedResume, section)
        );
    }, [optimizedResume, resume]);

    const reviewSections = useMemo<ReviewSection[]>(
        () => [...changedSections, 'coverLetter'],
        [changedSections]
    );

    const decidedCount = reviewSections.filter((section) => decisions[section] !== 'pending').length;
    const acceptedCount = reviewSections.filter((section) => decisions[section] === 'accept').length;
    const requirementGapCount = requirements.filter((requirement) => requirement.status === 'gap').length;
    const highRiskCount = changeReviews.filter((review) => review.riskLevel === 'high').length + Math.max(issues.length, requirementGapCount);

    if (!isOpen) return null;

    const resetAndClose = () => {
        setView('input');
        setOptimizedResume(null);
        setCoverLetter('');
        setChangeReviews([]);
        setIssues([]);
        setRequirements([]);
        setActiveTab('resume');
        setError(null);
        setFailureChargeStatus(null);
        setIsApplying(false);
        setDecisions({ summary: 'pending', skills: 'pending', experience: 'pending', coverLetter: 'pending' });
        onClose();
    };

    const generateApplication = async () => {
        if (jobDescription.trim().length < 100) {
            setError('Paste a complete job description so the agent has enough evidence to tailor against.');
            setFailureChargeStatus('not-charged');
            return;
        }

        if (!isAuthenticated) {
            window.dispatchEvent(new CustomEvent('show-login-modal'));
            setError('Sign in to create and save an application package.');
            setFailureChargeStatus('not-charged');
            return;
        }

        setError(null);
        setFailureChargeStatus(null);
        setView('generating');

        try {
            const trimmedJobDescription = jobDescription.trim();
            const cacheId = applicationCacheId(resume, trimmedJobDescription);
            const cachedResult = getCachedApplication(cacheId);
            const applicationData = cachedResult || await (async () => {
                const authToken = localStorage.getItem('auth_token');
                let response: Response;
                try {
                    response = await fetch('/api/tailor-application', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
                            'X-Request-ID': `application-package-${cacheId}`,
                        },
                        body: JSON.stringify({ resume, jobDescription: trimmedJobDescription }),
                    });
                } catch {
                    throw new ApplicationGenerationError(
                        'We could not reach the application service. Check your connection and try again.',
                        'unknown',
                    );
                }

                const data = await response.json().catch(() => null);
                if (response.status === 401) {
                    window.dispatchEvent(new CustomEvent('show-login-modal'));
                }
                if (response.status === 402) {
                    setShowUpgradeModal(true);
                }
                if (!response.ok || !data?.success || !data?.optimizedResume || !data?.coverLetter) {
                    const fallbackMessage = response.status >= 500
                        ? 'The application service could not finish this review. Please try again.'
                        : 'Could not create the application package.';
                    throw new ApplicationGenerationError(
                        typeof data?.error === 'string' ? data.error : fallbackMessage,
                        data?.tokens_charged === false ? 'not-charged' : 'unknown',
                    );
                }

                const result: TailoredApplicationResult = {
                    optimizedResume: data.optimizedResume,
                    coverLetter: data.coverLetter,
                    changeReviews: Array.isArray(data.changeReviews) ? data.changeReviews : [],
                    issues: Array.isArray(data.issues) ? data.issues : [],
                    requirements: Array.isArray(data.requirements) ? data.requirements : [],
                };
                cacheApplication(cacheId, result);
                await fetchTokenData();
                return result;
            })();

            const tailoredResume: ResumeSchema = {
                ...applicationData.optimizedResume,
                targetJD: trimmedJobDescription,
            };
            setOptimizedResume(tailoredResume);
            setChangeReviews(applicationData.changeReviews);
            setIssues(applicationData.issues);
            setRequirements(applicationData.requirements || []);
            setCoverLetter(applicationData.coverLetter);
            setDecisions({ summary: 'pending', skills: 'pending', experience: 'pending', coverLetter: 'pending' });
            setActiveTab('resume');
            setView('review');
        } catch (generationError) {
            const knownError = generationError instanceof ApplicationGenerationError ? generationError : null;
            setError(knownError?.message || 'The application package could not be completed. Please try again.');
            setFailureChargeStatus(knownError?.chargeStatus || 'unknown');
            if (!knownError || knownError.chargeStatus === 'unknown') void fetchTokenData();
            setView('input');
        }
    };

    /*
     * Resume optimization and cover-letter generation intentionally share one request.
     * Besides removing a model round trip, this keeps both artifacts grounded in the
     * same evidence snapshot and prevents the letter from drifting from the proposal.
     */

    const setDecision = (section: ReviewSection, decision: Decision) => {
        setDecisions((current) => ({ ...current, [section]: decision }));
    };

    const approveAll = () => {
        setDecisions((current) => {
            const next = { ...current };
            reviewSections.forEach((section) => { next[section] = 'accept'; });
            return next;
        });
    };

    const applyApproved = async () => {
        if (!optimizedResume) return;
        if (decidedCount !== reviewSections.length) {
            toast.error('Review every proposal before applying the package.');
            return;
        }

        const approvedResume: ResumeSchema = { ...resume, targetJD: jobDescription.trim() };
        changedSections.forEach((section) => {
            if (decisions[section] === 'accept') {
                (approvedResume as any)[section] = optimizedResume[section];
            }
        });

        const acceptedResumeChangeCount = changedSections.filter((section) => decisions[section] === 'accept').length;
        setIsApplying(true);
        setError(null);

        const savedResume = await saveToBackend(approvedResume);
        if (!savedResume) {
            setIsApplying(false);
            setError('We could not save the improved resume. Your review is still here—check your connection and try again.');
            toast.error('The improved resume was not saved. Please try again.');
            return;
        }

        const timestamp = Date.now();
        try {
            const versions = JSON.parse(localStorage.getItem(VERSION_STORAGE_KEY) || '[]');
            const newVersion = {
                id: timestamp.toString(),
                timestamp,
                label: `Tailored application · ${new Date(timestamp).toLocaleDateString()}`,
                data: approvedResume,
                jobDescription: jobDescription.trim(),
            };
            localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify([newVersion, ...versions].slice(0, 20)));

            if (decisions.coverLetter === 'accept') {
                const letters = JSON.parse(localStorage.getItem(COVER_LETTER_STORAGE_KEY) || '[]');
                localStorage.setItem(COVER_LETTER_STORAGE_KEY, JSON.stringify([{
                    id: timestamp.toString(),
                    timestamp,
                    jobDescription: jobDescription.trim(),
                    content: coverLetter,
                }, ...letters].slice(0, 20)));
            }
        } catch (storageError) {
            console.warn('Could not save local application history:', storageError);
        }

        updateResume(approvedResume);
        onApplied?.({
            approvedResume,
            savedResume,
            coverLetter: decisions.coverLetter === 'accept' ? coverLetter : '',
            acceptedCount,
            acceptedResumeChangeCount,
            jobDescription: jobDescription.trim(),
        });
        toast.success(acceptedResumeChangeCount > 0
            ? `Saved ${acceptedResumeChangeCount} approved resume update${acceptedResumeChangeCount === 1 ? '' : 's'}.`
            : 'Application kit saved. No resume sections were changed.');
        setIsApplying(false);
        resetAndClose();
    };

    const getReview = (section: Exclude<ReviewSection, 'coverLetter'>) =>
        changeReviews.find((review) => review.section === section) || fallbackReview(section);

    const renderBeforeAfter = (section: Exclude<ReviewSection, 'coverLetter'>) => {
        if (!optimizedResume) return null;

        if (section === 'summary') {
            return (
                <div className="grid gap-3 lg:grid-cols-2">
                    <PreviewBlock label="Before" tone="muted"><p>{resume.summary}</p></PreviewBlock>
                    <PreviewBlock label="Proposed" tone="positive"><p dangerouslySetInnerHTML={{ __html: optimizedResume.summary }} /></PreviewBlock>
                </div>
            );
        }

        if (section === 'skills') {
            return (
                <div className="grid gap-3 lg:grid-cols-2">
                    <PreviewBlock label="Before" tone="muted">
                        {resume.skills.map((group) => <p key={group.id}><strong>{group.name}:</strong> {group.items.join(', ')}</p>)}
                    </PreviewBlock>
                    <PreviewBlock label="Proposed" tone="positive">
                        {optimizedResume.skills.map((group) => <p key={group.id}><strong>{group.name}:</strong> {group.items.join(', ')}</p>)}
                    </PreviewBlock>
                </div>
            );
        }

        const changedRoles = optimizedResume.experience.filter((item, index) =>
            JSON.stringify(item) !== JSON.stringify(resume.experience[index])
        );
        return (
            <PreviewBlock label="Proposed experience edits" tone="positive">
                <p>{changedRoles.length} role{changedRoles.length === 1 ? '' : 's'} rewritten: {changedRoles.map((item) => `${item.role} at ${item.company}`).join(', ') || 'content reordered for relevance'}.</p>
            </PreviewBlock>
        );
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-2 backdrop-blur-sm sm:p-4">
            <div className={`flex max-h-[95vh] w-full flex-col overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl ${view === 'review' ? 'max-w-6xl rounded-2xl' : 'max-w-2xl rounded-3xl'}`} role="dialog" aria-modal="true" aria-labelledby="tailored-application-review-title">
                <header className="flex items-start justify-between border-b border-[var(--border-color)] px-5 py-4 sm:px-7 sm:py-5">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white"><Sparkles size={18} /></span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Agent workflow</p>
                            <h2 id="tailored-application-review-title" className="truncate font-serif-ed text-2xl text-[var(--text-main)] sm:text-3xl">Tailored Application Review</h2>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Approve the suggestions you want; we apply them automatically.</p>
                        </div>
                    </div>
                    <button onClick={resetAndClose} disabled={view === 'generating'} className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-30" aria-label="Close"><X size={18} /></button>
                </header>

                {view === 'input' && (
                    <div className="overflow-y-auto p-5 sm:p-7">
                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] p-4">
                            <div className="flex items-start gap-3">
                                <Target className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} />
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text-main)]">One job description, one complete application package</p>
                                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">The agent will tailor your resume, draft a cover letter, and explain every proposal. After approval, the changes are applied directly—no manual copy-and-paste.</p>
                                </div>
                            </div>
                        </div>
                        <label className="mb-2 mt-6 block text-[11px] font-semibold text-[var(--text-main)]">Target job description</label>
                        <textarea
                            value={jobDescription}
                            onChange={(event) => setJobDescription(event.target.value)}
                            placeholder="Paste the complete role description here…"
                            className="h-64 w-full resize-none rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-4 text-sm leading-relaxed text-[var(--text-main)] outline-none transition focus:border-[var(--accent)]"
                        />
                        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                            <span>Include responsibilities and requirements for better evidence matching.</span>
                            <span>{jobDescription.trim().length} characters</span>
                        </div>
                        {error && (
                            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5" role="alert">
                                <div className="flex items-start gap-2.5">
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
                                    <div>
                                        <p className="text-xs font-semibold text-red-600 dark:text-red-400">Application was not completed</p>
                                        <p className="mt-1 text-xs leading-relaxed text-red-600/90 dark:text-red-400/90">{error}</p>
                                    </div>
                                </div>
                                {failureChargeStatus && (
                                    <div className="mt-3 border-t border-red-500/15 pt-2.5 text-[10px] font-semibold text-[var(--text-muted)]">
                                        {failureChargeStatus === 'not-charged'
                                            ? 'No tokens were charged for this attempt.'
                                            : 'We could not confirm the charge status, so your token balance is being refreshed.'}
                                    </div>
                                )}
                            </div>
                        )}
                        <button onClick={generateApplication} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--text-main)] text-sm font-semibold text-[var(--bg-main)] transition hover:-translate-y-px hover:shadow-lg">
                            Create application package <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px]">30 tokens · after success</span> <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {view === 'generating' && (
                    <div className="flex min-h-[470px] flex-col items-center justify-center p-6 text-center sm:p-8">
                        <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                            <Loader2 size={34} className="animate-spin" />
                            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-[var(--accent)]" />
                        </span>
                        <h3 className="mt-6 font-serif-ed text-3xl text-[var(--text-main)]">Building your application</h3>
                        <p className="mt-2 text-sm font-medium text-[var(--text-main)]" aria-live="polite">
                            {APPLICATION_GENERATION_STAGES[generationStage].label}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {APPLICATION_GENERATION_STAGES[generationStage].description}
                        </p>

                        <div className="mt-7 w-full max-w-md overflow-hidden rounded-full bg-[var(--bg-input)]" aria-hidden="true">
                            <div
                                className="h-1.5 rounded-full bg-[var(--accent)] transition-[width] duration-700 ease-out"
                                style={{ width: `${Math.min(92, (generationStage + 1) * 24)}%` }}
                            />
                        </div>
                        <div className="mt-5 w-full max-w-md space-y-2 text-left">
                            {APPLICATION_GENERATION_STAGES.map((stage, index) => {
                                const isComplete = index < generationStage;
                                const isActive = index === generationStage;
                                return (
                                    <div
                                        key={stage.label}
                                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ${isActive
                                            ? 'border-[var(--accent)]/35 bg-[var(--accent-subtle)] shadow-sm'
                                            : 'border-transparent bg-[var(--bg-input)]/70'}`}
                                    >
                                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${isComplete
                                            ? 'bg-green-500 text-white'
                                            : isActive
                                                ? 'bg-[var(--accent)] text-white'
                                                : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}
                                        >
                                            {isComplete ? <Check size={13} strokeWidth={3} /> : isActive ? <Loader2 size={13} className="animate-spin" /> : index + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <p className={`text-xs font-semibold ${isActive || isComplete ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{stage.label}</p>
                                            {isActive && <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">In progress</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-5 flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                            <CheckCircle2 size={13} className="text-green-500" />
                            30 tokens are charged only after a valid review is ready
                        </div>
                    </div>
                )}

                {view === 'review' && optimizedResume && (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-input)] px-5 py-3 sm:px-7">
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                                <span className="rounded-full bg-[var(--bg-card)] px-3 py-1.5 text-[var(--text-main)]">{reviewSections.length} proposals</span>
                                <span className="rounded-full bg-green-500/10 px-3 py-1.5 text-green-600">{acceptedCount} approved</span>
                                {highRiskCount > 0 && <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-amber-600">{highRiskCount} risk flag{highRiskCount === 1 ? '' : 's'}</span>}
                            </div>
                            <button onClick={approveAll} className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[11px] font-semibold text-[var(--text-main)] hover:border-[var(--accent)]/40"><CheckCircle2 size={14} /> Approve all</button>
                        </div>

                        <div className="flex gap-1 border-b border-[var(--border-color)] bg-[var(--bg-card)] px-5 pt-3 sm:px-7" role="tablist" aria-label="Application package review">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'resume'}
                                onClick={() => setActiveTab('resume')}
                                className={`flex items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-xs font-semibold transition ${activeTab === 'resume' ? 'border-[var(--accent)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                <FileText size={15} /> Resume changes
                                <span className="rounded-full bg-[var(--bg-input)] px-2 py-0.5 text-[9px]">{changedSections.length}</span>
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'coverLetter'}
                                onClick={() => setActiveTab('coverLetter')}
                                className={`flex items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-xs font-semibold transition ${activeTab === 'coverLetter' ? 'border-[var(--accent)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                <Mail size={15} /> Cover letter
                                <span className={`h-2 w-2 rounded-full ${decisions.coverLetter === 'accept' ? 'bg-green-500' : decisions.coverLetter === 'reject' ? 'bg-red-500' : 'bg-amber-500'}`} aria-label={`${decisions.coverLetter} decision`} />
                            </button>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--bg-main)] p-4 sm:p-6">
                            {error && (
                                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}
                                </div>
                            )}
                            {activeTab === 'resume' && requirements.length > 0 && (
                                <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text-main)]">Job requirement coverage</p>
                                            <p className="mt-1 text-xs text-[var(--text-muted)]">Grounded in evidence from your current resume—not the proposed rewrite.</p>
                                        </div>
                                        <div className="flex gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em]">
                                            <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-green-600">{requirements.filter((item) => item.status === 'matched').length} matched</span>
                                            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-600">{requirements.filter((item) => item.status === 'partial').length} partial</span>
                                            <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-500">{requirements.filter((item) => item.status === 'gap').length} gaps</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                                        {requirements.map((item, index) => (
                                            <div key={`${item.requirement}-${index}`} className="rounded-xl bg-[var(--bg-input)] p-3">
                                                <div className="flex items-start gap-2">
                                                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.status === 'matched' ? 'bg-green-500' : item.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                    <div>
                                                        <p className="text-xs font-semibold text-[var(--text-main)]">{item.requirement}</p>
                                                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{item.evidence}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {activeTab === 'resume' && issues.length > 0 && (
                                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                                    <div className="flex items-start gap-3">
                                        <ShieldAlert className="mt-0.5 shrink-0 text-amber-600" size={18} />
                                        <div><p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Evidence gaps need your attention</p><ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">{issues.map((issue, index) => <li key={index}>• {issue}</li>)}</ul></div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'resume' && changedSections.map((section) => {
                                const review = getReview(section);
                                return (
                                    <ReviewCard key={section} title={sectionLabels[section]} decision={decisions[section]} onDecision={(decision) => setDecision(section, decision)}>
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <Evidence label="What changed" value={review.whatChanged} />
                                            <Evidence label="Why it helps" value={review.why} />
                                            <Evidence label="Job requirement" value={review.jobRequirement} />
                                        </div>
                                        <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs ${review.riskLevel === 'high' ? 'border-red-500/25 bg-red-500/10 text-red-600' : review.riskLevel === 'low' ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-400'}`}>
                                            <ShieldAlert size={14} className="mt-0.5 shrink-0" /><span><strong className="capitalize">{review.riskLevel} risk:</strong> {review.risk}</span>
                                        </div>
                                        <div className="mt-4">{renderBeforeAfter(section)}</div>
                                    </ReviewCard>
                                );
                            })}

                            {activeTab === 'coverLetter' && (
                                <ReviewCard title="Cover letter" decision={decisions.coverLetter} onDecision={(decision) => setDecision('coverLetter', decision)}>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <Evidence label="What was created" value="A concise letter drafted from the same evidence used for your resume proposals." />
                                        <Evidence label="Why it helps" value="Connects your strongest verified evidence directly to this employer's needs." />
                                        <Evidence label="Review before approval" value="Confirm the role, company context, achievements, and tone all feel accurate." />
                                    </div>
                                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400"><ShieldAlert size={14} className="mt-0.5 shrink-0" />If you reject any resume proposal, confirm the letter still matches the resume version you approve.</div>
                                    <div className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-sm leading-7 text-[var(--text-main)]">{coverLetter}</div>
                                </ReviewCard>
                            )}
                        </div>

                        <footer className="flex flex-col gap-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                            <div>
                                <p className="text-xs font-semibold text-[var(--text-main)]">{decidedCount} of {reviewSections.length} proposals reviewed</p>
                                <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Approved changes are applied automatically and saved as a new version. Rejected content is discarded.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setView('input')} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]">Start over</button>
                                <button onClick={() => setActiveTab(activeTab === 'resume' ? 'coverLetter' : 'resume')} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-xs font-semibold text-[var(--text-main)] hover:border-[var(--accent)]/40">
                                    {activeTab === 'resume' ? <><Mail size={14} /> Review cover letter</> : <><FileText size={14} /> Review resume</>}
                                </button>
                                <button onClick={() => void applyApproved()} disabled={decidedCount !== reviewSections.length || isApplying} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                                    {isApplying ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                    {isApplying ? 'Saving improved resume…' : 'Apply approved & open resume'}
                                </button>
                            </div>
                        </footer>
                    </>
                )}
            </div>
        </div>
    );
}

function ReviewCard({ title, decision, onDecision, children }: {
    title: string;
    decision: Decision;
    onDecision: (decision: Decision) => void;
    children: React.ReactNode;
}) {
    return (
        <section className={`overflow-hidden rounded-2xl border bg-[var(--bg-card)] transition ${decision === 'accept' ? 'border-green-500/45' : decision === 'reject' ? 'border-red-500/40 opacity-70' : 'border-[var(--border-color)]'}`}>
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2"><FileText size={15} className="text-[var(--accent)]" /><h3 className="text-sm font-semibold text-[var(--text-main)]">{title}</h3></div>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => onDecision('reject')} className={`flex h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] font-semibold ${decision === 'reject' ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}><XCircle size={13} /> Reject</button>
                    <button onClick={() => onDecision('accept')} className={`flex h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] font-semibold ${decision === 'accept' ? 'bg-green-600 text-white' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}`}><CheckCircle2 size={13} /> Accept</button>
                </div>
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </section>
    );
}

function Evidence({ label, value }: { label: string; value: string }) {
    return <div className="rounded-xl bg-[var(--bg-input)] p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p><p className="mt-1.5 text-xs leading-relaxed text-[var(--text-main)]">{value}</p></div>;
}

function PreviewBlock({ label, tone, children }: { label: string; tone: 'muted' | 'positive'; children: React.ReactNode }) {
    return <div className={`rounded-xl border p-3 text-xs leading-relaxed ${tone === 'positive' ? 'border-green-500/20 bg-green-500/5 text-[var(--text-main)]' : 'border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-muted)]'}`}><p className={`mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] ${tone === 'positive' ? 'text-green-600' : 'text-[var(--text-muted)]'}`}>{label}</p><div className="space-y-2">{children}</div></div>;
}
