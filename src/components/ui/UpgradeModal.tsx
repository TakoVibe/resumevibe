import React from 'react';
import { X, Zap, Check, Lock, ExternalLink } from 'lucide-react';
import { useToken } from '../../context/TokenContext';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
    const [loading, setLoading] = React.useState(false);
    const { tokenBalance, isLoading: isTokenLoading } = useToken();

    if (!isOpen) return null;

    const handlePurchase = () => {
        setLoading(true);
        onClose();
        window.location.href = '/buy-tokens';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="rv-modal-backdrop absolute inset-0" onClick={onClose} />
            <div className="rv-modal relative w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]"
                    aria-label="Close token dialog"
                >
                    <X size={20} />
                </button>

                <div className="p-8 pb-6 text-center">
                    <div className="rv-icon-tile mx-auto mb-5 h-14 w-14">
                        <Zap size={24} />
                    </div>
                    <p className="rv-kicker">Token balance</p>
                    <h2 className="mb-2 mt-1 font-serif-ed text-3xl text-[var(--text-main)]">More tokens required</h2>
                    <p className="text-[var(--text-muted)] text-sm mb-2">
                        You need more tokens to continue using advanced AI features like Pilot Mode and Deep Audit.
                    </p>
                    <p className="text-[var(--text-main)] text-xs font-semibold mb-6">
                        {isTokenLoading ? 'Checking your balance…' : `Your current balance: ${tokenBalance} tokens`}
                    </p>

                    <div className="rv-panel mb-6 bg-[var(--bg-input)] p-5 text-left !shadow-none">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--border-color)]">
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-main)]">Starter pack</h3>
                                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">200 VibeTokens</p>
                            </div>
                            <div className="text-right">
                                <span className="font-serif-ed text-3xl text-[var(--text-main)]">$1</span>
                                <span className="text-[var(--text-muted)] text-xs ml-1">USD</span>
                            </div>
                        </div>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                                <Check size={16} className="text-green-500 shrink-0" />
                                <span>Access to Deep Audit (30 tokens)</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                                <Check size={16} className="text-green-500 shrink-0" />
                                <span>Access to Pilot Mode (30 tokens)</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                                <Check size={16} className="text-green-500 shrink-0" />
                                <span>No expiration date</span>
                            </li>
                        </ul>
                    </div>

                    <button
                        onClick={handlePurchase}
                        disabled={loading}
                        className="rv-button-primary w-full"
                    >
                        {loading ? 'Processing...' : (
                            <>
                                Buy 200 Tokens <ExternalLink size={16} />
                            </>
                        )}
                    </button>
                    
                    <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-[var(--text-muted)]">
                        <Lock size={12} /> Secure checkout using Razorpay
                    </p>
                </div>
            </div>
        </div>
    );
}
