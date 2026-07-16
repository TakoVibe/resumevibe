import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ExternalLink, Sparkles, Globe } from 'lucide-react';
import { Logo } from '../ui/Logo';

interface BrandSwitcherProps {
    compact?: boolean;
}

export function BrandSwitcher({ compact = false }: BrandSwitcherProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = () => setIsOpen(!isOpen);

    const tools = [
        {
            name: 'TakoVibe Blog',
            description: 'Technical articles & career advice',
            url: 'https://takovibe.com',
            icon: <Globe className="w-4 h-4" />
        },
        {
            name: 'ResumeVibe',
            description: 'Professional resume suite',
            url: '#',
            current: true,
            icon: <Sparkles className="w-4 h-4" />
        }
    ];

    return (
        <div className="relative flex items-center gap-2 group" ref={dropdownRef}>
            <div
                className={`flex cursor-pointer items-center gap-1 rounded-xl border border-transparent px-1 py-1 transition-colors hover:border-[var(--border-color)] hover:bg-[var(--bg-input)] sm:px-1.5 ${compact ? 'md:px-1.5' : ''}`}
                onClick={toggleOpen}
            >
                <div className={`flex items-center gap-2 group/logo transition-all duration-500 ${compact ? 'hidden md:flex' : ''}`}>
                    <div className="rounded-lg border border-[var(--border-color)] bg-white p-0.5 transition-transform group-hover/logo:scale-105">
                        <Logo className="w-5 h-5" />
                    </div>
                </div>

                <div className={`flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1 sm:pr-4 text-[var(--text-main)] ${compact ? 'px-1' : ''}`}>
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-1.5">
                            <h1 className={`whitespace-nowrap font-serif-ed text-base tracking-tight sm:text-lg ${compact ? 'hidden md:block' : ''}`}>ResumeVibe</h1>
                            {compact && (
                                <div className="md:hidden shrink-0">
                                    <Logo className="h-8 w-8 rounded-lg border border-[var(--border-color)] bg-white p-0.5" />
                                </div>
                            )}
                            {/* <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 translate-y-[-1px] ${compact ? 'hidden md:block' : ''}`}>Beta</span> */}
                        </div>
                        <a
                            href="https://takovibe.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden xl:block text-[8px] font-bold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors -mt-0.5 opacity-60"
                        >
                            with love ❤️ from TakoVibe
                        </a>
                    </div>
                    <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#a78bfa]' : ''}`} />
                </div>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="rv-panel absolute left-[-12px] top-[calc(100%+10px)] z-[101] w-[calc(100vw-24px)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 md:left-0 md:w-80">
                        <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card)]/30">
                            <h2 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em] flex items-center gap-3 leading-none">
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)] shrink-0"></div>
                                <span>Ecosystem</span>
                            </h2>
                        </div>
                        <div className="p-3 space-y-1.5">
                            {tools.map((tool) => (
                                <a
                                    key={tool.name}
                                    href={tool.url}
                                    target={tool.current ? undefined : "_blank"}
                                    rel={tool.current ? undefined : "noopener noreferrer"}
                                    className={`relative group/item flex items-start gap-4 px-4 py-4 rounded-2xl transition-all duration-300 ${tool.current
                                        ? 'bg-[var(--accent-subtle)] border border-[var(--accent)]/15'
                                        : 'hover:bg-[var(--bg-input)] border border-transparent hover:border-[var(--border-color)]'
                                        }`}
                                >
                                    <div className={`rounded-xl p-2.5 transition-all duration-200 ${tool.current ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-input)] text-[var(--text-muted)] group-hover/item:text-[var(--accent)]'}`}>
                                        {tool.icon}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-[13px] font-bold tracking-tight ${tool.current ? 'text-[var(--text-main)]' : 'text-[var(--text-main)] group-hover/item:text-[var(--accent)]'}`}>
                                                {tool.name}
                                            </span>
                                            {!tool.current && <ExternalLink size={12} className="text-[var(--text-muted)] group-hover/item:translate-x-0.5 group-hover/item:translate-y-[-0.5px] transition-transform" />}
                                        </div>
                                        <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1 leading-snug opacity-70 group-hover/item:opacity-100 transition-opacity whitespace-normal">
                                            {tool.description}
                                        </p>
                                    </div>
                                    {tool.current && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 translate-x-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"></div>
                                        </div>
                                    )}
                                </a>
                            ))}
                        </div>
                        <div className="px-6 py-5 bg-[var(--bg-input)]/20 border-t border-[var(--border-color)]">
                            <a
                                href="https://takovibe.com/about"
                                className="group/about flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                            >
                                <span>The Engineering Mission</span>
                                <div className="w-6 h-6 rounded-full bg-[var(--bg-input)] flex items-center justify-center group-hover/about:bg-[var(--accent)] group-hover/about:text-white transition-all">
                                    <ChevronDown className="w-3 h-3 -rotate-90" />
                                </div>
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
