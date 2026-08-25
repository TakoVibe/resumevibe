import { useMemo, useState } from 'react';
import { Check, MessageCircle, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { api } from '../../lib/api';
import { getCampaignAttribution, getCampaignSessionId, trackCampaignEvent } from '../../lib/campaign';

type FeedbackSentiment = 'positive' | 'negative' | 'neutral';

interface FeedbackWidgetProps {
    stage?: string;
    compact?: boolean;
    prompt?: string;
    className?: string;
}

const NEGATIVE_CATEGORIES = [
    ['missed_experience', 'Missed experience'],
    ['wrong_requirements', 'Misread the job'],
    ['too_generic', 'Too generic'],
    ['confusing', 'Confusing'],
    ['technical_issue', 'Technical issue'],
] as const;

export function FeedbackWidget({
    stage = 'general',
    compact = false,
    prompt = 'Was this useful?',
    className = '',
}: FeedbackWidgetProps) {
    const [isOpen, setIsOpen] = useState(compact);
    const [sentiment, setSentiment] = useState<FeedbackSentiment | null>(null);
    const [category, setCategory] = useState('');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const shouldAskForDetail = sentiment === 'negative' || (!compact && sentiment !== null);
    const attribution = useMemo(() => getCampaignAttribution(), [isOpen]);

    const submit = async (nextSentiment = sentiment, nextCategory = category) => {
        if (!nextSentiment || status === 'sending') return;

        setStatus('sending');
        try {
            const { captured_at: _capturedAt, ...feedbackAttribution } = attribution;
            const response = await api.post('/api/blogs/product-feedback/', {
                product: 'resumevibe',
                session_id: getCampaignSessionId(),
                page_path: `${window.location.pathname}${window.location.search}`.slice(0, 500),
                stage,
                sentiment: nextSentiment,
                category: nextCategory,
                message: message.trim().slice(0, 3000),
                email: email.trim().slice(0, 254),
                website,
                ...feedbackAttribution,
                metadata: {
                    viewport: `${window.innerWidth}x${window.innerHeight}`,
                    referrer_host: document.referrer ? new URL(document.referrer).host : '',
                },
            });
            if (!response.ok) throw new Error('Feedback could not be submitted');

            setStatus('sent');
            trackCampaignEvent('feedback_submitted', { stage, sentiment: nextSentiment, category: nextCategory });
        } catch {
            setStatus('error');
        }
    };

    const chooseSentiment = (nextSentiment: FeedbackSentiment) => {
        setSentiment(nextSentiment);
        setStatus('idle');
        if (compact && nextSentiment === 'positive') submit(nextSentiment, 'useful');
    };

    const resetAndClose = () => {
        setIsOpen(false);
        window.setTimeout(() => {
            setSentiment(null);
            setCategory('');
            setMessage('');
            setEmail('');
            setStatus('idle');
        }, 200);
    };

    if (!compact && !isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Send feedback"
                className="fixed bottom-4 right-4 z-[70] inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-xs font-semibold text-[var(--text-main)] shadow-xl transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 sm:bottom-5 sm:right-5 sm:px-4 sm:py-3"
            >
                <MessageCircle size={15} className="text-[var(--accent)]" /> <span className="hidden sm:inline">Feedback</span>
            </button>
        );
    }

    if (status === 'sent') {
        return (
            <div className={`${compact ? 'rounded-2xl border border-green-500/20 bg-green-500/10 p-4' : 'fixed bottom-5 right-5 z-[80] w-[min(390px,calc(100vw-2rem))] rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-2xl'} ${className}`}>
                <div className="flex items-center gap-3 text-sm font-semibold text-green-700 dark:text-green-400">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/15"><Check size={16} /></span>
                    Thank you—this helps us improve ResumeVibe.
                </div>
                {!compact && <button type="button" onClick={resetAndClose} className="rv-button-quiet mt-4 w-full">Close</button>}
            </div>
        );
    }

    return (
        <div className={`${compact ? 'rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:p-5' : 'fixed bottom-5 right-5 z-[80] w-[min(410px,calc(100vw-2rem))] rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-2xl'} ${className}`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-[var(--text-main)]">{prompt}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">One click is enough. Add detail only if you want to.</p>
                </div>
                {!compact && (
                    <button type="button" onClick={resetAndClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-input)]" aria-label="Close feedback">
                        <X size={15} />
                    </button>
                )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => chooseSentiment('positive')}
                    className={`rv-button-secondary justify-center ${sentiment === 'positive' ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400' : ''}`}
                >
                    <ThumbsUp size={14} /> Yes
                </button>
                <button
                    type="button"
                    onClick={() => chooseSentiment('negative')}
                    className={`rv-button-secondary justify-center ${sentiment === 'negative' ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400' : ''}`}
                >
                    <ThumbsDown size={14} /> Not really
                </button>
            </div>

            {sentiment === 'negative' && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {NEGATIVE_CATEGORIES.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setCategory(value)}
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${category === value ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {shouldAskForDetail && (
                <div className="mt-4 space-y-3">
                    <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        className="rv-field min-h-24 w-full resize-y px-3 py-3 text-xs leading-5"
                        placeholder="What should we improve? (optional)"
                        maxLength={3000}
                    />
                    {!compact && (
                        <input
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="rv-field h-10 w-full px-3 text-xs"
                            type="email"
                            placeholder="Email if you want a reply (optional)"
                        />
                    )}
                    <input
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                        className="hidden"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                    />
                    <button
                        type="button"
                        onClick={() => submit()}
                        disabled={status === 'sending' || (sentiment === 'negative' && !category)}
                        className="rv-button-primary w-full justify-center"
                    >
                        <Send size={14} /> {status === 'sending' ? 'Sending…' : 'Send feedback'}
                    </button>
                </div>
            )}

            {status === 'error' && <p className="mt-3 text-xs text-red-500">Feedback could not be sent. Please try again.</p>}
        </div>
    );
}
