import React, { useState } from 'react';
import { ResumePreview } from '../../components/ResumePreview';
import { Providers } from '../../components/Providers';
import { Footer } from '../ui/Footer';
import { Logo } from '../ui/Logo';
import { Download, Loader2, ArrowRight } from 'lucide-react';
import { normalizeResumeData } from '../../lib/normalizeResume';
import { buildResumePdfPayload } from '../../lib/pdfExport';

interface PublicResumeContentProps {
    resumeData: any;
}

export function PublicResumeContent({ resumeData }: PublicResumeContentProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const safeResumeData = React.useMemo(() => normalizeResumeData(resumeData), [resumeData]);

    React.useEffect(() => {
        const checkMobile = () => {
            setViewMode(window.innerWidth < 1024 ? 'mobile' : 'desktop');
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const generatePdfPayload = async () => {
        const element = document.getElementById('resume-preview-for-generation');
        if (!element) return null;
        return buildResumePdfPayload(element, safeResumeData);
    };

    const handleDownload = async () => {
        try {
            setIsGenerating(true);
            const payload = await generatePdfPayload();
            if (!payload) throw new Error('Could not find resume element');

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to generate PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const filename = `Resume_${safeResumeData.personalInfo.fullName.replace(/\s+/g, '_')}.pdf`;
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Providers>
            {/* Hidden instance for PDF generation scraping */}
            <div className="fixed left-[-9999px] top-0 pointer-events-none opacity-0">
                <ResumePreview data={safeResumeData} id="resume-preview-for-generation" />
            </div>

            <div className="w-full max-w-5xl mx-auto py-4 md:py-8 px-0 md:px-4 animate-in fade-in duration-700">
                {/* Minimal Floating Download Button */}
                <div className="fixed top-6 right-6 z-50 no-print">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="group flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-[var(--border-color)] text-[var(--text-main)] rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-[var(--text-main)] hover:text-white transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95 disabled:opacity-50"
                        title="Download PDF"
                    >
                        {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Download'}</span>
                    </button>
                </div>

                {/* Professional Resume Paper Presentation */}
                <div className="bg-white shadow-[0_10px_60px_rgba(0,0,0,0.08)] rounded-sm overflow-hidden border border-[var(--border-color)]/20 transition-all duration-700">
                    <ResumePreview
                        data={safeResumeData}
                        id="public-resume-view"
                        isEditable={false}
                        viewMode={viewMode}
                    />
                </div>

                {/* Subtle Divider - Tightened Spacing */}
                <div className="mt-12 mb-8 border-t border-[var(--border-color)]/20 no-print mx-auto w-48" />

                {/* Natural Next Step CTA */}
                <div className="text-center no-print pb-24 px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex flex-col items-center">
                        <h3 className="text-lg md:text-xl font-bold text-[var(--text-main)] mb-1 tracking-tight">
                            Want a resume like this?
                        </h3>
                        <p className="text-[var(--text-muted)] text-[13px] mb-8 font-medium opacity-70">
                            Build yours with ResumeVibe
                        </p>

                        <div className="flex flex-col items-center gap-5 mb-10">
                            <a
                                href="/"
                                className="group relative inline-flex items-center gap-3 px-8 py-3.5 bg-[var(--text-main)] text-[var(--bg-main)] rounded-lg font-bold uppercase tracking-[0.2em] text-[10px] hover:opacity-90 active:scale-[0.98] transition-all shadow-sm border border-[var(--border-color)]"
                            >
                                <span>Create My Resume</span>
                                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </a>

                            <div className="flex flex-col gap-2 italic">
                                <a href="/why-resumevibe" className="text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] underline underline-offset-4 decoration-[var(--border-color)] transition-colors">
                                    See how it works
                                </a>
                                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-30 not-italic">
                                    No credit card required
                                </span>
                            </div>
                        </div>

                        {/* Intentional "Powered By" Badge - Replaced by Footer */}
                    </div>
                </div>
                <Footer />
            </div>
        </Providers>
    );
}
