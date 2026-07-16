import {
    AlertTriangle,
    ArrowRight,
    Briefcase,
    CheckCircle2,
    FileSearch,
    Info,
    ShieldCheck,
    Sparkles,
    Target,
    X,
} from 'lucide-react';
import type { ResumeSchema } from '../../types/resume';

interface CareerGuidanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ResumeSchema;
    insights: Array<{ type: 'good' | 'warning' | 'info'; text: string }>;
    auditResult?: any;
    onFixAll?: () => void;
}

const evidenceChecks = [
    'Use job terminology only where your resume already provides supporting evidence.',
    'Keep metrics exactly as documented; a clear outcome can still be strong without a number.',
    'Prefer specific action, context, and impact over keyword repetition.',
];

export function CareerGuidanceModal({ isOpen, onClose, data, insights, auditResult, onFixAll }: CareerGuidanceModalProps) {
    if (!isOpen) return null;

    const localFindings = insights.filter((insight) => insight.type !== 'good');
    const localStrengths = insights.filter((insight) => insight.type === 'good');
    const auditFindings = auditResult?.insights?.filter((insight: any) => insight.type === 'gap') || [];
    const auditStrengths = auditResult?.insights?.filter((insight: any) => insight.type === 'strength') || [];
    const findingCount = localFindings.length + auditFindings.length;
    const strengthCount = localStrengths.length + auditStrengths.length;
    const skillCount = data.skills.reduce((total, group) => total + group.items.length, 0);

    return (
        <div className="rv-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4" role="presentation">
            <section className="rv-modal flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="career-guidance-title">
                <header className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-5 py-5 sm:px-7 sm:py-6">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="rv-icon-tile"><Target size={18} /></span>
                        <div>
                            <p className="rv-kicker">Recruiter review</p>
                            <h2 id="career-guidance-title" className="mt-1 font-serif-ed text-3xl text-[var(--text-main)]">Career guidance</h2>
                            <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">Prioritized observations from your resume structure and latest audit. Verify every recommendation against your experience before applying it.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]" aria-label="Close career guidance">
                        <X size={18} />
                    </button>
                </header>

                <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1fr_300px] lg:overflow-hidden">
                    <div className="min-h-0 p-5 sm:p-7 lg:overflow-y-auto">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-main)]">Priority findings</p>
                                <p className="mt-1 text-xs text-[var(--text-muted)]">Start with factual gaps and structural issues that affect clarity.</p>
                            </div>
                            <span className="rounded-full bg-[var(--bg-input)] px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)]">{findingCount} to review</span>
                        </div>

                        <div className="space-y-3">
                            {auditFindings.map((finding: any, index: number) => (
                                <article key={`audit-${index}`} className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
                                    <div className="flex items-start gap-3">
                                        <Sparkles size={17} className="mt-0.5 shrink-0 text-amber-600" />
                                        <div>
                                            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-600">Audit observation</p>
                                            <p className="mt-1.5 text-sm leading-6 text-[var(--text-main)]">{finding.text}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}

                            {localFindings.map((finding, index) => (
                                <article key={`local-${index}`} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                                    <div className="flex items-start gap-3">
                                        {finding.type === 'warning'
                                            ? <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-500" />
                                            : <Info size={17} className="mt-0.5 shrink-0 text-[var(--accent)]" />}
                                        <div>
                                            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{finding.type === 'warning' ? 'Needs attention' : 'Recommendation'}</p>
                                            <p className="mt-1.5 text-sm leading-6 text-[var(--text-main)]">{finding.text}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}

                            {findingCount === 0 && (
                                <div className="rounded-2xl border border-green-500/25 bg-green-500/5 px-5 py-8 text-center">
                                    <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600"><CheckCircle2 size={20} /></span>
                                    <p className="mt-4 text-sm font-semibold text-[var(--text-main)]">No priority issues detected</p>
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">You should still tailor the application for each role and verify its factual accuracy.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="border-t border-[var(--border-color)] bg-[var(--bg-input)]/55 p-5 sm:p-7 lg:overflow-y-auto lg:border-l lg:border-t-0">
                        <div>
                            <p className="rv-kicker">Resume snapshot</p>
                            <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-1">
                                <Snapshot label="Strengths" value={strengthCount} />
                                <Snapshot label="Experience roles" value={data.experience.length} />
                                <Snapshot label="Listed skills" value={skillCount} />
                            </div>
                        </div>

                        {auditResult?.narrativeAnalysis && (
                            <div className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                                <div className="flex items-center gap-2 text-[var(--accent)]"><FileSearch size={14} /><p className="text-[9px] font-semibold uppercase tracking-[0.14em]">Audit summary</p></div>
                                <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{auditResult.narrativeAnalysis}</p>
                            </div>
                        )}

                        <div className="mt-6">
                            <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-[var(--accent)]" /><p className="text-xs font-semibold text-[var(--text-main)]">Evidence-first checklist</p></div>
                            <div className="mt-3 space-y-2.5">
                                {evidenceChecks.map((check) => (
                                    <div key={check} className="flex items-start gap-2.5 text-[11px] leading-5 text-[var(--text-muted)]">
                                        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-green-600" />
                                        <span>{check}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>

                <footer className="flex flex-col-reverse gap-2 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <button type="button" onClick={onClose} className="rv-button-quiet">Close</button>
                    {onFixAll && (
                        <button
                            type="button"
                            onClick={() => {
                                onFixAll();
                                onClose();
                            }}
                            className="rv-button-primary"
                        >
                            <Briefcase size={14} /> Tailor for a job <ArrowRight size={14} />
                        </button>
                    )}
                </footer>
            </section>
        </div>
    );
}

function Snapshot({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
            <p className="font-serif-ed text-2xl text-[var(--text-main)]">{value}</p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
        </div>
    );
}
