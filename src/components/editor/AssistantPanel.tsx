import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AlertTriangle, Check, Eye, FileCheck2, Loader2, MessageCircle, RotateCcw, Send, Sparkles, UserCheck, X, Zap } from 'lucide-react';
import type { ResumeSchema } from '../../types/resume';
import { useToken } from '../../context/TokenContext';
import { RESUME_ASSISTANT_TOKEN_COST, type ResumeAssistantMemoryFact } from '../../lib/resumeAssistant';

export const RESUME_ASSISTANT_PRICE = RESUME_ASSISTANT_TOKEN_COST;

export interface AssistantSuggestion {
    id: string;
    section: 'summary' | 'experience' | 'projects' | 'skills' | 'achievements';
    targetId: string;
    targetIndex: number;
    before: string;
    after: string;
    reason: string;
    evidence: 'resume' | 'user' | 'confirmation';
}

export interface AssistantActivity {
    id: 'reading' | 'reviewing' | 'preparing' | 'checking';
    label: string;
    step: number;
    total: number;
}

interface AssistantQuestion {
    id: string;
    prompt: string;
    inputType: 'single_choice' | 'multi_choice' | 'text';
    options: string[];
    required: boolean;
}

interface AssistantMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    questions?: AssistantQuestion[];
    suggestions?: AssistantSuggestion[];
}

interface Props {
    data: ResumeSchema;
    conversationId: string;
    isAuthenticated: boolean;
    onRequireAuth: () => void;
    onClose: () => void;
    onPreviewSuggestion: (suggestion: AssistantSuggestion) => void;
    onApplySuggestions: (suggestions: AssistantSuggestion[]) => Promise<boolean>;
    onRejectSuggestion: (suggestion: AssistantSuggestion) => void;
    onUndo: () => void;
    onActivityChange: (activity: AssistantActivity | null) => void;
}

const ACTIVITY_STAGES: AssistantActivity[] = [
    { id: 'reading', label: 'Reading your request', step: 1, total: 4 },
    { id: 'reviewing', label: 'Reviewing your experience', step: 2, total: 4 },
    { id: 'preparing', label: 'Preparing safe changes', step: 3, total: 4 },
    { id: 'checking', label: 'Checking the result', step: 4, total: 4 },
];

const EVIDENCE_PRESENTATION = {
    resume: {
        label: 'From your resume',
        title: 'This suggestion only uses facts already present in your resume.',
        className: 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300',
        Icon: FileCheck2,
    },
    user: {
        label: 'From your answer',
        title: 'This suggestion uses information you provided in this conversation.',
        className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        Icon: UserCheck,
    },
    confirmation: {
        label: 'Needs confirmation',
        title: 'Review this interpretation carefully before applying it.',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        Icon: AlertTriangle,
    },
} as const;

const STARTERS = [
    'Review my resume and suggest the most important improvement.',
    'Make my summary clearer and more specific.',
    'Which experience bullet is the weakest?',
    'Help me tailor this resume to the job description.',
];

const WELCOME_MESSAGE: AssistantMessage = {
    id: 'welcome',
    role: 'assistant',
    content: 'What would you like to improve? I can review the resume, recommend changes, and update it with your approval.',
};

const CONVERSATION_STORAGE_PREFIX = 'resumevibe:assistant-chat:v1:';
const MEMORY_STORAGE_PREFIX = 'resumevibe:assistant-memory:v1:';
const MEMORY_CATEGORY_LABELS: Record<ResumeAssistantMemoryFact['category'], string> = {
    technology: 'Technology',
    work_context: 'Work context',
    achievement: 'Achievement',
    target_role: 'Target role',
    preference: 'Preference',
};

