import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { TokenRequestQueue, requestResult, type PilotRequest } from './TokenRequestQueue';

const fetcher = (path: string, options: RequestInit = {}) => options.method === 'POST'
    ? api.post(path, JSON.parse(String(options.body))) : api.get(path);

export function TokenRequests({ refreshWallet }: { refreshWallet: () => Promise<void> }) {
    const { isAuthenticated } = useAuth();
    const [canManage, setCanManage] = useState<boolean | null>(null);
    const [rows, setRows] = useState<PilotRequest[]>([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('200');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const submissionId = useRef('');
    const submitting = useRef(false);

    useEffect(() => {
        let current = true;
        if (!isAuthenticated) return;
        void api.get('/api/users/me/').then(requestResult).then(result => {
            if (current) setCanManage(result.data?.can_manage_tokens === true);
        }).catch(() => { if (current) setCanManage(false); });
        return () => { current = false; };
    }, [isAuthenticated]);

    useEffect(() => {
        let current = true;
        if (!isAuthenticated || canManage !== false) return;
        setLoading(true);
        void api.get(`/api/users/token-requests/?page=${page}`).then(requestResult).then(result => {
            if (current) { setRows(result.results || []); setCount(result.count || 0); }
        }).catch(failure => { if (current) setError(failure.message); }).finally(() => { if (current) setLoading(false); });
        return () => { current = false; };
    }, [isAuthenticated, canManage, page, reload]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (submitting.current) return;
        const tokens = Number(amount);
        if (!Number.isSafeInteger(tokens) || tokens < 1 || tokens > 100000 || reason.trim().length < 10) {
            setError('Choose 1–100,000 whole tokens and explain your request in at least 10 characters.'); return;
        }
        submitting.current = true; setBusy(true); setError(''); setNotice('');
        if (!submissionId.current) submissionId.current = crypto.randomUUID();
        try {
            await requestResult(await api.post('/api/users/token-requests/', {
                requested_amount: tokens, reason: reason.trim(), product: 'resumevibe', submission_id: submissionId.current,
            }));
            setNotice('Request sent. An admin must approve it before any tokens are added.');
            submissionId.current = ''; setReason(''); setPage(1); setReload(value => value + 1);
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not confirm submission. Retry the same request.'); }
        finally { submitting.current = false; setBusy(false); }
    }

    if (!isAuthenticated) return <section className="rv-panel p-6"><h2 className="text-2xl font-semibold">Request pilot tokens</h2><p className="mt-3 text-sm">Sign in to submit a request and track its status.</p><button className="rv-button-primary mt-4" onClick={() => window.dispatchEvent(new CustomEvent('show-login-modal'))}>Sign in</button></section>;
    if (canManage === null) return <p role="status">Loading token requests…</p>;
    if (canManage) return <TokenRequestQueue fetcher={fetcher} />;
    const pending = rows.some(row => row.status === 'pending');
    return <section id="token-requests" className="rv-panel p-5 sm:p-6" aria-labelledby="my-token-requests-title">
        <h2 id="my-token-requests-title" className="text-2xl font-semibold">Request pilot tokens</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Need more tokens to try ResumeVibe? Tell us what you want to test. Approval is not guaranteed, and the admin may approve a different amount. One pending request at a time; up to 3 submissions in 24 hours.</p>
        {pending && <p role="status" className="mt-4 text-sm font-semibold">Your request is pending admin review. You have not been credited yet.</p>}
        <form onSubmit={submit} className="mt-5">
            <fieldset disabled={busy || pending || loading} className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <label className="text-xs font-semibold">Tokens requested<input aria-label="Tokens requested" required type="number" min="1" max="100000" step="1" value={amount} onChange={event => { setAmount(event.target.value); submissionId.current = ''; }} className="rv-field mt-2 min-h-11 w-full px-3 py-2 text-sm" /></label>
                <label className="text-xs font-semibold">What will you use them for?<textarea aria-label="Request reason" required minLength={10} maxLength={1000} value={reason} onChange={event => { setReason(event.target.value); submissionId.current = ''; }} placeholder="For example, tailor my backend resume for two openings." className="rv-field mt-2 min-h-24 w-full px-3 py-2 text-sm" /></label>
            </fieldset>
            <p className="mt-3 text-xs text-[var(--text-muted)]">Do not include passwords, private documents, or sensitive personal information.</p>
            <button type="submit" disabled={busy || pending || loading} className="rv-button-primary mt-4">{busy ? 'Sending…' : 'Send token request'}</button>
        </form>
        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {notice && <p role="status" className="mt-4 text-sm">{notice}</p>}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">My requests</h3><button disabled={busy || loading} className="rv-button-secondary" onClick={() => { setReload(value => value + 1); void refreshWallet(); }}>Refresh status</button></div>
        {loading ? <p role="status" className="mt-4 text-sm">Loading history…</p> : rows.length === 0 ? <p className="mt-4 text-sm text-[var(--text-muted)]">No requests yet.</p> : <div className="mt-4 space-y-3">{rows.map(row => <article key={row.id} className="rounded-xl border border-[var(--border-color)] p-4">
            <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold">#{row.id} · {row.requested_amount.toLocaleString()} tokens requested</p><span className="text-xs font-semibold capitalize">{row.status}</span></div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{new Date(row.created_at).toLocaleString()}</p>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{row.reason}</p>
            {row.status === 'approved' && <p className="mt-3 text-sm font-semibold">{row.granted_amount.toLocaleString()} tokens added to your shared wallet.</p>}
            {row.admin_note && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">Admin note: {row.admin_note}</p>}
        </article>)}</div>}
        <div className="mt-4 flex flex-wrap items-center gap-3"><button className="rv-button-secondary" disabled={page <= 1 || loading || busy} onClick={() => setPage(value => value - 1)}>Previous requests</button><span className="text-xs">Page {page}</span><button className="rv-button-secondary" disabled={page * 10 >= count || loading || busy} onClick={() => setPage(value => value + 1)}>Next requests</button></div>
    </section>;
}
