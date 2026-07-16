import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Globe, History, Zap, ShieldCheck } from 'lucide-react';

export function WhyMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const features = [
        {
            title: 'Personalized Public URL',
            description: 'Get a professional slug like /resume/name-title',
            icon: <Globe className="h-4 w-4" />,
            highlight: true
        },
        {
            title: 'Up to 10 History Versions',
            description: 'Save and restore points in time comfortably',
            icon: <History className="h-4 w-4" />,
            highlight: true
        },
        {
            title: 'AI Deep Audit',
            description: 'Real-time recruiter-level analysis of your resume',
            icon: <Zap className="h-4 w-4" />
        },
        {
            title: 'ATS-Proof Templates',
            description: 'Tested against major applicant tracking systems',
            icon: <ShieldCheck className="h-4 w-4" />
        }
    ];

    return (
        <div className="relative hidden xl:block" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="group flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
            >
                Why ResumeVibe?
                <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} />
            </button>

            {isOpen && (
                <div className="rv-panel absolute left-0 top-full z-[100] mt-2 w-72 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 bg-[var(--bg-input)]/30 border-b border-[var(--border-color)]">
                        <h3 className="rv-kicker">Why ResumeVibe</h3>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                        {features.map((feature, idx) => (
                            <div key={idx} className="p-3 hover:bg-[var(--bg-input)] rounded-xl transition-all group/item cursor-default">
                                <div className="flex items-start gap-3">
                                    <div className="rv-icon-tile h-8 w-8">
                                        {feature.icon}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-[var(--text-main)]">{feature.title}</span>
                                            {feature.highlight && (
                                                <span className="rounded-md bg-[var(--accent-subtle)] px-1.5 py-0.5 text-[8px] font-semibold uppercase text-[var(--accent)]">Featured</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{feature.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-[var(--bg-input)]/50 border-t border-[var(--border-color)]">
                        <a
                            href="/why-resumevibe"
                            className="rv-button-primary w-full"
                        >
                            Explore All Features <Sparkles size={12} />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
