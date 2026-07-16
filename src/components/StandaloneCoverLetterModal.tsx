import { useEffect, useState, type ReactNode } from 'react';
import { Check, Clipboard, FileText, Loader2, Mail, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useResume } from '../hooks/useResume';

interface StandaloneCoverLetterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StandaloneCoverLetterModal({ isOpen, onClose }: StandaloneCoverLetterModalProps) {
    const { data: resume } = useResume();
    const [jobDescription, setJobDescription] = useState(resume.targetJD || '');
    const [coverLetter, setCoverLetter] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !coverLetter) setJobDescription(resume.targetJD || '');
    }, [isOpen, coverLetter, resume.targetJD]);

    if (!isOpen) return null;

    const generateCoverLetter = async () => {
        const trimmedJobDescription = jobDescription.trim();
        if (trimmedJobDescription.length < 100) {
            setError('Paste a complete job description so the letter can be grounded in the role.');
            return;
        }

        setError(null);
        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-cover-letter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resume, jobDescription: trimmedJobDescription }),
            });
            const data = await response.json();
            if (!response.ok || !data.success || !data.coverLetter) {
                throw new Error(data.error || 'Could not generate the cover letter.');
            }
            setCoverLetter(data.coverLetter);
        } catch (generationError) {
            setError(generationError instanceof Error ? generationError.message : 'Cover letter generation failed.');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyCoverLetter = async () => {
        try {
            await navigator.clipboard.writeText(coverLetter);
            toast.success('Cover letter copied.');
        } catch {
            toast.error('Could not copy the cover letter.');
        }
    };

    const startOver = () => {
        setCoverLetter('');
        setError(null);
    };

    return (
        <div className="rv-modal-backdrop fixed inset-0 z-[105] flex items-center justify-center p-2 sm:p-4">
            <section className="rv-modal flex max-h-[94vh] w-[96vw] max-w-6xl flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="cover-letter-title">
                <header className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-5 py-5 sm:px-7 sm:py-6">
                    <div className="flex items-start gap-3">
                        <span className="rv-icon-tile"><Mail size={18} /></span>
                        <div>
                            <p className="rv-kicker">Standalone document</p>
                            <h2 id="cover-letter-title" className="mt-1 font-serif-ed text-3xl text-[var(--text-main)]">Generate a cover letter</h2>
                            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Uses your current resume and this job description as context. Your resume will not be changed.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} disabled={isGenerating} className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)] disabled:opacity-40" aria-label="Close cover letter generator"><X size={18} /></button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                    {!coverLetter ? (
                        <>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <ContextCard icon={<FileText size={15} />} label="Resume context" value={`${resume.experience.length} roles · ${resume.skills.reduce((total, group) => total + group.items.length, 0)} listed skills`} />
                                <ContextCard icon={<ShieldCheck size={15} />} label="Factual boundary" value="Only evidence already present in your resume may be used" />
                            </div>
                            <label htmlFor="standalone-cover-letter-jd" className="mb-2 mt-6 block text-[11px] font-semibold text-[var(--text-main)]">Target job description</label>
                            <textarea
                                id="standalone-cover-letter-jd"
                                value={jobDescription}
                                onChange={(event) => setJobDescription(event.target.value)}
                                placeholder="Paste the complete role description here…"
                                className="rv-field min-h-64 w-full resize-y px-4 py-4 text-sm leading-6"
                            />
                            <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                                <span>Include the role responsibilities and requirements.</span>
                                <span>{jobDescription.trim().length} characters</span>
                            </div>
                            {error && <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500"><ShieldCheck size={14} className="mt-0.5 shrink-0" />{error}</div>}
                            <button type="button" onClick={generateCoverLetter} disabled={isGenerating} className="rv-button-primary mt-6 w-full py-3">
                                {isGenerating ? <><Loader2 size={15} className="animate-spin" /> Writing from verified resume evidence…</> : <><Mail size={15} /> Generate cover letter</>}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text-main)]">Your cover letter draft</p>
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">Edit the text directly, then copy it into your application.</p>
                                </div>
                                <span className="rounded-full bg-green-500/10 px-3 py-1.5 text-[10px] font-semibold text-green-600"><Check size={12} className="mr-1 inline" /> Resume-grounded draft</span>
                            </div>
                            <textarea
                                value={coverLetter}
                                onChange={(event) => setCoverLetter(event.target.value)}
                                className="rv-field min-h-[420px] w-full resize-y px-5 py-5 text-sm leading-7"
                                aria-label="Generated cover letter"
                            />
                        </>
                    )}
                </div>

                {coverLetter && (
                    <footer className="flex flex-col gap-2 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                        <button type="button" onClick={startOver} className="rv-button-quiet"><RotateCcw size={14} /> Start over</button>
                        <button type="button" onClick={copyCoverLetter} className="rv-button-primary"><Clipboard size={14} /> Copy cover letter</button>
                    </footer>
                )}
            </section>
        </div>
    );
}

function ContextCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] p-4">
            <div className="flex items-center gap-2 text-[var(--accent)]">{icon}<p className="text-[9px] font-semibold uppercase tracking-[0.14em]">{label}</p></div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-main)]">{value}</p>
        </div>
    );
}