export function AssistantPanel({
    data,
    conversationId,
    isAuthenticated,
    onRequireAuth,
    onClose,
    onPreviewSuggestion,
    onApplySuggestions,
    onRejectSuggestion,
    onUndo,
    onActivityChange,
}: Props) {
    const [messages, setMessages] = useState<AssistantMessage[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [activity, setActivity] = useState<AssistantActivity | null>(null);
    const [confirmedFacts, setConfirmedFacts] = useState<ResumeAssistantMemoryFact[]>([]);
    const [error, setError] = useState('');
    const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<Set<string>>(new Set());
    const [rejectedSuggestionIds, setRejectedSuggestionIds] = useState<Set<string>>(new Set());
    const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
    const [lastAppliedBatchIds, setLastAppliedBatchIds] = useState<string[]>([]);
    const [questionAnswers, setQuestionAnswers] = useState<Record<string, string[]>>({});
    const [questionNotes, setQuestionNotes] = useState<Record<string, string>>({});
    const [submittedQuestionMessageIds, setSubmittedQuestionMessageIds] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);
    const loadedStorageKeyRef = useRef<string | null>(null);
    const previousStorageKeyRef = useRef<string | null>(null);
    const loadedMemoryKeyRef = useRef<string | null>(null);
    const previousMemoryKeyRef = useRef<string | null>(null);
    const activityTimersRef = useRef<number[]>([]);
    const { canAffordTokens, fetchTokenData, setShowUpgradeModal } = useToken();
    const conversationStorageKey = useMemo(
        () => `${CONVERSATION_STORAGE_PREFIX}${conversationId}`,
        [conversationId],
    );
    const memoryStorageKey = useMemo(
        () => `${MEMORY_STORAGE_PREFIX}${conversationId}`,
        [conversationId],
    );

    useEffect(() => {
        try {
            let stored = localStorage.getItem(conversationStorageKey);
            const previousKey = previousStorageKeyRef.current;
            if (!stored && previousKey?.endsWith(':draft')) {
                stored = localStorage.getItem(previousKey);
                if (stored) localStorage.setItem(conversationStorageKey, stored);
            }

            const parsed = stored ? JSON.parse(stored) : [];
            const restored = Array.isArray(parsed)
                ? parsed.filter((message): message is AssistantMessage => (
                    message
                    && (message.role === 'user' || message.role === 'assistant')
                    && typeof message.content === 'string'
                )).slice(-40).map((message) => ({
                    id: typeof message.id === 'string' ? message.id : `restored-${crypto.randomUUID()}`,
                    role: message.role,
                    content: message.content,
                }))
                : [];
            setMessages([WELCOME_MESSAGE, ...restored]);
        } catch (storageError) {
            console.warn('Could not restore the resume conversation.', storageError);
            setMessages([WELCOME_MESSAGE]);
        }

        setInput('');
        setError('');
        setAppliedSuggestionIds(new Set());
        setRejectedSuggestionIds(new Set());
        setSelectedSuggestionIds(new Set());
        setLastAppliedBatchIds([]);
        setQuestionAnswers({});
        setQuestionNotes({});
        setSubmittedQuestionMessageIds(new Set());
        loadedStorageKeyRef.current = conversationStorageKey;
        previousStorageKeyRef.current = conversationStorageKey;
        scrollToLatest();
    }, [conversationStorageKey]);

    useEffect(() => {
        if (loadedStorageKeyRef.current !== conversationStorageKey) return;
        try {
            const persistentMessages = messages
                .filter((message) => message.id !== 'welcome')
                .slice(-40)
                .map(({ id, role, content }) => ({ id, role, content }));
            localStorage.setItem(conversationStorageKey, JSON.stringify(persistentMessages));
        } catch (storageError) {
            console.warn('Could not save the resume conversation.', storageError);
        }
    }, [conversationStorageKey, messages]);

    useEffect(() => {
        try {
            let stored = localStorage.getItem(memoryStorageKey);
            const previousKey = previousMemoryKeyRef.current;
            if (!stored && previousKey?.endsWith(':draft')) {
                stored = localStorage.getItem(previousKey);
                if (stored) localStorage.setItem(memoryStorageKey, stored);
            }
            const parsed = stored ? JSON.parse(stored) : [];
            const restored = Array.isArray(parsed)
                ? parsed.filter((item): item is ResumeAssistantMemoryFact => (
                    item
                    && typeof item.id === 'string'
                    && ['technology', 'work_context', 'achievement', 'target_role', 'preference'].includes(item.category)
                    && typeof item.fact === 'string'
                    && item.fact.trim().length > 0
                )).slice(-30)
                : [];
            setConfirmedFacts(restored);
        } catch (storageError) {
            console.warn('Could not restore confirmed resume facts.', storageError);
            setConfirmedFacts([]);
        }
        loadedMemoryKeyRef.current = memoryStorageKey;
        previousMemoryKeyRef.current = memoryStorageKey;
    }, [memoryStorageKey]);

    useEffect(() => {
        if (loadedMemoryKeyRef.current !== memoryStorageKey) return;
        try {
            localStorage.setItem(memoryStorageKey, JSON.stringify(confirmedFacts.slice(-30)));
        } catch (storageError) {
            console.warn('Could not save confirmed resume facts.', storageError);
        }
    }, [confirmedFacts, memoryStorageKey]);

    const history = useMemo(() => messages
        .filter((item) => item.id !== 'welcome')
        .slice(-8)
        .map(({ role, content }) => ({ role, content })), [messages]);

    const publishActivity = useCallback((nextActivity: AssistantActivity | null) => {
        setActivity(nextActivity);
        onActivityChange(nextActivity);
    }, [onActivityChange]);

    const stopActivity = useCallback(() => {
        activityTimersRef.current.forEach((timer) => window.clearTimeout(timer));
        activityTimersRef.current = [];
        publishActivity(null);
    }, [publishActivity]);

    const startActivity = useCallback(() => {
        activityTimersRef.current.forEach((timer) => window.clearTimeout(timer));
        publishActivity(ACTIVITY_STAGES[0]);
        activityTimersRef.current = [
            window.setTimeout(() => publishActivity(ACTIVITY_STAGES[1]), 850),
            window.setTimeout(() => publishActivity(ACTIVITY_STAGES[2]), 1800),
            window.setTimeout(() => publishActivity(ACTIVITY_STAGES[3]), 3000),
        ];
    }, [publishActivity]);

    useEffect(() => () => stopActivity(), [stopActivity]);

    const scrollToLatest = () => {
        window.setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 30);
    };

    const sendMessage = async (rawMessage: string) => {
        const message = rawMessage.trim();
        if (!message || isSending) return false;
        if (!isAuthenticated) {
            onRequireAuth();
            return false;
        }
        if (!canAffordTokens(RESUME_ASSISTANT_PRICE)) return false;

        const userMessage: AssistantMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: message,
        };
        setMessages((current) => [...current, userMessage]);
        setInput('');
        setError('');
        setIsSending(true);
        startActivity();
        scrollToLatest();

        try {
            const authToken = localStorage.getItem('auth_token');
            if (!authToken) {
                onRequireAuth();
                return false;
            }
            const requestId = `resume-assistant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            const response = await fetch('/api/resume-assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Token ${authToken}`,
                    'X-Request-ID': requestId,
                },
                body: JSON.stringify({
                    message,
                    history,
                    resume: data,
                    memory: confirmedFacts.map(({ category, fact }) => ({ category, fact })),
                }),
            });
            const result = await response.json();
            if (response.status === 402) setShowUpgradeModal(true);
            if (response.status === 401) onRequireAuth();
            if (!response.ok || !result.success) throw new Error(result.error || 'The assistant could not respond.');

            const suggestions = Array.isArray(result.suggestions) ? result.suggestions as AssistantSuggestion[] : [];
            const questions = Array.isArray(result.questions) ? result.questions as AssistantQuestion[] : [];
            const newFacts = Array.isArray(result.confirmedFacts)
                ? result.confirmedFacts as ResumeAssistantMemoryFact[]
                : [];
            if (result.tokens_charged) await fetchTokenData();
            if (newFacts.length > 0) {
                setConfirmedFacts((current) => {
                    const next = [...current];
                    const seen = new Set(current.map((fact) => fact.fact.trim().toLocaleLowerCase()));
                    newFacts.forEach((fact) => {
                        const normalized = fact.fact?.trim().toLocaleLowerCase();
                        if (!normalized || seen.has(normalized)) return;
                        seen.add(normalized);
                        next.push(fact);
                    });
                    return next.slice(-30);
                });
            }
            if (suggestions.length > 0) {
                setSelectedSuggestionIds((current) => {
                    const next = new Set(current);
                    suggestions.forEach((suggestion) => next.add(suggestion.id));
                    return next;
                });
            }

            setMessages((current) => [...current, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: result.reply,
                questions,
                suggestions,
            }]);
            if (suggestions[0]) onPreviewSuggestion(suggestions[0]);
            return true;
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'The assistant could not respond.');
            return false;
        } finally {
            setIsSending(false);
            stopActivity();
            scrollToLatest();
        }
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void sendMessage(input);
    };

    const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void sendMessage(input);
        }
    };

    const applySuggestion = async (suggestion: AssistantSuggestion) => {
        if (isApplying) return;
        setIsApplying(true);
        let applied = false;
        try {
            applied = await onApplySuggestions([suggestion]);
        } finally {
            setIsApplying(false);
        }
        if (!applied) return;
        setAppliedSuggestionIds((current) => new Set(current).add(suggestion.id));
        setSelectedSuggestionIds((current) => {
            const next = new Set(current);
            next.delete(suggestion.id);
            return next;
        });
        setLastAppliedBatchIds([suggestion.id]);
    };

    const applySelectedSuggestions = async (suggestions: AssistantSuggestion[]) => {
        if (isApplying) return;
        const selected = suggestions.filter((suggestion) => (
            selectedSuggestionIds.has(suggestion.id)
            && !appliedSuggestionIds.has(suggestion.id)
            && !rejectedSuggestionIds.has(suggestion.id)
        ));
        if (selected.length === 0) return;
        setIsApplying(true);
        let applied = false;
        try {
            applied = await onApplySuggestions(selected);
        } finally {
            setIsApplying(false);
        }
        if (!applied) return;
        const selectedIds = selected.map((suggestion) => suggestion.id);
        setAppliedSuggestionIds((current) => new Set([...current, ...selectedIds]));
        setSelectedSuggestionIds((current) => {
            const next = new Set(current);
            selectedIds.forEach((id) => next.delete(id));
            return next;
        });
        setLastAppliedBatchIds(selectedIds);
    };

    const undoLastBatch = () => {
        if (lastAppliedBatchIds.length === 0) return;
        onUndo();
        setAppliedSuggestionIds((current) => {
            const next = new Set(current);
            lastAppliedBatchIds.forEach((id) => next.delete(id));
            return next;
        });
        setSelectedSuggestionIds((current) => new Set([...current, ...lastAppliedBatchIds]));
        setLastAppliedBatchIds([]);
    };

    const rejectSuggestion = (suggestion: AssistantSuggestion) => {
        onRejectSuggestion(suggestion);
        setRejectedSuggestionIds((current) => new Set(current).add(suggestion.id));
        setSelectedSuggestionIds((current) => {
            const next = new Set(current);
            next.delete(suggestion.id);
            return next;
        });
    };

    const reopenSuggestion = (suggestion: AssistantSuggestion) => {
        setRejectedSuggestionIds((current) => {
            const next = new Set(current);
            next.delete(suggestion.id);
            return next;
        });
        setSelectedSuggestionIds((current) => new Set(current).add(suggestion.id));
        onPreviewSuggestion(suggestion);
    };

    const toggleSuggestionSelection = (suggestionId: string) => {
        setSelectedSuggestionIds((current) => {
            const next = new Set(current);
            if (next.has(suggestionId)) next.delete(suggestionId);
            else next.add(suggestionId);
            return next;
        });
    };

    const setSuggestionGroupSelection = (suggestions: AssistantSuggestion[], selected: boolean) => {
        setSelectedSuggestionIds((current) => {
            const next = new Set(current);
            suggestions.forEach((suggestion) => {
                if (appliedSuggestionIds.has(suggestion.id) || rejectedSuggestionIds.has(suggestion.id)) return;
                if (selected) next.add(suggestion.id);
                else next.delete(suggestion.id);
            });
            return next;
        });
    };

    const answerKey = (messageId: string, questionId: string) => `${messageId}:${questionId}`;

    const selectQuestionOption = (messageId: string, question: AssistantQuestion, option: string) => {
        const key = answerKey(messageId, question.id);
        setQuestionAnswers((current) => {
            const selected = current[key] || [];
            if (question.inputType === 'multi_choice') {
                return {
                    ...current,
                    [key]: selected.includes(option)
                        ? selected.filter((item) => item !== option)
                        : [...selected, option],
                };
            }
            return { ...current, [key]: [option] };
        });
    };

    const submitQuestionAnswers = async (message: AssistantMessage) => {
        const questions = message.questions || [];
        const missingRequired = questions.some((question) => (
            question.required && !(questionAnswers[answerKey(message.id, question.id)] || []).some((answer) => answer.trim())
        ));
        if (missingRequired) {
            setError('Please answer the required questions first.');
            return;
        }

        const answerLines = questions.map((question) => {
            const answer = (questionAnswers[answerKey(message.id, question.id)] || []).filter(Boolean).join(', ') || 'Skipped';
            return `- ${question.prompt}: ${answer}`;
        });
        const notes = (questionNotes[message.id] || '').trim();
        if (notes) answerLines.push(`- Additional context: ${notes}`);

        const sent = await sendMessage(`Here are my answers:\n${answerLines.join('\n')}`);
        if (sent) setSubmittedQuestionMessageIds((current) => new Set(current).add(message.id));
    };

    return (
        <section className="flex h-full min-h-0 flex-col bg-[var(--bg-card)] text-[var(--text-main)]" aria-label="Resume Copilot">
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border-color)] px-4 sm:px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                    <Sparkles size={17} />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">Resume Copilot</h2>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Resume context connected
                        {confirmedFacts.length > 0 && <span>· {confirmedFacts.length} facts</span>}
                    </p>
                </div>
                <span className="hidden items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1 text-[9px] font-semibold text-[var(--text-muted)] sm:flex">
                    <Zap size={10} /> {RESUME_ASSISTANT_PRICE} / change set
                </span>
                <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]" aria-label="Close Resume Copilot">
                    <X size={17} />
                </button>
            </header>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
                {confirmedFacts.length > 0 && (
                    <details className="group rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]">
                        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[10px] font-semibold text-[var(--text-main)]">
                            <Sparkles size={12} className="text-[var(--accent)]" />
                            Confirmed memory
                            <span className="ml-auto rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[9px] text-[var(--accent)]">{confirmedFacts.length}</span>
                        </summary>
                        <div className="space-y-2 border-t border-[var(--border-color)] px-3 py-3">
                            <p className="px-1 text-[9px] leading-4 text-[var(--text-muted)]">Saved for this resume in this browser. Remove anything that is no longer accurate.</p>
                            {confirmedFacts.map((fact) => (
                                <div key={fact.id} className="flex items-start gap-2 rounded-xl bg-[var(--bg-card)] px-3 py-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{MEMORY_CATEGORY_LABELS[fact.category]}</p>
                                        <p className="mt-1 text-[10px] leading-4 text-[var(--text-main)]">{fact.fact}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmedFacts((current) => current.filter((item) => item.id !== fact.id))}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-500"
                                        aria-label={`Forget: ${fact.fact}`}
                                        title="Forget this fact"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setConfirmedFacts([])} className="px-1 pt-1 text-[9px] font-semibold text-[var(--text-muted)] hover:text-red-500">
                                Forget all confirmed facts
                            </button>
                        </div>
                    </details>
                )}

                {messages.map((message) => (
                    <div key={message.id} className={message.role === 'user' ? 'ml-8' : 'mr-3'}>
                        <div className={`rounded-2xl px-4 py-3 text-xs leading-5 ${message.role === 'user' ? 'bg-[var(--text-main)] text-[var(--bg-main)]' : 'border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)]'}`}>
                            {message.content}
                        </div>

                        {message.questions && message.questions.length > 0 && (
                            <article className="mt-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Quick clarification</p>
                                        <p className="mt-1 text-[10px] text-[var(--text-muted)]">Choose what applies. You can add context below.</p>
                                    </div>
                                    <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-1 text-[9px] font-semibold text-[var(--accent)]">Free</span>
                                </div>

                                <div className="mt-4 space-y-4">
                                    {message.questions.map((question, questionIndex) => {
                                        const key = answerKey(message.id, question.id);
                                        const selected = questionAnswers[key] || [];
                                        return (
                                            <fieldset key={key} disabled={submittedQuestionMessageIds.has(message.id)}>
                                                <legend className="text-[11px] font-semibold leading-4 text-[var(--text-main)]">
                                                    {questionIndex + 1}. {question.prompt}
                                                    {!question.required && <span className="ml-1 font-normal text-[var(--text-muted)]">(optional)</span>}
                                                </legend>

                                                {question.inputType === 'text' ? (
                                                    <input
                                                        type="text"
                                                        value={selected[0] || ''}
                                                        onChange={(event) => setQuestionAnswers((current) => ({ ...current, [key]: [event.target.value] }))}
                                                        placeholder="Type a short answer"
                                                        className="mt-2 h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-[11px] outline-none transition focus:border-[var(--accent)]/50"
                                                    />
                                                ) : (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {question.options.map((option) => {
                                                            const isSelected = selected.includes(option);
                                                            return (
                                                                <button
                                                                    key={option}
                                                                    type="button"
                                                                    aria-pressed={isSelected}
                                                                    onClick={() => selectQuestionOption(message.id, question, option)}
                                                                    className={`rounded-full border px-2.5 py-1.5 text-[10px] font-medium transition ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--accent)]/45'}`}
                                                                >
                                                                    {isSelected && <Check size={10} className="mr-1 inline" />}{option}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </fieldset>
                                        );
                                    })}
                                </div>

                                <textarea
                                    value={questionNotes[message.id] || ''}
                                    onChange={(event) => setQuestionNotes((current) => ({ ...current, [message.id]: event.target.value }))}
                                    disabled={submittedQuestionMessageIds.has(message.id)}
                                    rows={2}
                                    maxLength={800}
                                    placeholder="Optional details, metrics, or context…"
                                    className="mt-4 w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[10px] leading-4 outline-none transition focus:border-[var(--accent)]/50 disabled:opacity-60"
                                />

                                <button
                                    type="button"
                                    onClick={() => void submitQuestionAnswers(message)}
                                    disabled={isSending || submittedQuestionMessageIds.has(message.id)}
                                    className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[var(--text-main)] px-3 text-[10px] font-semibold text-[var(--bg-main)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {submittedQuestionMessageIds.has(message.id) ? <><Check size={12} /> Answers sent</> : <><Send size={12} /> Continue with these answers</>}
                                </button>
                            </article>
                        )}

                        {message.suggestions && message.suggestions.length > 1 && (() => {
                            const actionable = message.suggestions.filter((suggestion) => (
                                !appliedSuggestionIds.has(suggestion.id) && !rejectedSuggestionIds.has(suggestion.id)
                            ));
                            const selectedCount = actionable.filter((suggestion) => selectedSuggestionIds.has(suggestion.id)).length;
                            const allSelected = actionable.length > 0 && selectedCount === actionable.length;
                            const messageSuggestionIds = new Set(message.suggestions.map((suggestion) => suggestion.id));
                            const canUndoBatch = lastAppliedBatchIds.length > 1
                                && lastAppliedBatchIds.every((id) => messageSuggestionIds.has(id));
                            return (
                                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5">
                                    <span className="mr-auto text-[10px] font-semibold text-[var(--text-main)]">
                                        {actionable.length > 0 ? `${selectedCount} of ${actionable.length} selected` : 'Changes reviewed'}
                                    </span>
                                    {actionable.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSuggestionGroupSelection(message.suggestions || [], !allSelected)}
                                            className="h-7 rounded-lg px-2 text-[9px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--bg-card)] hover:text-[var(--text-main)]"
                                        >
                                            {allSelected ? 'Clear' : 'Select all'}
                                        </button>
                                    )}
                                    {canUndoBatch && (
                                        <button type="button" onClick={undoLastBatch} className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 text-[9px] font-semibold">
                                            <RotateCcw size={11} /> Undo batch
                                        </button>
                                    )}
                                    {actionable.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => void applySelectedSuggestions(message.suggestions || [])}
                                            disabled={selectedCount === 0 || isApplying}
                                            className="inline-flex h-7 items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 text-[9px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {isApplying ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Apply selected
                                        </button>
                                    )}
                                </div>
                            );
                        })()}

                        {message.suggestions?.map((suggestion) => {
                            const isApplied = appliedSuggestionIds.has(suggestion.id);
                            const isRejected = rejectedSuggestionIds.has(suggestion.id);
                            const isSelected = selectedSuggestionIds.has(suggestion.id);
                            const evidence = EVIDENCE_PRESENTATION[suggestion.evidence || 'resume'];
                            const EvidenceIcon = evidence.Icon;
                            return (
                                <article key={suggestion.id} className={`mt-3 overflow-hidden rounded-2xl border bg-[var(--accent-subtle)] transition ${isSelected && !isApplied && !isRejected ? 'border-[var(--accent)]/55 ring-1 ring-[var(--accent)]/15' : 'border-[var(--accent)]/25'}`}>
                                    <div className="border-b border-[var(--accent)]/15 px-4 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                {!isApplied && !isRejected && message.suggestions && message.suggestions.length > 1 && (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSuggestionSelection(suggestion.id)}
                                                        aria-label={`Select ${suggestion.section} suggestion`}
                                                        className="h-3.5 w-3.5 rounded border-[var(--border-color)] accent-[var(--accent)]"
                                                    />
                                                )}
                                                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">{suggestion.section} suggestion</p>
                                            </div>
                                            <span title={evidence.title} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${evidence.className}`}>
                                                <EvidenceIcon size={10} /> {evidence.label}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 text-[11px] leading-4 text-[var(--text-muted)]">{suggestion.reason}</p>
                                    </div>
                                    <div className="space-y-3 px-4 py-3">
                                        <div>
                                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Current</p>
                                            <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-[var(--text-muted)] line-through decoration-red-400/60">{suggestion.before || 'Empty'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">Suggested</p>
                                            <p className="mt-1 text-[11px] font-medium leading-4">{suggestion.after}</p>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            {isRejected ? (
                                                <>
                                                    <span className="flex flex-1 items-center gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]"><X size={13} /> Dismissed</span>
                                                    <button type="button" onClick={() => reopenSuggestion(suggestion)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)]"><RotateCcw size={12} /> Reopen</button>
                                                </>
                                            ) : isApplied ? (
                                                <>
                                                    <span className="flex flex-1 items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"><Check size={13} /> Applied</span>
                                                    {lastAppliedBatchIds.length === 1 && lastAppliedBatchIds[0] === suggestion.id && <button type="button" onClick={undoLastBatch} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)]"><RotateCcw size={12} /> Undo</button>}
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button" onClick={() => rejectSuggestion(suggestion)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-red-500"><X size={12} /> Reject</button>
                                                    <button type="button" onClick={() => onPreviewSuggestion(suggestion)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 text-[10px] font-semibold hover:border-[var(--accent)]/40"><Eye size={12} /> Preview</button>
                                                    <button type="button" disabled={isApplying} onClick={() => void applySuggestion(suggestion)} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-[10px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{isApplying ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Apply change</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ))}

                {messages.length === 1 && (
                    <div className="space-y-2">
                        <p className="px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Try asking</p>
                        {STARTERS.map((starter) => (
                            <button key={starter} type="button" onClick={() => void sendMessage(starter)} className="flex w-full items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-left text-[11px] leading-4 transition hover:border-[var(--accent)]/35 hover:bg-[var(--accent-subtle)]">
                                <MessageCircle size={13} className="shrink-0 text-[var(--accent)]" /> {starter}
                            </button>
                        ))}
                    </div>
                )}

                {isSending && (
                    <div className="mr-12 flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
                        <Loader2 size={13} className="animate-spin text-[var(--accent)]" />
                        <span className="flex-1">{activity?.label || 'Starting resume review'}</span>
                        <span className="text-[9px] font-semibold tabular-nums text-[var(--accent)]">{activity?.step || 1}/4</span>
                    </div>
                )}
                {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
            </div>

            <form onSubmit={submit} className="shrink-0 border-t border-[var(--border-color)] p-3 sm:p-4">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] p-2 transition focus-within:border-[var(--accent)]/50 focus-within:ring-2 focus-within:ring-[var(--accent)]/10">
                    <textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={handleInputKeyDown}
                        disabled={isSending}
                        rows={3}
                        maxLength={2000}
                        placeholder="Ask about your resume…"
                        className="w-full resize-none bg-transparent px-2 py-1.5 text-xs leading-5 text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60"
                    />
                    <div className="flex items-center justify-between gap-3 px-1">
                        <span className="text-[9px] text-[var(--text-muted)]">Charged only when suggestions are prepared</span>
                        <button type="submit" disabled={isSending || !input.trim()} className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Send message">
                            {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
}
