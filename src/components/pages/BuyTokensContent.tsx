import React from 'react';
import { AuthOnlyProviders } from '../Providers';
import { Navbar } from '../ui/Navbar';
import { Footer } from '../ui/Footer';
import { LoginModal } from '../ui/LoginModal';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToken } from '../../context/TokenContext';
import {
    ArrowRight,
    BadgeCheck,
    Check,
    CheckCircle,
    CreditCard,
    Loader2,
    Lock,
    ReceiptText,
    ShieldCheck,
    Sparkles,
    XCircle,
    X,
    Zap,
} from 'lucide-react';

const PACKS = [
    { tokens: 200,  price: '₹85',   usd: '~$1',   savings: null,      popular: false },
    { tokens: 1000, price: '₹399',  usd: '~$4.75', savings: '~5% off', popular: true  },
    { tokens: 2000, price: '₹699',  usd: '~$8.32', savings: '~17% off', popular: false },
];

const TOKEN_FORMATTER = new Intl.NumberFormat('en-US');

export function BuyTokensContent() {
    return (
        <AuthOnlyProviders>
            <BuyTokensInner />
        </AuthOnlyProviders>
    );
}

function BuyTokensInner() {
    const { isAuthenticated, user } = useAuth();
    const { tokenBalance, fetchTokenData } = useToken();
    const [loadingPack, setLoadingPack] = React.useState<number | null>(null);
    const [error, setError] = React.useState<string>('');
    const [paymentModal, setPaymentModal] = React.useState<{ state: 'processing' | 'success' | 'failed'; message: string } | null>(null);
    const pollTimerRef = React.useRef<number | null>(null);

    const stopPolling = () => {
        if (pollTimerRef.current !== null) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    };

    const pollStatus = async (requestId: string, orderId: string, paymentId?: string) => {
        try {
            const response = await api.get(
                `/api/users/tokens/payment-status/?request_id=${encodeURIComponent(requestId)}&payment_id=${encodeURIComponent(paymentId || '')}&payment_link_id=${encodeURIComponent(orderId)}`
            );
            if (!response.ok) return;

            const data = await response.json();
            if (data.status === 'success') {
                stopPolling();
                setPaymentModal({ state: 'success', message: data.message || 'Payment successful. Tokens credited.' });
                fetchTokenData();
                return;
            }

            if (data.status === 'failed') {
                stopPolling();
                setPaymentModal({ state: 'failed', message: data.message || 'Payment failed. Please try again.' });
                setError(data.message || 'Payment failed. Please try again.');
                return;
            }
        } catch (err) {
            console.error('Failed to poll payment status:', err);
        }
    };

    const loadRazorpayScript = async () => {
        if ((window as any).Razorpay) return true;
        return new Promise<boolean>((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePurchase = async (tokensAmount: number) => {
        setError('');
        if (!isAuthenticated) {
            window.dispatchEvent(new CustomEvent('show-login-modal'));
            setError('Please login first to purchase tokens.');
            return;
        }

        setLoadingPack(tokensAmount);
        try {
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                throw new Error('Unable to load Razorpay Checkout.');
            }

            const response = await api.post('/api/users/tokens/create-order/', {
                product: 'resumevibe',
                tokens_amount: tokensAmount,
            });
            if (!response.ok) {
                let message = 'Failed to create checkout session.';
                try {
                    const data = await response.json();
                    if (data?.error) message = data.error;
                } catch {
                    // Ignore parse failures and keep default message.
                }
                throw new Error(message);
            }
            const data = await response.json();
            if (data.order_id && data.key) {
                const requestId = data.request_id || `ord-${Date.now()}`;
                setPaymentModal({ state: 'processing', message: 'Complete payment in the Razorpay popup. We will verify it automatically.' });

                const razorpay = new (window as any).Razorpay({
                    key: data.key,
                    amount: data.amount,
                    currency: data.currency || 'INR',
                    name: 'ResumeVibe',
                    description: `${tokensAmount} VibeTokens`,
                    image: '/favicon.svg',
                    order_id: data.order_id,
                    handler: async (paymentResponse: any) => {
                        try {
                            const verifyRes = await api.post('/api/users/tokens/verify-payment/', paymentResponse);
                            if (!verifyRes.ok) {
                                const verifyData = await verifyRes.json().catch(() => ({}));
                                throw new Error(verifyData?.message || verifyData?.error || 'Payment verification failed.');
                            }
                            const verifyData = await verifyRes.json();
                            setPaymentModal({ state: 'success', message: verifyData.message || 'Payment successful. Tokens credited.' });
                            fetchTokenData();
                        } catch (verifyErr) {
                            console.error('Payment verify failed:', verifyErr);
                            setPaymentModal({ state: 'processing', message: 'Payment received. Final verification in progress...' });
                            stopPolling();
                            pollTimerRef.current = window.setInterval(() => {
                                pollStatus(requestId, data.order_id, paymentResponse?.razorpay_payment_id);
                            }, 5000);
                            pollStatus(requestId, data.order_id, paymentResponse?.razorpay_payment_id);
                        }
                    },
                    modal: {
                        ondismiss: () => {
                            setPaymentModal({ state: 'failed', message: 'Payment popup closed before completion.' });
                        },
                    },
                    prefill: {
                        name: user ? `${user.first_name || ''}`.trim() : '',
                        email: user?.email || '',
                    },
                    method: {
                        upi: true,
                        card: true,
                        netbanking: true,
                        wallet: true,
                    },
                    notes: {
                        request_id: requestId,
                    },
                    theme: {
                        color: '#8B7355',
                    },
                });

                razorpay.on('payment.failed', () => {
                    setPaymentModal({ state: 'failed', message: 'Payment failed. Please try again.' });
                });

                razorpay.open();
            } else {
                setError('Order details were not returned by the server.');
            }
        } catch (error) {
            console.error('Failed to initiate checkout', error);
            setError(error instanceof Error ? error.message : 'Checkout could not be started.');
        } finally {
            setLoadingPack(null);
        }
    };

    React.useEffect(() => {
        return () => stopPolling();
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col font-sans-ed">
            <Navbar />
            <LoginModal />

            <main className="relative flex-1 overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_62%_0%,var(--accent-glow),transparent_42%)] opacity-70" />

                <div className="relative mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
                    <header className="grid gap-10 border-b border-[var(--border-color)] pb-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:pb-16">
                        <div>
                            <div className="mb-7 flex items-center gap-4">
                                <p className="rv-kicker">VibeTokens · Your AI budget</p>
                                <div className="h-px w-12 bg-[var(--accent)]/50" />
                            </div>
                            <h1 className="max-w-4xl font-serif-ed text-5xl font-normal leading-[0.92] tracking-tight text-[var(--text-main)] sm:text-6xl lg:text-8xl">
                                Keep the <span className="italic text-[var(--accent)]">momentum.</span>
                            </h1>
                            <p className="mt-7 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
                                Add tokens when you need more room for focused applications, deeper audits, and the small improvements that make a resume feel finished.
                            </p>
                        </div>

                        <aside className="rv-panel relative overflow-hidden p-6 sm:p-7">
                            <div className="absolute right-0 top-0 h-16 w-16 border-b border-l border-[var(--border-color)] bg-[var(--bg-main)]/60" />
                            <div className="relative flex items-start justify-between gap-4">
                                <div>
                                    <p className="rv-kicker">Your wallet</p>
                                    <p className="mt-5 font-sans-ed text-5xl font-semibold leading-none tracking-tight text-[var(--text-main)] tabular-nums">
                                        {TOKEN_FORMATTER.format(tokenBalance)}
                                    </p>
                                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">tokens available</p>
                                </div>
                                <span className="rv-icon-tile"><Zap size={18} /></span>
                            </div>
                            <div className="mt-7 flex items-center gap-2 border-t border-[var(--border-color)] pt-4 text-xs text-[var(--text-muted)]">
                                <BadgeCheck size={15} className="text-[var(--accent)]" />
                                <span>Tokens never expire</span>
                            </div>
                        </aside>
                    </header>

                    <section className="py-14 lg:py-20">
                        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="rv-kicker">Choose your pack</p>
                                <h2 className="mt-3 font-serif-ed text-4xl text-[var(--text-main)] sm:text-5xl">Buy only what you need.</h2>
                            </div>
                            <p className="max-w-xs text-xs leading-5 text-[var(--text-muted)] sm:text-right">One token supports a focused AI action inside your ResumeVibe workspace.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    {PACKS.map((pack) => (
                        <article
                            key={pack.tokens}
                            className={`rv-panel group relative flex min-h-[25rem] flex-col p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7 ${
                                pack.popular
                                    ? 'border-[var(--accent)] shadow-[0_18px_50px_-24px_var(--accent-glow)]'
                                    : ''
                            }`}
                        >
                            {pack.popular && (
                                <div className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full bg-[var(--text-main)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--bg-main)]">
                                    <Sparkles size={11} /> Most popular
                                </div>
                            )}
                            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] pb-5">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Pack {PACKS.indexOf(pack) + 1}</p>
                                    <h3 className="mt-2 font-sans-ed text-3xl font-semibold tracking-tight text-[var(--text-main)] tabular-nums">
                                        {TOKEN_FORMATTER.format(pack.tokens)} tokens
                                    </h3>
                                </div>
                                {pack.savings && (
                                    <span className="rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                                        {pack.savings}
                                    </span>
                                )}
                            </div>

                            <div className="mt-6 flex items-baseline gap-2">
                                <p className="font-serif-ed text-5xl leading-none text-[var(--text-main)]">{pack.price}</p>
                                <p className="text-sm font-medium text-[var(--text-muted)]">{pack.usd}</p>
                            </div>

                            <ul className="mt-7 space-y-3.5 text-sm text-[var(--text-muted)]">
                                <li className="flex items-center gap-3">
                                    <Check size={15} className="shrink-0 text-[var(--accent)]" />
                                    <span>Never expires</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Check size={15} className="shrink-0 text-[var(--accent)]" />
                                    <span>Applied instantly</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Check size={15} className="shrink-0 text-[var(--accent)]" />
                                    <span>UPI, cards &amp; netbanking</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Check size={15} className="shrink-0 text-[var(--accent)]" />
                                    <span>Use tokens to read premium System Design &amp; AI articles <span className="whitespace-nowrap">(coming soon)</span></span>
                                </li>
                            </ul>

                            <div className="mt-auto pt-8">
                                <button
                                    onClick={() => handlePurchase(pack.tokens)}
                                    disabled={loadingPack !== null}
                                    className="rv-button-primary w-full"
                                >
                                    {loadingPack === pack.tokens ? (
                                        <><Loader2 size={14} className="animate-spin" /> Processing</>
                                    ) : (
                                        <>Buy pack <ArrowRight size={14} /></>
                                    )}
                                </button>
                            </div>
                        </article>
                    ))}
                        </div>

                        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border-color)] pt-5 text-[11px] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
                            <p className="flex items-center gap-2"><Lock size={14} className="text-[var(--accent)]" /> Payments are securely processed by Razorpay.</p>
                            <p className="flex items-center gap-2"><CreditCard size={14} /> We never store card details.</p>
                        </div>
                        {error && (
                            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-medium text-red-500">{error}</p>
                        )}
                    </section>

                    <section className="grid gap-px overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--border-color)] sm:grid-cols-3">
                        {[
                            { icon: Sparkles, label: 'Focused AI actions', detail: 'Spend tokens on the moments that need a second pair of eyes.' },
                            { icon: ReceiptText, label: 'Clear usage', detail: 'See what each action costs before you approve it.' },
                            { icon: ShieldCheck, label: 'Your final say', detail: 'Every suggestion stays reviewable before it touches your resume.' },
                        ].map((item) => (
                            <div key={item.label} className="bg-[var(--bg-card)] p-6 sm:p-7">
                                <item.icon size={18} className="text-[var(--accent)]" />
                                <h3 className="mt-5 text-sm font-semibold text-[var(--text-main)]">{item.label}</h3>
                                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{item.detail}</p>
                            </div>
                        ))}
                    </section>
                </div>
            </main>

            <Footer />

            {paymentModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="rv-modal-backdrop absolute inset-0" />
                    <div className="rv-modal relative w-full max-w-md p-7 text-center sm:p-9">
                        {paymentModal.state !== 'processing' && (
                            <button
                                onClick={() => {
                                    stopPolling();
                                    setPaymentModal(null);
                                }}
                                className="absolute right-3 top-3 rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)]"
                            >
                                <X size={16} />
                            </button>
                        )}
                        <div className="mb-5 flex justify-center">
                            {paymentModal.state === 'success' && (
                                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-600"><CheckCircle size={32} /></span>
                            )}
                            {paymentModal.state === 'failed' && (
                                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"><XCircle size={32} /></span>
                            )}
                            {paymentModal.state === 'processing' && (
                                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]"><Loader2 size={32} className="animate-spin" /></span>
                            )}
                        </div>
                        <p className="rv-kicker">VibeTokens checkout</p>
                        <h3 className="mt-3 text-xl font-semibold text-[var(--text-main)]">
                            {paymentModal.state === 'success'
                                ? 'Payment Successful'
                                : paymentModal.state === 'failed'
                                ? 'Payment Failed'
                                : 'Processing Payment'}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{paymentModal.message}</p>
                        {paymentModal.state === 'processing' && (
                            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                Verifying with Razorpay every 5 seconds
                            </p>
                        )}
                        {paymentModal.state === 'failed' && (
                            <button
                                onClick={() => { stopPolling(); setPaymentModal(null); }}
                                className="rv-button-primary mt-6 px-5"
                            >
                                Try Again
                            </button>
                        )}
                        {paymentModal.state === 'success' && (
                            <button
                                onClick={() => { stopPolling(); setPaymentModal(null); }}
                                className="rv-button-primary mt-6 px-5"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
