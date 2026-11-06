import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, X, AlertCircle, History, Target, Timer } from 'lucide-react';
import { useResume } from '../hooks/useResume';
import ResumeDiffViewer from './ResumeDiffViewer';
import VersionHistory, { type ResumeVersion } from './VersionHistory';
import type { ResumeSchema } from '../types/resume';

interface OptimizeResumeModalProps {
    isOpen: boolean;
    onClose: () => void;
    autoOptimize?: boolean;
    auditResult?: any;
}

type ModalView = 'input' | 'diff' | 'history';

const VERSIONS_STORAGE_KEY = 'resume-versions-v1';
const OPTIMIZATION_CACHE_KEY = 'resume-optimization-cache-v1';

const getCacheKeyHash = (resume: any, jd: string, audit: any) => {
    const str = JSON.stringify({ resume, jd, audit });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
};

export default function OptimizeResumeModal({ isOpen, onClose, autoOptimize, auditResult }: OptimizeResumeModalProps) {
    const { data: resume, updateResume } = useResume();
    const [view, setView] = useState<ModalView>('input');
    const [jobDescription, setJobDescription] = useState(resume.targetJD || '');

    // Sync JD if it changes elsewhere (e.g. sidebar)
    useEffect(() => {
        if (resume.targetJD !== jobDescription) {
            setJobDescription(resume.targetJD || '');
        }
    }, [resume.targetJD]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOptimizing) {
            setElapsedTime(0);
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isOptimizing]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const [error, setError] = useState<string | null>(null);
    const [optimizationIssues, setOptimizationIssues] = useState<string[]>([]);
    const [odds, setOdds] = useState<{ selectionChance: number, rejectionReasoning: string } | null>(null);
    const [optimizedResume, setOptimizedResume] = useState<ResumeSchema | null>(null);
    const [originalResume, setOriginalResume] = useState<ResumeSchema | null>(null);
    const [versions, setVersions] = useState<ResumeVersion[]>(() => {
        try {
            const stored = localStorage.getItem(VERSIONS_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const saveVersions = (newVersions: ResumeVersion[]) => {
        setVersions(newVersions);
        localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(newVersions));
    };

    // Auto-Optimize trigger
    useEffect(() => {
        if (isOpen && autoOptimize && jobDescription && view === 'input' && !isOptimizing && !optimizedResume) {
            handleOptimize();
        }
    }, [isOpen, autoOptimize, jobDescription]);

    const handleOptimize = async () => {
        if (!jobDescription.trim()) {
            setError('Please paste a job description');
            return;
        }

        setIsOptimizing(true);
        setError(null);
        setOriginalResume(resume);

        const cacheKeyHash = getCacheKeyHash(resume, jobDescription.trim(), auditResult);
        const cachedDataStr = localStorage.getItem(OPTIMIZATION_CACHE_KEY);
        let cache: Record<string, any> = {};
        if (cachedDataStr) {
            try {
                cache = JSON.parse(cachedDataStr);
            } catch { }
        }

        if (cache[cacheKeyHash]) {
            const cachedData = cache[cacheKeyHash];
            setTimeout(() => {
                setOptimizedResume(cachedData.optimizedResume);
                setOptimizationIssues(cachedData.issues || []);
                setOdds(cachedData.odds || null);
                setView('diff');
                setIsOptimizing(false);
            }, 800); // Small artificial delay to show it's "loading" from cache 
            return;
        }

        try {
            const response = await fetch('/api/optimize-resume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', Authorization: `Token ${localStorage.getItem('auth_token') || ''}` },
                body: JSON.stringify({
                    resume,
                    jobDescription: jobDescription.trim(),
                    auditResult
                }),
            });

            let data;
            const textResponse = await response.text();
            try {
                data = JSON.parse(textResponse);
            } catch (e) {
                throw new Error('Our AI service returned an unexpected format. Please try again in a moment.');
            }

            if (!response.ok) {
                throw new Error(data?.error || data?.details || 'Failed to optimize resume');
            }

            if (data.success && data.optimizedResume) {
                // Update cache
                cache[cacheKeyHash] = {
                    optimizedResume: data.optimizedResume,
                    issues: data.issues || [],
                    odds: data.odds || null
                };

                // Keep only last 10 optimized queries to prevent localStorage bloat
                const keys = Object.keys(cache);
                if (keys.length > 10) {
                    delete cache[keys[0]]; // FIFO
                }
                localStorage.setItem(OPTIMIZATION_CACHE_KEY, JSON.stringify(cache));

                setOptimizedResume(data.optimizedResume);
                setOptimizationIssues(data.issues || []);
                setOdds(data.odds || null);
                setView('diff');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleAcceptChanges = () => {
        if (!optimizedResume) return;

        // Save current version to history before applying changes
        const newVersion: ResumeVersion = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            label: `Optimized for: ${jobDescription.substring(0, 50)}...`,
            data: optimizedResume,
            jobDescription: jobDescription.trim(),
        };

        const updatedVersions = [newVersion, ...versions].slice(0, 20); // Keep last 20 versions
        saveVersions(updatedVersions);

        // Apply changes
        updateResume(optimizedResume);

        // Reset and close
        handleClose();
    };

    const handleRejectChanges = () => {
        setView('input');
        setOptimizedResume(null);
        setOriginalResume(null);
        setOptimizationIssues([]);
        setOdds(null);
    };

    const handleRestoreVersion = (version: ResumeVersion) => {
        updateResume(version.data);
        handleClose();
    };

    const handleDeleteVersion = (versionId: string) => {
        const updatedVersions = versions.filter(v => v.id !== versionId);
        saveVersions(updatedVersions);
    };

    const handlePreviewVersion = (version: ResumeVersion) => {
        // Could implement a preview modal here
        console.log('Preview version:', version);
    };

    const handleClose = () => {
        setView('input');
        setError(null);
        setOptimizedResume(null);
        setOriginalResume(null);
        setOptimizationIssues([]);
        setOdds(null);
        onClose();
    };

    if (!isOpen) return null;

    // Render version history view
    if (view === 'history') {
        return (
            <VersionHistory
                versions={versions}
                currentVersion={resume}
                onRestore={handleRestoreVersion}
                onDelete={handleDeleteVersion}
                onPreview={handlePreviewVersion}
                onClose={() => setView('input')}
            />
        );
    }

    // Render diff view
    if (view === 'diff' && optimizedResume && originalResume) {
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[var(--text-main)]/10 backdrop-blur-sm transition-all duration-300 font-sans-ed">
                <div className="relative w-full max-w-5xl bg-[var(--bg-card)] rounded-sm shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-[var(--border-color)]">
                    <ResumeDiffViewer
                        original={originalResume}
                        optimized={optimizedResume}
                        issues={optimizationIssues}
                        odds={odds || undefined}
                        onAccept={handleAcceptChanges}
                        onReject={handleRejectChanges}
                        onSelectiveApply={handleAcceptChanges}
                    />
                </div>
            </div>
        );
    }

    // Render input view (default)
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[var(--text-main)]/10 backdrop-blur-sm transition-all duration-300 font-sans-ed">
            <div className="relative w-full max-w-2xl bg-[var(--bg-card)] rounded-sm shadow-2xl overflow-hidden border border-[var(--border-color)] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-[var(--bg-card)] border-b border-[var(--border-color)] px-8 py-6 relative z-10">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="font-serif-ed text-4xl text-[var(--text-main)] tracking-tight">{auditResult ? 'Deep Contextual Rescue' : 'Expert Resume Optimizer'}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setView('history')}
                                className="p-2 border border-transparent hover:border-[var(--text-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                title="Version History"
                            >
                                <History className="w-5 h-5 font-light" />
                            </button>
                            <button
                                onClick={handleClose}
                                className="p-2 border border-transparent hover:border-[var(--text-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                disabled={isOptimizing}
                            >
                                <X className="w-5 h-5 font-light" />
                            </button>
                        </div>
                    </div>
                    <p className="mt-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
                        {auditResult ? 'Fixing identified gaps for max ATS impact' : 'Maximize your ATS score with AI'}
                    </p>
                </div>

                {/* Content */}
                <div className="p-8 space-y-5 bg-[var(--bg-main)]/5">
                    {/* Job Description Input */}
                    <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 px-1">
                            Target Job Description
                        </label>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => {
                                setJobDescription(e.target.value);
                                updateResume({ ...resume, targetJD: e.target.value });
                            }}
                            placeholder="Paste the full job description here..."
                            className="w-full h-64 px-4 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-none focus:ring-1 focus:ring-[var(--text-main)] focus:border-[var(--text-main)] outline-none transition-all resize-none font-sans text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50 leading-relaxed"
                            disabled={isOptimizing}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-red-500">Optimization Error</p>
                                <p className="text-xs text-red-400 font-medium mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Contextual Context or Info Box */}
                    {auditResult ? (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 group transition-all animate-in slide-in-from-bottom-2">
                            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Target size={14} /> Fixing {auditResult.insights?.filter((i: any) => i.type === 'gap').length || 'Critical'} Deep Audit Gaps
                            </h3>
                            <ul className="space-y-2 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500/20">
                                {auditResult.insights?.filter((i: any) => i.type === 'gap').map((gap: any, idx: number) => (
                                    <li key={idx} className="text-[11px] text-[var(--text-muted)] font-medium flex items-start gap-2">
                                        <AlertCircle size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                        <span className="leading-tight opacity-90" dangerouslySetInnerHTML={{ __html: gap.text }} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        !error && !isOptimizing && (
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-5 group transition-all">
                                <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Sparkles size={14} /> Optimization Process
                                </h3>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                    <li className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-2">
                                        <span className="w-1 h-1 bg-blue-500 rounded-full" />
                                        Smart analysis of core requirements
                                    </li>
                                    <li className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-2">
                                        <span className="w-1 h-1 bg-blue-500 rounded-full" />
                                        Rewrites for maximum impact
                                    </li>
                                    <li className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-2">
                                        <span className="w-1 h-1 bg-blue-500 rounded-full" />
                                        Side-by-side comparison
                                    </li>
                                    <li className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-2">
                                        <span className="w-1 h-1 bg-blue-500 rounded-full" />
                                        Version history saved
                                    </li>
                                </ul>
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex items-center justify-between">
                    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">
                        Powered by Expert Analysis • {versions.length} versions archived
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={handleClose}
                            className="px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-transparent hover:border-[var(--text-main)] transition-all"
                            disabled={isOptimizing}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleOptimize}
                            disabled={isOptimizing || !jobDescription.trim()}
                            className="px-8 py-3 text-[10px] uppercase tracking-[0.2em] bg-[var(--text-main)] text-[var(--bg-main)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] border border-transparent hover:border-[var(--text-main)] transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isOptimizing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="font-mono tabular-nums bg-transparent px-1.5 py-0.5 text-[10px] border border-[var(--bg-main)]/20 mr-1 flex items-center gap-1">
                                        <Timer size={10} />
                                        {formatTime(elapsedTime)}
                                    </span>
                                    Analysing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 font-light" />
                                    {auditResult ? 'Fix Audit Gaps & Optimize' : 'Optimize'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
