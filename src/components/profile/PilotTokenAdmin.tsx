import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Search, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

interface GrantUser {
    id: number;
    email: string;
    name?: string;
    vibe_credits?: number;
    is_active?: boolean;
}

export function PilotTokenAdmin({ onSelfGrant }: { onSelfGrant: () => Promise<void> }) {
    const { isAuthenticated } = useAuth();
    const [admin, setAdmin] = useState<GrantUser | null>(null);
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<GrantUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<GrantUser | null>(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('Pilot credit');
    const [reviewing, setReviewing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const requestId = useRef('');
    const submitting = useRef(false);

    useEffect(() => {
        let current = true;
        setAdmin(null);
        if (!isAuthenticated) return;
        // Never trust a role or an admin flag saved in localStorage.
        void api.get('/api/users/me/').then(async response => {
            if (!response.ok) return;
            const payload = await response.json();
            if (current && payload.data?.can_manage_tokens === true) setAdmin(payload.data);
        }).catch(() => {});
        return () => { current = false; };
    }, [isAuthenticated]);

    useEffect(() => {
        let current = true;
        const search = query.trim();
        setUsers([]);
        if (!admin || search.length < 2) {
            setSearching(false);
            return;
        }
        setSearching(true);
        const timer = window.setTimeout(() => {
            void api.get(`/api/users/?query=${encodeURIComponent(search)}`).then(async response => {
                if (!response.ok) throw new Error('Search failed. Your admin access may have changed.');
                const result = await response.json();
                if (current) setUsers(Array.isArray(result.results) ? result.results : []);
            }).catch(failure => {
                if (current) setError(failure instanceof Error ? failure.message : 'Could not search users.');
            }).finally(() => { if (current) setSearching(false); });
        }, 300);
        return () => { current = false; window.clearTimeout(timer); };
    }, [admin, query]);

    if (!admin) return null;

    const chooseUser = (user: GrantUser) => {
        setSelected(user);
        setAmount('');
        setReviewing(false);
        setError('');
        setNotice('');
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!selected || submitting.current) return;
        const count = Number(amount);
        if (!Number.isSafeInteger(count) || count < 1 || count > 100000 || !reason.trim()) {
            setError('Choose 1–100,000 whole tokens and enter a reason.');
            return;
        }
        if (!reviewing) {
            requestId.current = crypto.randomUUID();
            setError('');
            setReviewing(true);
            return;
        }
        submitting.current = true;
        setBusy(true);
        setError('');
        try {
            const response = await api.post(`/api/users/${selected.id}/tokens/grant/`, {
                amount: count,
                reason: reason.trim(),
                product: 'resumevibe',
                request_id: requestId.current,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Grant failed. Check your admin access before retrying.');
            const updated = { ...selected, vibe_credits: result.token_balance };
            setSelected(updated);
            setUsers(previous => previous.map(user => user.id === selected.id ? updated : user));
            setNotice(`Added ${count.toLocaleString()} tokens to ${selected.email}. New balance: ${Number(result.token_balance).toLocaleString()}.`);
            setAmount('');
            setReviewing(false);
            if (selected.id === admin.id) {
                setAdmin(previous => previous ? { ...previous, vibe_credits: result.token_balance } : previous);
                await onSelfGrant();
            }
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Could not confirm the grant. Retry this request to avoid duplicate credit.');
        } finally {
            submitting.current = false;
            setBusy(false);
        }
    };

    return (
        <section className="rv-panel mb-8 p-5 sm:p-6" aria-labelledby="pilot-tokens-title">
            <p className="rv-kicker flex items-center gap-2"><ShieldCheck size={13} /> Admin only</p>
            <h2 id="pilot-tokens-title" className="mt-2 font-serif-ed text-3xl">Pilot token grants</h2>
            <nav className="mt-3 flex flex-wrap gap-3 text-xs"><a href="/profile?tab=requests" className="underline underline-offset-4">Token request inbox</a><a href="/profile?tab=insights" className="underline underline-offset-4">Campaign insights</a></nav>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--text-muted)]">Add a chosen amount to a registered user's shared TakoVibe/ResumeVibe wallet. Grants are recorded in the ledger. One-time credit only: no automatic refill or expiry.</p>
            <fieldset disabled={busy || reviewing} className="mt-5">
                <label htmlFor="pilot-user-search" className="block text-xs font-semibold">Find a user by email or name</label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-3.5 text-[var(--text-muted)]" /><input id="pilot-user-search" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); setSelected(null); setError(''); setNotice(''); }} placeholder="Enter at least 2 characters" className="rv-field min-h-11 w-full py-2 pl-10 pr-3 text-sm" /></div>
                    <button type="button" onClick={() => { setQuery(admin.email); chooseUser(admin); }} className="rv-button-secondary">Use my account</button>
                </div>
                {searching && <p role="status" className="mt-3 text-xs text-[var(--text-muted)]">Searching…</p>}
                {!searching && query.trim().length >= 2 && users.length === 0 && <p className="mt-3 text-xs text-[var(--text-muted)]">No matching users on this page.</p>}
                <div className="mt-3 space-y-2">{users.map(user => <button type="button" key={user.id} disabled={user.is_active === false} onClick={() => chooseUser(user)} aria-pressed={selected?.id === user.id} className={`flex w-full flex-col gap-1 rounded-xl border p-3 text-left text-xs disabled:opacity-40 sm:flex-row sm:items-center sm:justify-between ${selected?.id === user.id ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' : 'border-[var(--border-color)]'}`}><span className="min-w-0 break-all"><span className="block font-semibold">{user.name || user.email}</span><span className="text-[var(--text-muted)]">{user.email}{user.is_active === false ? ' · Inactive' : ''}</span></span><span className="shrink-0 text-[var(--text-muted)]">{Number(user.vibe_credits || 0).toLocaleString()} tokens</span></button>)}</div>
            </fieldset>
            {selected && <form onSubmit={submit} className="mt-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
                <p className="break-all text-xs font-semibold">Recipient: {selected.email}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Current balance: {Number(selected.vibe_credits || 0).toLocaleString()} tokens. This adds tokens; it does not replace the balance.</p>
                <fieldset disabled={busy || reviewing} className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
                    <label className="text-xs font-semibold">Tokens to add<input required type="number" min="1" max="100000" step="1" value={amount} onChange={event => setAmount(event.target.value)} className="rv-field mt-2 min-h-11 w-full px-3 py-2 text-sm" /></label>
                    <label className="text-xs font-semibold">Reason<input required maxLength={240} value={reason} onChange={event => setReason(event.target.value)} className="rv-field mt-2 min-h-11 w-full px-3 py-2 text-sm" /></label>
                </fieldset>
                {reviewing && <p className="mt-4 break-all rounded-lg border border-[var(--accent)] bg-[var(--accent-subtle)] p-3 text-xs leading-6">Confirm adding <strong>{Number(amount).toLocaleString()} tokens</strong> to <strong>{selected.email}</strong>.</p>}
                <div className="mt-4 flex flex-wrap gap-2"><button type="submit" disabled={busy} className="rv-button-primary"><Zap size={14} /> {busy ? 'Confirming…' : reviewing ? 'Confirm grant' : 'Review grant'}</button>{reviewing && <button type="button" disabled={busy} onClick={() => { setReviewing(false); setError(''); }} className="rv-button-secondary">Edit amount</button>}</div>
            </form>}
            {error && <p role="alert" className="mt-4 text-xs text-red-600 dark:text-red-400">{error}</p>}
            {notice && <p role="status" className="mt-4 break-all text-xs leading-6 text-[var(--text-main)]">{notice}</p>}
        </section>
    );
}
