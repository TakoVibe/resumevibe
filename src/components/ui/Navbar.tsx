import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrandSwitcher } from '../brand/BrandSwitcher';
import { ChevronDown, FileText, LogIn, LogOut, Sparkles, User, Wallet, Zap } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useToken } from '../../context/TokenContext';
import { WhyMenu } from './WhyMenu';
export { ThemeToggle };

interface NavbarProps {
    children?: React.ReactNode;
    showBrandOnly?: boolean;
}

export function Navbar({ children }: NavbarProps) {
    const { user, isAuthenticated, logout } = useAuth();
    const { tokenBalance } = useToken();
    const [showUserMenu, setShowUserMenu] = useState(false);

    return (
        <nav className="sticky top-0 z-[60] flex h-16 items-center gap-2 border-b border-[var(--border-color)] bg-[var(--glass-bg-strong)] px-2 text-[var(--text-main)] backdrop-blur-xl transition-colors duration-300 sm:gap-3 sm:px-4 md:px-6">

            {/* ── Zone 1: Brand (fixed left) ── */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <div className="hidden md:block"><BrandSwitcher /></div>
                <div className="md:hidden"><BrandSwitcher compact /></div>
                <div className="hidden h-5 w-px bg-[var(--border-color)] 2xl:block"></div>
                <div className="hidden 2xl:block"><WhyMenu /></div>
                <a
                    href="/ai-tools"
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-subtle)] px-2 text-[10px] font-semibold text-[var(--accent)] transition hover:-translate-y-px hover:border-[var(--accent)]/45 sm:px-3"
                    aria-label="Explore all AI tools"
                >
                    <Sparkles size={13} />
                    <span className="sm:hidden">AI</span>
                    <span className="hidden sm:inline">AI tools</span>
                </a>
            </div>

            {/* ── Zone 2: Page-specific actions (fluid center) ── */}
            {children && (
                <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
                    {children}
                </div>
            )}

            {/* ── Zone 3: Account + Theme (fixed right) ── */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">

                {isAuthenticated ? (
                    <div className="relative">
                        {/* Avatar button */}
                        <button
                            onClick={() => setShowUserMenu(v => !v)}
                            className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-xl border transition-all duration-200 bg-[var(--bg-card)] hover:bg-[var(--bg-input)] ${
                                tokenBalance <= 10
                                    ? 'border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.1)]'
                                    : 'border-[var(--border-color)]'
                            }`}
                        >
                            {/* Avatar */}
                            <div className="w-7 h-7 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-input)] flex items-center justify-center shrink-0">
                                {user?.profile_image
                                    ? <img src={user.profile_image} alt="avatar" className="w-full h-full object-cover" />
                                    : <User size={13} className="text-[var(--text-muted)]" />}
                            </div>

                            {/* Name + token count */}
                            <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
                                <span className="text-[10px] font-semibold text-[var(--text-main)] max-w-[56px] truncate leading-none">
                                    {user?.first_name || 'Me'}
                                </span>
                                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold tabular-nums leading-none ${
                                    tokenBalance <= 10 ? 'text-orange-500' : 'text-[var(--accent)]'
                                }`}>
                                    <Zap size={8} fill="currentColor" />{tokenBalance}
                                </span>
                            </div>

                            <ChevronDown
                                size={11}
                                className={`text-[var(--text-muted)] transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {/* Dropdown */}
                        {showUserMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                                <div className="absolute right-0 top-full mt-2 w-60 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden">

                                    {/* User info header */}
                                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-input)]">
                                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-[var(--border-color)] shrink-0 flex items-center justify-center bg-[var(--bg-card)]">
                                            {user?.profile_image
                                                ? <img src={user.profile_image} alt="avatar" className="w-full h-full object-cover" />
                                                : <User size={18} className="text-[var(--text-muted)]" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold truncate">{user?.first_name} {user?.last_name}</p>
                                            <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
                                        </div>
                                    </div>

                                    {/* Token balance row */}
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
                                        <div className="flex items-center gap-2">
                                            <Zap size={13} className={tokenBalance <= 10 ? 'text-orange-500' : 'text-[var(--accent)]'} fill="currentColor" />
                                            <span className="text-xs font-bold">{tokenBalance} <span className="text-[var(--text-muted)] font-normal">tokens</span></span>
                                        </div>
                                        <a
                                            href="/buy-tokens"
                                            onClick={() => setShowUserMenu(false)}
                                            className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors"
                                        >
                                            Top Up
                                        </a>
                                    </div>

                                    {/* Nav links */}
                                    <div className="p-1.5 flex flex-col gap-0.5">
                                        {[
                                            { href: '/profile',        icon: <User size={14} />,     label: 'My Profile',      color: 'text-[var(--accent)]' },
                                            { href: '/profile',        icon: <FileText size={14} />, label: 'Manage Resumes',  color: 'text-blue-500'   },
                                            { href: '/profile#tokens', icon: <Wallet size={14} />,   label: 'Token Wallet',    color: 'text-emerald-500' },
                                        ].map(item => (
                                            <a
                                                key={item.label}
                                                href={item.href}
                                                onClick={() => setShowUserMenu(false)}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-input)] transition-colors"
                                            >
                                                <span className={`${item.color}`}>
                                                    {item.icon}
                                                </span>
                                                <span className="text-xs font-semibold">{item.label}</span>
                                            </a>
                                        ))}

                                        <div className="my-1 border-t border-[var(--border-color)]" />

                                        <button
                                            onClick={() => { setShowUserMenu(false); logout(); }}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-500 w-full text-left"
                                        >
                                            <LogOut size={14} />
                                            <span className="text-xs font-semibold">Log Out</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('show-login-modal'))}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent-subtle)] rounded-lg transition-all"
                    >
                        <LogIn size={14} /> Login
                    </button>
                )}

                    <div className="hidden sm:block"><ThemeToggle /></div>
            </div>
        </nav>
    );
}
