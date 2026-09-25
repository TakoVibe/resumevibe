import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    ArrowUpDown,
    Check,
    CheckCircle2,
    FileText,
    Layers,
    Lightbulb,
    Loader2,
    Mail,
    ShieldAlert,
    Sparkles,
    Target,
    X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useToken } from '../context/TokenContext';
import { useResume } from '../hooks/useResume';
import type { ResumeMetadata } from '../context/ResumeContext';
import type { ResumeSchema } from '../types/resume';
import {
    SECTION_LABELS,
    TAILORABLE_SECTIONS,
    applyProposals,
    type ChangeReview,
    type MissingSkill,
    type Proposal,
    type RequirementReview,
    type SectionFeedback,
    type TailorableSection,
} from '../lib/resumeTailoring';

type ReviewView = 'input' | 'generating' | 'review';
type ReviewTab = 'resume' | 'feedback' | 'coverLetter';
type ChargeStatus = 'not-charged' | 'unknown';

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
/** Bumped whenever the package shape changes so stale entries are ignored. */
const APPLICATION_CACHE_VERSION = 4;

const APPLICATION_GENERATION_STAGES = [
    {
        label: 'Match evidence',
        description: 'Compare the job requirements with verified resume content.',
    },
    {
        label: 'Rewrite every section',
        description: 'Tighten each written section against standard screening criteria.',
    },
    {
        label: 'Check facts',
        description: 'Hold every number, employer and date to what your resume already says.',
    },
    {
        label: 'Split into suggestions',
        description: 'Break the rewrite into individual changes you can pick from.',
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
    coverLetter: string;
    proposals: Proposal[];
    changeReviews: ChangeReview[];
    issues: string[];
    requirements: RequirementReview[];
    missingSkills: MissingSkill[];
    sectionFeedback: SectionFeedback[];
}

interface EntryGroup {
    key: string;
    heading: string;
    proposals: Proposal[];
}

interface SectionGroup {
    section: TailorableSection;
    entries: EntryGroup[];
    proposalIds: string[];
}

/** Groups proposals by section, then by the entry they belong to, in resume order. */
function groupProposals(proposals: Proposal[]): SectionGroup[] {
    return TAILORABLE_SECTIONS.flatMap((section) => {
        const inSection = proposals.filter((proposal) => proposal.section === section);
        if (inSection.length === 0) return [];

        const entries: EntryGroup[] = [];
        inSection.forEach((proposal) => {
            const key = proposal.entryId ?? '_';
            const existing = entries.find((entry) => entry.key === key);
            if (existing) existing.proposals.push(proposal);
            else entries.push({ key, heading: proposal.entryHeading, proposals: [proposal] });
        });

        return [{ section, entries, proposalIds: inSection.map((proposal) => proposal.id) }];
    });
}

/**
 * Everything starts selected - the user asked for a tailored resume - except
 * changes in a section the model itself flagged high risk. Those start off so
 * an overstatement is never applied by inertia.
 */
function defaultSelection(proposals: Proposal[], changeReviews: ChangeReview[]): Set<string> {
    const highRiskSections = new Set(
        changeReviews.filter((review) => review.riskLevel === 'high').map((review) => review.section),
    );
    return new Set(
        proposals
            .filter((proposal) => !highRiskSections.has(proposal.section))
            .map((proposal) => proposal.id),
    );
}

function applicationCacheId(resume: ResumeSchema, jobDescription: string) {
    // Every written section is now tailored, so the whole document is the key.
    const input = JSON.stringify({
        resume: TAILORABLE_SECTIONS.map((section) => resume[section] ?? null),
        certifications: resume.certifications,
        title: resume.personalInfo?.title,
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
        const match = Array.isArray(entries)
            ? entries.find((entry) => entry?.id === id && entry?.version === APPLICATION_CACHE_VERSION)
            : null;
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
            { id, version: APPLICATION_CACHE_VERSION, result, createdAt: Date.now() },
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
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [coverLetter, setCoverLetter] = useState('');
    const [saveCoverLetter, setSaveCoverLetter] = useState(true);
    const [changeReviews, setChangeReviews] = useState<ChangeReview[]>([]);
    const [issues, setIssues] = useState<string[]>([]);
    const [requirements, setRequirements] = useState<RequirementReview[]>([]);
    const [missingSkills, setMissingSkills] = useState<MissingSkill[]>([]);
    const [sectionFeedback, setSectionFeedback] = useState<SectionFeedback[]>([]);
    const [activeTab, setActiveTab] = useState<ReviewTab>('resume');
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
        }, 3200);
        return () => window.clearInterval(interval);
    }, [view]);

    const sectionGroups = useMemo(() => groupProposals(proposals), [proposals]);
    const highRiskSections = useMemo(
        () => new Set(changeReviews.filter((review) => review.riskLevel === 'high').map((review) => review.section)),
        [changeReviews],
    );
    const selectedCount = selected.size;
    const requirementGapCount = requirements.filter((requirement) => requirement.status === 'gap').length;
    const riskFlagCount = changeReviews.filter((review) => review.riskLevel === 'high').length
        + Math.max(issues.length, requirementGapCount);
    const feedbackCount = missingSkills.length + sectionFeedback.filter((entry) => entry.verdict !== 'strong').length;

    if (!isOpen) return null;

    const resetAndClose = () => {
        setView('input');
        setProposals([]);
        setSelected(new Set());
        setCoverLetter('');
        setSaveCoverLetter(true);
        setChangeReviews([]);
        setIssues([]);
        setRequirements([]);
        setMissingSkills([]);
        setSectionFeedback([]);
        setActiveTab('resume');
        setError(null);
        setFailureChargeStatus(null);
        setIsApplying(false);
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
                if (!response.ok || !data?.success || !Array.isArray(data?.proposals) || !data?.coverLetter) {
                    const fallbackMessage = response.status >= 500
                        ? 'The application service could not finish this review. Please try again.'
                        : 'Could not create the application package.';
                    throw new ApplicationGenerationError(
                        typeof data?.error === 'string' ? data.error : fallbackMessage,
                        data?.tokens_charged === false ? 'not-charged' : 'unknown',
                    );
                }

                const result: TailoredApplicationResult = {
                    coverLetter: data.coverLetter,
                    proposals: data.proposals,
                    changeReviews: Array.isArray(data.changeReviews) ? data.changeReviews : [],
                    issues: Array.isArray(data.issues) ? data.issues : [],
                    requirements: Array.isArray(data.requirements) ? data.requirements : [],
                    missingSkills: Array.isArray(data.missingSkills) ? data.missingSkills : [],
                    sectionFeedback: Array.isArray(data.sectionFeedback) ? data.sectionFeedback : [],
                };
                cacheApplication(cacheId, result);
                await fetchTokenData();
                return result;
            })();

            setProposals(applicationData.proposals);
            setSelected(defaultSelection(applicationData.proposals, applicationData.changeReviews));
            setChangeReviews(applicationData.changeReviews);
            setIssues(applicationData.issues);
            setRequirements(applicationData.requirements || []);
            setMissingSkills(applicationData.missingSkills || []);
            setSectionFeedback(applicationData.sectionFeedback || []);
            setCoverLetter(applicationData.coverLetter);
            setSaveCoverLetter(true);
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
     * The full-resume rewrite, the requirement scoring, the coaching feedback and
     * the cover letter intentionally share one request. Besides removing model
     * round trips, it keeps every artifact grounded in the same evidence snapshot
     * so the letter cannot drift from the resume proposal beside it.
     */

    const toggleOne = (id: string) => {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const setMany = (ids: string[], on: boolean) => {
        setSelected((current) => {
            const next = new Set(current);
            ids.forEach((id) => { if (on) next.add(id); else next.delete(id); });
            return next;
        });
    };

    const allSelectedIn = (ids: string[]) => ids.length > 0 && ids.every((id) => selected.has(id));

    const applySelected = async () => {
        const approvedResume: ResumeSchema = {
            ...applyProposals(resume, proposals, selected),
            targetJD: jobDescription.trim(),
        };

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

            if (saveCoverLetter) {
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
            coverLetter: saveCoverLetter ? coverLetter : '',
            acceptedCount: selectedCount + (saveCoverLetter ? 1 : 0),
            acceptedResumeChangeCount: selectedCount,
            jobDescription: jobDescription.trim(),
        });
        toast.success(selectedCount > 0
            ? `Applied ${selectedCount} suggestion${selectedCount === 1 ? '' : 's'} to your resume.`
            : 'Application kit saved. No resume changes were applied.');
        setIsApplying(false);
        resetAndClose();
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
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Pick the changes you want, line by line. Nothing is applied until you say so.</p>
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
                                    <p className="text-sm font-semibold text-[var(--text-main)]">One job description, your whole resume reviewed</p>
                                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">In a single pass the agent rewrites every section you have written—summary, skills, experience, projects, achievements, education and more—drafts a cover letter, and explains each proposal. You then approve or skip each suggestion individually. Your facts stay yours: employers, dates and numbers are never changed, and a skill you have not evidenced is reported to you rather than added.</p>
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

                {view === 'review' && (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-input)] px-5 py-3 sm:px-7">
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                                <span className="rounded-full bg-[var(--bg-card)] px-3 py-1.5 text-[var(--text-main)]">{selectedCount} of {proposals.length} suggestions selected</span>
                                {riskFlagCount > 0 && <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-amber-600">{riskFlagCount} risk flag{riskFlagCount === 1 ? '' : 's'}</span>}
                                {missingSkills.length > 0 && <span className="rounded-full bg-sky-500/10 px-3 py-1.5 text-sky-600">{missingSkills.length} skill gap{missingSkills.length === 1 ? '' : 's'} reported</span>}
                            </div>
                            {proposals.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setMany(proposals.map((proposal) => proposal.id), true)} className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[11px] font-semibold text-[var(--text-main)] hover:border-[var(--accent)]/40"><CheckCircle2 size={14} /> Select all</button>
                                    <button onClick={() => setSelected(new Set())} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]">Clear</button>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border-color)] bg-[var(--bg-card)] px-5 pt-3 sm:px-7" role="tablist" aria-label="Application package review">
                            <TabButton icon={<FileText size={15} />} label="Resume changes" badge={String(proposals.length)} active={activeTab === 'resume'} onClick={() => setActiveTab('resume')} />
                            <TabButton icon={<Lightbulb size={15} />} label="Feedback" badge={String(feedbackCount)} active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} />
                            <TabButton icon={<Mail size={15} />} label="Cover letter" badge={saveCoverLetter ? 'on' : 'off'} active={activeTab === 'coverLetter'} onClick={() => setActiveTab('coverLetter')} />
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

                            {activeTab === 'resume' && proposals.length === 0 && (
                                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-center">
                                    <p className="text-sm font-semibold text-[var(--text-main)]">No resume rewrite was needed</p>
                                    <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">Your sections already read well against this job description. Check the Feedback tab for what a recruiter will still notice, and review the cover letter.</p>
                                </div>
                            )}

                            {activeTab === 'resume' && sectionGroups.map((group) => {
                                const review = changeReviews.find((item) => item.section === group.section);
                                const isHighRisk = highRiskSections.has(group.section);
                                const allOn = allSelectedIn(group.proposalIds);
                                const selectedHere = group.proposalIds.filter((id) => selected.has(id)).length;

                                return (
                                    <section key={group.section} className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3 sm:px-5">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <Layers size={15} className="shrink-0 text-[var(--accent)]" />
                                                <h3 className="text-sm font-semibold text-[var(--text-main)]">{SECTION_LABELS[group.section]}</h3>
                                                <span className="rounded-full bg-[var(--bg-input)] px-2 py-0.5 text-[9px] font-semibold text-[var(--text-muted)]">{selectedHere}/{group.proposalIds.length}</span>
                                                {isHighRisk && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-red-500">off by default · high risk</span>}
                                            </div>
                                            <button
                                                onClick={() => setMany(group.proposalIds, !allOn)}
                                                className="shrink-0 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--text-main)] hover:border-[var(--accent)]/40"
                                            >
                                                {allOn ? 'Deselect section' : 'Select section'}
                                            </button>
                                        </div>

                                        {review && (
                                            <div className="border-b border-[var(--border-color)] bg-[var(--bg-main)]/40 p-4 sm:p-5">
                                                <div className="grid gap-3 md:grid-cols-3">
                                                    <Evidence label="What changed" value={review.whatChanged} />
                                                    <Evidence label="Why it helps" value={review.why} />
                                                    <Evidence label="Job requirement" value={review.jobRequirement} />
                                                </div>
                                                <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs ${review.riskLevel === 'high' ? 'border-red-500/25 bg-red-500/10 text-red-600' : review.riskLevel === 'low' ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-400'}`}>
                                                    <ShieldAlert size={14} className="mt-0.5 shrink-0" /><span><strong className="capitalize">{review.riskLevel} risk:</strong> {review.risk}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="divide-y divide-[var(--border-color)]">
                                            {group.entries.map((entry) => {
                                                const entryIds = entry.proposals.map((proposal) => proposal.id);
                                                const entryAllOn = allSelectedIn(entryIds);
                                                return (
                                                    <div key={entry.key} className="p-4 sm:p-5">
                                                        {entry.heading && (
                                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                                <p className="text-[11px] font-semibold text-[var(--text-main)]">{entry.heading}</p>
                                                                {entryIds.length > 1 && (
                                                                    <button
                                                                        onClick={() => setMany(entryIds, !entryAllOn)}
                                                                        className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
                                                                    >
                                                                        {entryAllOn ? 'Deselect all here' : 'Select all here'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="space-y-2.5">
                                                            {entry.proposals.map((proposal) => (
                                                                <ProposalRow
                                                                    key={proposal.id}
                                                                    proposal={proposal}
                                                                    checked={selected.has(proposal.id)}
                                                                    onToggle={() => toggleOne(proposal.id)}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}

                            {activeTab === 'feedback' && (
                                <>
                                    <section className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 sm:p-5">
                                        <div className="flex items-start gap-3">
                                            <Lightbulb className="mt-0.5 shrink-0 text-sky-600" size={18} />
                                            <div>
                                                <p className="text-sm font-semibold text-[var(--text-main)]">Skills this job wants that your resume does not evidence</p>
                                                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                                                    These were <strong>not</strong> added to your resume and there is nothing to approve here. Claiming a skill you cannot discuss in an interview costs more than the keyword gains, so the call is yours.
                                                </p>
                                            </div>
                                        </div>
                                        {missingSkills.length === 0 ? (
                                            <p className="mt-4 rounded-xl bg-[var(--bg-input)] p-3 text-xs text-[var(--text-muted)]">Nothing missing—your resume already evidences the skills this job names.</p>
                                        ) : (
                                            <ul className="mt-4 space-y-2">
                                                {missingSkills.map((item) => (
                                                    <li key={item.skill} className="rounded-xl bg-[var(--bg-card)] p-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-xs font-semibold text-[var(--text-main)]">{item.skill}</span>
                                                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${item.priority === 'must-have' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-600'}`}>{item.priority}</span>
                                                        </div>
                                                        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]"><span className="font-semibold">Job asks:</span> {item.jobEvidence}</p>
                                                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-main)]"><span className="font-semibold">Your options:</span> {item.advice}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </section>

                                    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:p-5">
                                        <p className="text-sm font-semibold text-[var(--text-main)]">Section-by-section review</p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">Every section scored against standard resume screening criteria, including the ones left unchanged.</p>
                                        {sectionFeedback.length === 0 ? (
                                            <p className="mt-4 rounded-xl bg-[var(--bg-input)] p-3 text-xs text-[var(--text-muted)]">No section notes came back for this run.</p>
                                        ) : (
                                            <div className="mt-4 space-y-2">
                                                {sectionFeedback.map((entry) => (
                                                    <div key={entry.section} className="rounded-xl bg-[var(--bg-input)] p-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`h-2 w-2 shrink-0 rounded-full ${entry.verdict === 'strong' ? 'bg-green-500' : entry.verdict === 'needs-work' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                            <span className="text-xs font-semibold text-[var(--text-main)]">{SECTION_LABELS[entry.section] || entry.section}</span>
                                                            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{entry.verdict.replace('-', ' ')}</span>
                                                        </div>
                                                        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">{entry.observation}</p>
                                                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-main)]"><span className="font-semibold">Next:</span> {entry.action}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                </>
                            )}

                            {activeTab === 'coverLetter' && (
                                <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                                    <label className="flex cursor-pointer items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3 sm:px-5">
                                        <div className="flex items-center gap-2">
                                            <Mail size={15} className="text-[var(--accent)]" />
                                            <h3 className="text-sm font-semibold text-[var(--text-main)]">Cover letter</h3>
                                        </div>
                                        <span className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-main)]">
                                            Save with this application
                                            <input type="checkbox" checked={saveCoverLetter} onChange={() => setSaveCoverLetter((current) => !current)} className="h-4 w-4 accent-[var(--accent)]" />
                                        </span>
                                    </label>
                                    <div className="p-4 sm:p-5">
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <Evidence label="What was created" value="A concise letter drafted from the same evidence used for your resume suggestions." />
                                            <Evidence label="Why it helps" value="Connects your strongest verified evidence directly to this employer's needs." />
                                            <Evidence label="Review before saving" value="Confirm the role, company context, achievements, and tone all feel accurate." />
                                        </div>
                                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400"><ShieldAlert size={14} className="mt-0.5 shrink-0" />If you skip some resume suggestions, confirm the letter still matches the resume you are applying with.</div>
                                        <div className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-5 text-sm leading-7 text-[var(--text-main)]">{coverLetter}</div>
                                    </div>
                                </section>
                            )}
                        </div>

                        <footer className="flex flex-col gap-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                            <div>
                                <p className="text-xs font-semibold text-[var(--text-main)]">{selectedCount} of {proposals.length} suggestions selected{saveCoverLetter ? ' · cover letter on' : ''}</p>
                                <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Only the suggestions you tick are written to your resume, and it is saved as a new version. Everything you skip is discarded; feedback notes change nothing.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setView('input')} className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]">Start over</button>
                                <button onClick={() => void applySelected()} disabled={isApplying} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                                    {isApplying ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                    {isApplying ? 'Saving resume…' : selectedCount > 0 ? `Apply ${selectedCount} selected` : 'Save without resume changes'}
                                </button>
                            </div>
                        </footer>
                    </>
                )}
            </div>
        </div>
    );
}

function TabButton({ icon, label, badge, active, onClick }: {
    icon: React.ReactNode;
    label: string;
    badge: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-xs font-semibold transition ${active ? 'border-[var(--accent)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
        >
            {icon} {label}
            <span className="rounded-full bg-[var(--bg-input)] px-2 py-0.5 text-[9px]">{badge}</span>
        </button>
    );
}

/** One independently selectable change, rendered by kind. */
function ProposalRow({ proposal, checked, onToggle }: {
    proposal: Proposal;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <div className={`rounded-xl border transition ${checked ? 'border-green-500/40 bg-green-500/[0.04]' : 'border-[var(--border-color)] bg-[var(--bg-input)]/40'}`}>
            <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onToggle}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                    aria-label={`Apply: ${proposal.label}`}
                />
                {proposal.kind === 'order' || proposal.kind === 'techStack'
                    ? <ArrowUpDown size={13} className="shrink-0 text-[var(--text-muted)]" />
                    : null}
                <span className="text-[11px] font-semibold text-[var(--text-main)]">{proposal.label}</span>
                <span className="ml-auto text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {checked ? 'will apply' : 'skipped'}
                </span>
            </label>
            <div className="px-3 pb-3">
                {proposal.kind === 'text' || proposal.kind === 'bullet' ? (
                    <div className="grid gap-2 lg:grid-cols-2">
                        <PreviewBlock label="Before" tone="muted"><Line html={proposal.before} /></PreviewBlock>
                        <PreviewBlock label="Proposed" tone="positive"><Line html={proposal.after} /></PreviewBlock>
                    </div>
                ) : proposal.kind === 'order' ? (
                    <div className="grid gap-2 lg:grid-cols-2">
                        <PreviewBlock label="Current order" tone="muted">
                            {proposal.beforeLines.map((line, index) => <Line key={index} html={line} prefix={`${index + 1}. `} />)}
                        </PreviewBlock>
                        <PreviewBlock label="Proposed order" tone="positive">
                            {proposal.afterLines.map((line, index) => <Line key={index} html={line} prefix={`${index + 1}. `} />)}
                        </PreviewBlock>
                    </div>
                ) : proposal.kind === 'techStack' ? (
                    <div className="grid gap-2 lg:grid-cols-2">
                        <PreviewBlock label="Before" tone="muted"><p>{proposal.beforeItems.join(' · ')}</p></PreviewBlock>
                        <PreviewBlock label="Proposed" tone="positive"><p>{proposal.afterItems.join(' · ')}</p></PreviewBlock>
                    </div>
                ) : (
                    <div className="grid gap-2 lg:grid-cols-2">
                        <PreviewBlock label="Before" tone="muted">
                            {proposal.beforeSkills.map((group) => <p key={group.id}><strong>{group.name}:</strong> {group.items.join(', ')}</p>)}
                        </PreviewBlock>
                        <PreviewBlock label="Proposed" tone="positive">
                            {proposal.afterSkills.map((group) => <p key={group.id}><strong>{group.name}:</strong> {group.items.join(', ')}</p>)}
                        </PreviewBlock>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Resume content carries inline emphasis (<strong>, <em>) on both sides of the
 * diff, so both are rendered as markup - showing raw tags in the Before column
 * would misrepresent what the user already has.
 */
function Line({ html, prefix }: { html: string; prefix?: string }) {
    return (
        <p>
            {prefix ? <span className="text-[var(--text-muted)]">{prefix}</span> : null}
            <span dangerouslySetInnerHTML={{ __html: html }} />
        </p>
    );
}

function Evidence({ label, value }: { label: string; value: string }) {
    return <div className="rounded-xl bg-[var(--bg-input)] p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p><p className="mt-1.5 text-xs leading-relaxed text-[var(--text-main)]">{value}</p></div>;
}

function PreviewBlock({ label, tone, children }: { label: string; tone: 'muted' | 'positive'; children: React.ReactNode }) {
    return <div className={`rounded-xl border p-3 text-xs leading-relaxed ${tone === 'positive' ? 'border-green-500/20 bg-green-500/5 text-[var(--text-main)]' : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)]'}`}><p className={`mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] ${tone === 'positive' ? 'text-green-600' : 'text-[var(--text-muted)]'}`}>{label}</p><div className="space-y-2">{children}</div></div>;
}
