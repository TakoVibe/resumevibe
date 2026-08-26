import React from 'react';
import { AuthOnlyProviders } from '../Providers';
import { Navbar } from '../ui/Navbar';
import { Footer } from '../ui/Footer';
import { LoginModal } from '../ui/LoginModal';
import {
    Sparkles,
    Zap,
    Shield,
    Target,
    Globe,
    Cpu,
    BarChart3,
    Rocket,
    ArrowRight,
    BookOpen,
    History,
    ChevronLeft
} from "lucide-react";

export function WhyResumeVibeContent() {
    const sectionHeader = (label: string) => (
        <div className="flex items-center gap-4 mb-10">
            <h2 className="text-[10px] font-sans-ed font-black uppercase tracking-[0.26em] text-[var(--text-muted)] whitespace-nowrap">
                {label}
            </h2>
            <div className="h-px flex-1 bg-[var(--border-color)]" />
        </div>
    );

    const features = [
        {
            icon: Globe,
            title: "Personalized Public URL",
            desc: "No more messy PDF attachments. Share your live, high-performance resume via a unique slug like /resume/your-name.",
            top: true
        },
        {
            icon: History,
            title: "10-Step Version Control",
            desc: "Mistakes happen. We save up to 10 full versions of your resume so you can roll back to any previous state instantly.",
            top: true
        },
        {
            icon: Cpu,
            title: "Tailor for Any Job",
            desc: "Paste a job description, see what your resume is missing, and apply focused edits without guessing what recruiters expect.",
        },
        {
            icon: BookOpen,
            title: "One-Page Columns",
            desc: "Switch from a conventional resume to a polished one-page column layout when you need a tighter, recruiter-friendly snapshot.",
            top: true
        },
        {
            icon: BarChart3,
            title: "Deep AI Audit",
            desc: "Get a brutal, honest diagnostic of your resume from a simulated recruiter's perspective before you ever hit send.",
        },
        {
            icon: Shield,
            title: "ATS-Safe Layouts",
            desc: "Choose the format that fits the moment: classic ATS-friendly resumes or a compact one-page column resume built with clean, parseable structure.",
        },
        {
            icon: Zap,
            title: "Smart PDF Parsing",
            desc: "Import your old, messy PDF and watch our high-performance parser convert it into a structured, clean data model instantly.",
        },
    ];

    return (
        <AuthOnlyProviders>
            <Navbar>
                <div className="flex items-center gap-4">
                    <a
                        href="/"
                        className="flex items-center gap-2 px-2 md:px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors whitespace-nowrap"
                    >
                        <ChevronLeft size={16} />
                        <span className="hidden sm:inline">Back to Editor</span>
                        <span className="sm:hidden">Back</span>
                    </a>
                </div>
            </Navbar>
            <LoginModal />

            <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 selection:bg-[var(--accent-subtle)] font-sans-ed text-[var(--text-main)]">
                {/* Hero Section */}
                <header className="mb-24 max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-flex items-center gap-2 border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 mb-8 rounded-lg">
                        <Sparkles size={12} className="text-[var(--accent)]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">The New Standard</span>
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-serif-ed font-normal tracking-tight mb-8 text-[var(--text-main)] max-w-4xl">
                        Why settle for a <span className="italic text-[var(--accent)]">static</span> resume?
                    </h1>
                    <p className="text-lg lg:text-xl text-[var(--text-muted)] leading-relaxed font-medium max-w-3xl">
                        ResumeVibe isn't just a builder. It's an autonomous career
                        presentation engine designed for high-stakes engineering
                        roles where precision meets aesthetics.
                    </p>
                    <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--border-color)] max-w-4xl">
                        {['Classic ATS resume', 'One-page columns', 'Job-tailored edits'].map((item) => (
                            <div key={item} className="bg-[var(--bg-card)] px-5 py-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">{item}</p>
                            </div>
                        ))}
                    </div>
                </header>

                {/* Features Grid */}
                <section className="mb-24">
                    {sectionHeader('Active Core Features')}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feat, i) => (
                            <div
                                key={i}
                                className="group p-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-input)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 shadow-sm"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className="w-11 h-11 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center mb-7 border border-[var(--border-color)]">
                                    <feat.icon size={20} className="text-[var(--accent)]" />
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-lg font-black tracking-tight text-[var(--text-main)]">
                                        {feat.title}
                                    </h3>
                                    {feat.top && (
                                        <span className="text-[8px] font-black px-1.5 py-0.5 bg-[var(--accent-subtle)] text-[var(--accent)] rounded uppercase tracking-widest">New</span>
                                    )}
                                </div>
                                <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed">
                                    {feat.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Engine Upgrades Section */}
                <section className="mb-24">
                    {sectionHeader('Under the Hood')}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        <div className="group p-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-input)] transition-all duration-300 animate-in fade-in shadow-sm wait-200">
                            <div className="w-11 h-11 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center mb-7 border border-[var(--border-color)]">
                                <Target size={20} className="text-[var(--accent)]" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight text-[var(--text-main)] mb-3">
                                Distant Match Odds
                            </h3>
                            <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed">
                                Applying for a wildly different role? The engine calculates your exact percentage odds of selection while presenting brutal, actionable warnings about core capability gaps.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Roadmap Section */}
                <section className="mb-24">
                    <div className="p-8 lg:p-12 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden shadow-sm">
                        {sectionHeader('Roadmap: The Next Wave')}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="flex gap-6 items-start">
                                    <div className="w-11 h-11 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center shrink-0 border border-[var(--border-color)]">
                                        <Globe size={19} className="text-[var(--accent)]" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black mb-2 tracking-tight text-[var(--text-main)]">Deep Resume Analytics</h4>
                                        <p className="text-[var(--text-muted)] font-medium leading-relaxed">
                                            Track who sees your resume. Get insights on view duration, download triggers, and geographic interest.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-6 items-start">
                                    <div className="w-11 h-11 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center shrink-0 border border-[var(--border-color)]">
                                        <Rocket size={19} className="text-[var(--accent)]" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black mb-2 tracking-tight text-[var(--text-main)]">One-Click Identity Switch</h4>
                                        <p className="text-[var(--text-muted)] font-medium leading-relaxed">
                                            Instantly transform your resume's visual DNA. Toggle between minimalist, creative, and executive themes instantly.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[var(--bg-input)] rounded-lg p-8 border border-[var(--border-color)] flex flex-col justify-center items-center text-center">
                                <div className="w-16 h-16 rounded-lg bg-[var(--bg-card)] flex items-center justify-center mb-6 overflow-hidden border border-[var(--border-color)]">
                                    <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
                                </div>
                                <h3 className="text-2xl font-serif-ed font-normal mb-4 px-4 text-[var(--text-main)]">
                                    We're just getting started.
                                </h3>
                                <p className="text-sm text-[var(--text-muted)] font-medium max-w-xs leading-relaxed">
                                    Experience a resume builder that understands engineering depth. Build your next career move with unmatched precision.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* TakoVibe Ecosystem Promo */}
                <section className="mb-24">
                    <div className="relative rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] p-8 lg:p-12 overflow-hidden shadow-sm">
                        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                            <div className="flex-1 space-y-8 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)]">
                                    <Globe size={14} className="text-[var(--accent)]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">The Parent Ecosystem</span>
                                </div>
                                <h1 className="text-4xl lg:text-6xl font-serif-ed font-normal tracking-tight leading-tight mt-4 text-[var(--text-main)]">
                                    The Intelligent <br />
                                    <span className="italic text-[var(--accent)]">Knowledge Platform.</span>
                                </h1>
                                <p className="text-lg text-[var(--text-muted)] font-medium max-w-2xl leading-relaxed">
                                    Don't just read. <strong>Experience it.</strong> Transform how you learn with interactive mental models, visual code execution, and AI tutors.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left py-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[var(--text-main)] font-bold text-sm tracking-tight">
                                            <BookOpen size={18} className="text-[var(--accent)]" />
                                            High-Depth Topics
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed opacity-80">
                                            We create high-quality engineering topics. From containers to webframes, we decode the toughest concepts.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[var(--text-main)] font-bold text-sm tracking-tight">
                                            <Cpu size={18} className="text-[var(--accent)]" />
                                            Visual Execution
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed opacity-80">
                                            See the invisible. Watch code run step-by-step with real-time variable inspection and mental models.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-8">
                                    <a
                                        href="https://takovibe.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-3 px-8 py-4 bg-[var(--text-main)] text-[var(--bg-main)] rounded-lg font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all duration-300 active:scale-95"
                                    >
                                        Start Learning <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-500" />
                                    </a>
                                </div>
                            </div>

                            <div className="w-full lg:w-[360px] aspect-square relative group">
                                <div className="relative h-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg flex items-center justify-center p-12 transition-all duration-300">
                                    <div className="flex flex-col items-center">
                                        <span className="text-4xl font-serif-ed font-normal tracking-tight mb-2 text-[var(--text-main)]">TakoVibe</span>
                                        <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] mt-4">
                                            <div className="w-2 h-2 rounded-full bg-[var(--accent)]"></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Live Engineering HQ</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing / Token System */}
                <section className="mb-24">
                    {sectionHeader('VibeToken Pricing')}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="p-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
                            <h3 className="text-lg font-black mb-2 text-[var(--text-main)]">Free Tier</h3>
                            <div className="text-3xl font-black text-[var(--accent)] mb-6">
                                100 Tokens <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">on signup</span>
                            </div>
                            <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed mb-6">
                                Every new user gets 100 free VibeTokens to explore the platform. Building, formatting, and exporting your resume remains 100% free always.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-sm text-[var(--text-main)] font-medium">
                                    <Sparkles size={16} className="text-[var(--accent)] shrink-0" />
                                    <span>Free Resume Builder & Export</span>
                                </li>
                                <li className="flex items-center gap-2 text-sm text-[var(--text-main)] font-medium">
                                    <Sparkles size={16} className="text-[var(--accent)] shrink-0" />
                                    <span>100 tokens for AI Actions</span>
                                </li>
                            </ul>
                        </div>

                        <div className="p-7 rounded-lg bg-[var(--bg-card)] border border-[var(--accent)]/45 relative shadow-sm">
                            <div className="absolute top-4 right-4 bg-[var(--accent-subtle)] text-[var(--accent)] text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded border border-[var(--accent)]/20">
                                Pay as you go
                            </div>
                            <h3 className="text-lg font-black mb-2 pr-28 text-[var(--text-main)]">Starter Pack</h3>
                            <div className="text-3xl font-black text-[var(--text-main)] mb-6">
                                $1 <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">/ 200 Tokens</span>
                            </div>
                            <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed mb-6">
                                Run out of tokens? No monthly subscriptions. Refill only when you need ResumeVibe to review, tailor, or improve your resume.
                            </p>
                            <a href="/buy-tokens" className="block text-center w-full py-3 bg-[var(--text-main)] text-[var(--bg-main)] rounded-lg text-[10px] font-black uppercase tracking-[.25em] transition-all hover:opacity-90 active:scale-95 mb-4">
                                Buy Tokens
                            </a>
                        </div>

                        <div className="p-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
                            <h3 className="text-lg font-black mb-5 text-[var(--text-main)]">Action Costs</h3>
                            <ul className="divide-y divide-[var(--border-color)]">
                                <li className="flex justify-between gap-4 items-center py-3 first:pt-0">
                                    <span className="font-bold text-[var(--text-main)]">Pilot Mode</span>
                                    <span className="text-xs font-black bg-[var(--accent-subtle)] text-[var(--accent)] px-2 py-1 rounded border border-[var(--accent)]/20">30 Tokens</span>
                                </li>
                                <li className="flex justify-between gap-4 items-center py-3">
                                    <span className="font-bold text-[var(--text-main)]">Deep AI Audit</span>
                                    <span className="text-xs font-black bg-[var(--accent-subtle)] text-[var(--accent)] px-2 py-1 rounded border border-[var(--accent)]/20">30 Tokens</span>
                                </li>
                                <li className="flex justify-between gap-4 items-center py-3">
                                    <span className="font-bold text-[var(--text-main)]">Cover Letter</span>
                                    <span className="text-xs font-black bg-[var(--accent-subtle)] text-[var(--accent)] px-2 py-1 rounded border border-[var(--accent)]/20">30 Tokens</span>
                                </li>
                                <li className="flex justify-between gap-4 items-center py-3 last:pb-0">
                                    <span className="font-bold text-[var(--text-main)]">Inline Enhancements</span>
                                    <span className="text-xs font-black bg-[var(--accent-subtle)] text-[var(--accent)] px-2 py-1 rounded border border-[var(--accent)]/20">5 Tokens</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Call to Action Footer */}
                <footer className="text-center pb-20 mb-20">
                    <a
                        href="/"
                        className="inline-flex items-center gap-4 px-10 py-5 bg-[var(--text-main)] text-[var(--bg-main)] rounded-lg text-sm font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                    >
                        Build Your Edge <ArrowRight size={24} />
                    </a>
                    <p className="mt-8 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.25em]">
                        Propelled by TakoVibe Engineering Ecosystem
                    </p>
                </footer>
            </main>
            <Footer />
        </AuthOnlyProviders>
    );
}
