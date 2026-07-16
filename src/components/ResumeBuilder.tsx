import { useState, useEffect } from 'react';
import { useResume } from '../hooks/useResume';
import { ResumePreview } from './ResumePreview';
import { Save, Download, FileText, Globe, History, Loader2, Edit, Check, Eye, Trash2, Zap, LogIn, RotateCcw, ChevronDown, User, LogOut, Sparkles, UserCheck, Lock, X, Moon, Sun, Mail } from 'lucide-react';
import { LoginModal } from './ui/LoginModal';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '../context/ThemeContext';
import { TextPreview } from './parser/TextPreview';
import { EditorToolbar } from './ui/EditorToolbar';
import { Logo } from './ui/Logo';
import { Navbar, ThemeToggle } from './ui/Navbar';

import { PersonalInfoModal } from './editor/PersonalInfoModal';
import { ResumeProvider } from '../context/ResumeContext';
import { BrandSwitcher } from './brand/BrandSwitcher';
import { CareerInsights } from './brand/CareerInsights';
import { SuccessModal } from './brand/SuccessModal';
import OptimizeResumeModal from './OptimizeResumeModal';
import { ImportResumeModal } from './ImportResumeModal';
import { SectionTypeDialog } from './ui/SectionTypeDialog';
import { RecruiterPanel } from './RecruiterPanel';
import { ShareModal } from './ShareModal';
import { CareerGuidanceModal } from './editor/CareerGuidanceModal';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { TokenProvider } from '../context/TokenContext';
import { GoogleLogin } from './GoogleLogin';
import { api } from '../lib/api';
import { LoadingScreen } from './ui/LoadingScreen';
import { useToken } from '../context/TokenContext';
import { UpgradeModal } from './ui/UpgradeModal';
import { TailoredApplicationReview } from './TailoredApplicationReview';
import { StandaloneCoverLetterModal } from './StandaloneCoverLetterModal';
import { RESUME_MARGIN_PADDING, SINGLE_PAGE_PADDING, resolveResumeMarginKey } from '../lib/resumeLayout';

function ResumeBuilderContent() {
    const { data, updateResume, resetToDefault, isLoaded, undo, redo, saveToBackend, saveVersionToBackend, isSaving, lastSaved, resumeMetadata, setResumeMetadata } = useResume();
    const { user, isAuthenticated, logout } = useAuth();
    const { showUpgradeModal, setShowUpgradeModal } = useToken();
    const [showMoreActions, setShowMoreActions] = useState(false);
    const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'parser'>('editor');
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showOptimizeModal, setShowOptimizeModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showSectionTypeModal, setShowSectionTypeModal] = useState(false);
    const [showRecruiterAI, setShowRecruiterAI] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showGuidanceModal, setShowGuidanceModal] = useState(false);
    const [showAutoOptimize, setShowAutoOptimize] = useState(false);
    const [showTailoredApplication, setShowTailoredApplication] = useState(false);
    const [showCoverLetterGenerator, setShowCoverLetterGenerator] = useState(false);
    const [guidanceInsights, setGuidanceInsights] = useState<Array<{ type: 'good' | 'warning' | 'info'; text: string }>>([]);
    const [guidanceAuditResult, setGuidanceAuditResult] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [lastDownloadedFile, setLastDownloadedFile] = useState('');
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isPublicView, setIsPublicView] = useState(false);

    // Close login modal when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            setShowLoginModal(false);
        }
    }, [isAuthenticated]);

    // Check for public view or edit mode
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'public') {
            setIsPublicView(true);
        }

        const editResumeName = params.get('edit');
        if (editResumeName && isAuthenticated) {
            loadResume(editResumeName);
        }
    }, [isAuthenticated]);

    const loadResume = async (slug: string) => {
        try {
            const response = await api.get(`/api/resumes/${slug}/`);
            if (response.ok) {
                const resume = await response.json();
                updateResume(resume.resume_data);
                setResumeMetadata({
                    id: resume.id,
                    slug: resume.slug,
                    name: resume.resume_name,
                    isPublic: resume.is_public
                });
            }
        } catch (error) {
            console.error("Failed to load resume:", error);
        }
    };

    // Auto-generate PDF preview when switching to 'preview' tab
    useEffect(() => {
        if (activeTab === 'preview') {
            generatePdfPreview();
        }
    }, [activeTab, data]); // Re-generate if data changes while in preview

    // Handle Undo/Redo keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const active = document.activeElement as HTMLElement;
            const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (isInput) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    if (!isLoaded) return <LoadingScreen message="Unlocking your professional potential..." />;

    if (isPublicView) {
        return (
            <div className="min-h-screen bg-[var(--bg-main)] py-8 px-4 flex flex-col items-center">
                <div className="w-full max-w-4xl">
                    <div className="hidden md:block print:block">
                        <ResumePreview
                            data={data}
                            id="public-resume-view-desktop"
                            isEditable={false}
                            viewMode="desktop"
                        />
                    </div>
                    <div className="block md:hidden print:hidden w-full">
                        <ResumePreview
                            data={data}
                            id="public-resume-view-mobile"
                            isEditable={false}
                            viewMode="mobile"
                        />
                    </div>
                </div>

                {/* Professional Badge */}
                <div
                    className="mt-12 group flex items-center gap-3 px-6 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl transition-all"
                >
                    <div className="flex flex-col items-start translate-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">Verified View</span>
                        <span className="text-sm font-black text-[var(--text-main)] tracking-tight">Professional Resume</span>
                    </div>
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg shadow-lg">
                        <UserCheck size={16} className="text-white" />
                    </div>
                </div>
            </div>
        );
    }

    const generatePdfPayload = async () => {
        const element = document.getElementById('resume-preview-for-generation');
        if (!element) return null;

        // Explicitly fetch the print/export CSS used by Puppeteer.
        let resumeCss = '';
        try {
            const cssRes = await fetch('/resume.css');
            if (cssRes.ok) {
                resumeCss = await cssRes.text();
            } else {
                console.error('Failed to fetch resume.css');
            }
            const singlePageCssRes = await fetch('/single-page-resume.css');
            if (singlePageCssRes.ok) {
                resumeCss += `\n${await singlePageCssRes.text()}`;
            }
        } catch (e) {
            console.error('Error fetching resume.css:', e);
        }

        const html = element.outerHTML;

        const isSinglePageMode = data.config?.documentMode === 'singlePage';
        const marginKey = resolveResumeMarginKey(data.config?.margins, isSinglePageMode);
        const standardPageMargin = RESUME_MARGIN_PADDING[marginKey];
        const continuationTopPadding = SINGLE_PAGE_PADDING[marginKey].continuationTop;
        const firstPageBottomPadding = SINGLE_PAGE_PADDING[marginKey].firstPageBottom;
        const pageRules = isSinglePageMode
            ? `
                @page { margin: ${continuationTopPadding} 0 0 0 !important; size: A4; }
                @page :first { margin: 0 0 ${firstPageBottomPadding} 0 !important; }
            `
            : `@page { margin: ${standardPageMargin} !important; size: A4; }`;

        const dynamicStyles = `
            <style>
                ${pageRules}
                body { background: white !important; }
                #resume-preview-content, #resume-preview-for-generation { 
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 100% !important;
                    box-shadow: none !important;
                }
            </style>
        `.replace(/\s+/g, ' ').trim();

        return { html: dynamicStyles + html, css: resumeCss };
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
            const filename = `Resume_${data.personalInfo.fullName.replace(/\s+/g, '_')}.pdf`;
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setLastDownloadedFile(filename);
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Error downloading PDF:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!isAuthenticated) {
            setShowLoginModal(true);
            return;
        }
        await saveToBackend();
    };

    const handleSaveVersion = async () => {
        if (!isAuthenticated) {
            setShowLoginModal(true);
            return;
        }
        await saveVersionToBackend();
    };

    const generatePdfPreview = async () => {
        try {
            // Small delay to allow render
            await new Promise(resolve => setTimeout(resolve, 100));

            const payload = await generatePdfPayload();
            if (!payload) return;

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to generate preview');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
        } catch (error) {
            console.error('Error generating preview:', error);
        }
    };

    const handleAddSectionType = (type: string, label?: string) => {
        // Standard sections map to keys in visibleSections
        const standardSections = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'openSource', 'achievements'];

        let shouldCreateCustom = false;
        let sectionTitle = label || "New Section";

        if (standardSections.includes(type)) {
            // Check if it's already visible
            if (data.visibleSections[type as keyof typeof data.visibleSections]) {
                // Already visible? Treat as request for duplicate via custom section
                shouldCreateCustom = true;
            } else {
                // Enable the standard section
                const newVisible = { ...data.visibleSections, [type]: true };
                let newOrder = [...data.sectionOrder];
                if (!newOrder.includes(type)) {
                    newOrder.push(type);
                }

                updateResume({
                    ...data,
                    visibleSections: newVisible,
                    sectionOrder: newOrder
                });

                // Wait for render then scroll
                setTimeout(() => {
                    const element = document.getElementById(type);
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
                return;
            }
        } else if (type === 'custom') {
            shouldCreateCustom = true;
        }

        if (shouldCreateCustom) {
            // Create custom section
            const id = `custom-${Date.now()}`;
            // Determine type
            const supportedTypes = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'openSource'];
            const sectionType = supportedTypes.includes(type) ? type : 'custom';

            const newSection = {
                id,
                title: sectionTitle,
                type: sectionType as any,
                items: sectionType === 'summary' ? [''] : []
            };
            const newCustomSections = [...(data.customSections || []), newSection];
            const newOrder = [...data.sectionOrder, id];
            const newVisible = { ...data.visibleSections, [id]: true };

            updateResume({
                ...data,
                customSections: newCustomSections,
                sectionOrder: newOrder,
                visibleSections: newVisible
            });

            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) element.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    const profileFields = [
        data.personalInfo.fullName,
        data.personalInfo.email,
        data.personalInfo.phone,
        data.personalInfo.location,
        data.personalInfo.title,
    ];
    const profileCompletion = Math.round(
        (profileFields.filter((field) => Boolean(field?.trim())).length / profileFields.length) * 100
    );
    const visibleSectionCount = Object.values(data.visibleSections || {}).filter(Boolean).length;
    const documentTitle = resumeMetadata?.name || data.personalInfo.fullName || 'Untitled resume';

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-main)] selection:bg-[var(--accent)]/20">
            {/* Hidden instance for PDF generation scraping */}
            <div className="fixed left-[-9999px] top-0 pointer-events-none opacity-0">
                <ResumePreview data={data} id="resume-preview-for-generation" />
            </div>

            {/* Focused workspace header */}
            <Navbar>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:justify-between">
                    <div className="hidden min-w-0 xl:block">
                        <p className="truncate text-sm font-semibold text-[var(--text-main)]">{documentTitle}</p>
                        <p className="text-[10px] font-medium text-[var(--text-muted)]">
                            {isSaving ? 'Saving changes…' : lastSaved ? 'All changes saved' : 'Ready to edit'}
                        </p>
                    </div>

                    <div className="flex h-9 shrink-0 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] p-1" role="tablist" aria-label="Editor views">
                        <button
                            onClick={() => setActiveTab('editor')}
                            className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-all sm:px-3 ${activeTab === 'editor' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Edit size={13} /> <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-all sm:px-3 ${activeTab === 'preview' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Eye size={13} /> <span className="hidden sm:inline">Preview</span>
                        </button>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)] disabled:opacity-50 md:w-auto md:px-3"
                            title="Save changes"
                        >
                            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            <span className="ml-1.5 hidden text-[11px] font-semibold md:inline">Save</span>
                        </button>

                        <button
                            onClick={handleDownload}
                            disabled={isGenerating}
                            className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--text-main)] px-3 text-[11px] font-semibold text-[var(--bg-main)] shadow-sm transition hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                        >
                            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            <span className="hidden sm:inline">{isGenerating ? 'Exporting…' : 'Export PDF'}</span>
                        </button>

                        <div className="relative">
                        <button
                            onClick={() => setShowMoreActions(!showMoreActions)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
                                title="More actions"
                        >
                                <ChevronDown size={16} className={`transition-transform ${showMoreActions ? 'rotate-180' : ''}`} />
                        </button>

                        {showMoreActions && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)} />
                                    <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2 shadow-2xl">
                                        <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Document actions</p>
                                        <button
                                            onClick={() => {
                                                setShowMoreActions(false);
                                                setShowImportModal(true);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"
                                        >
                                            <FileText size={15} className="text-[var(--accent)]" /> Import resume
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMoreActions(false);
                                                handleSaveVersion();
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"
                                        >
                                            <History size={15} className="text-[var(--accent)]" /> Save new version
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMoreActions(false);
                                                setShowTailoredApplication(true);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"
                                        >
                                            <Sparkles size={15} className="text-[var(--accent)]" /> Tailor application
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMoreActions(false);
                                                setShowCoverLetterGenerator(true);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"
                                        >
                                            <Mail size={15} className="text-[var(--accent)]" /> Generate cover letter
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMoreActions(false);
                                                setShowShareModal(true);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"
                                        >
                                            <Globe size={15} className="text-[var(--accent)]" /> Share resume
                                        </button>
                                        <div className="my-1 border-t border-[var(--border-color)]" />
                                        <button
                                            onClick={() => {
                                                setShowMoreActions(false);
                                                resetToDefault();
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-red-500 hover:bg-red-500/10"
                                        >
                                            <RotateCcw size={15} /> Reset document
                                        </button>
                                        <div className="mt-1 flex items-center justify-between border-t border-[var(--border-color)] px-3 pb-1 pt-2.5">
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Appearance</span>
                                            <ThemeToggle compact />
                                        </div>
                                    </div>
                            </>
                        )}
                        </div>
                    </div>
                </div>
            </Navbar>

            <main className="relative flex flex-1 items-stretch overflow-hidden bg-[var(--bg-main)]">
                {activeTab === 'editor' && (
                    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border-color)] bg-[var(--bg-card)] lg:flex xl:w-64">
                        <div className="border-b border-[var(--border-color)] px-5 py-5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Your workspace</p>
                            <h2 className="mt-1.5 truncate font-serif-ed text-2xl leading-tight text-[var(--text-main)]">{documentTitle}</h2>
                            <div className="mt-4 flex items-center justify-between text-[11px] font-medium">
                                <span className="text-[var(--text-muted)]">Profile details</span>
                                <span className="text-[var(--text-main)]">{profileCompletion}%</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-input)]">
                                <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${profileCompletion}%` }} />
                            </div>
                        </div>

                        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
                            <div>
                                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Build</p>
                                <div className="mt-2 space-y-1">
                                    <button onClick={() => setShowInfoModal(true)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--bg-input)]">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]"><User size={15} /></span>
                                        <span className="min-w-0">
                                            <span className="block text-xs font-semibold text-[var(--text-main)]">Personal details</span>
                                            <span className="block text-[10px] text-[var(--text-muted)]">Name, links and contact</span>
                                        </span>
                                    </button>
                                    <button onClick={() => setShowSectionTypeModal(true)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--bg-input)]">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]"><FileText size={15} /></span>
                                        <span className="min-w-0">
                                            <span className="block text-xs font-semibold text-[var(--text-main)]">Add a section</span>
                                            <span className="block text-[10px] text-[var(--text-muted)]">{visibleSectionCount} sections visible</span>
                                        </span>
                                    </button>
                                    <button onClick={() => setShowImportModal(true)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--bg-input)]">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]"><Download size={15} /></span>
                                        <span className="min-w-0">
                                            <span className="block text-xs font-semibold text-[var(--text-main)]">Import resume</span>
                                            <span className="block text-[10px] text-[var(--text-muted)]">Start from an existing PDF</span>
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Improve</p>
                                <button
                                    onClick={() => setShowTailoredApplication(true)}
                                    className="mt-2 w-full rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-subtle)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-sm"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-sm"><Zap size={17} /></span>
                                    <span className="mt-3 block text-sm font-semibold text-[var(--text-main)]">Tailor for a job</span>
                                    <span className="mt-1 block text-[11px] leading-relaxed text-[var(--text-muted)]">Compare against a job description and apply focused edits.</span>
                                    <span className="mt-3 block text-[10px] font-semibold text-[var(--accent)]">Create application package →</span>
                                </button>
                                <button onClick={() => setShowCoverLetterGenerator(true)} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-3 text-left transition hover:border-[var(--accent)]/35 hover:bg-[var(--bg-input)]">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]"><Mail size={15} /></span>
                                    <span className="min-w-0">
                                        <span className="block text-xs font-semibold text-[var(--text-main)]">Generate cover letter</span>
                                        <span className="block text-[10px] leading-4 text-[var(--text-muted)]">Use this resume and a job description</span>
                                    </span>
                                </button>
                                <button onClick={() => setShowRecruiterAI(true)} className="mt-2 w-full rounded-xl px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]">
                                    Run an advanced recruiter audit →
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-[var(--border-color)] px-5 py-4">
                            <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">Tip: click directly on the resume to edit. Your layout updates as you type.</p>
                        </div>
                    </aside>
                )}

                <div className="flex-1 flex flex-col relative overflow-hidden">
                    {activeTab === 'editor' && (
                        <div className="absolute inset-x-0 top-0 z-[55] hidden h-20 items-center justify-center border-b border-[var(--border-color)] bg-[var(--glass-bg-strong)] px-4 backdrop-blur-xl md:flex">
                            <EditorToolbar onAddSection={() => setShowSectionTypeModal(true)} />
                        </div>
                    )}

                    {activeTab === 'editor' && (
                        <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--glass-bg-strong)] p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
                            <button onClick={() => setShowInfoModal(true)} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"><User size={15} /> Details</button>
                            <button onClick={() => setShowSectionTypeModal(true)} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"><FileText size={15} /> Add</button>
                            <button onClick={() => setShowTailoredApplication(true)} className="flex h-11 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-[11px] font-semibold text-white"><Zap size={15} /> Tailor</button>
                        </div>
                    )}

                    {/* Mobile Top Toolbar (Unified for editing context) */}
                    {activeTab === 'editor' && (
                        <div className="sticky left-0 right-0 top-0 z-[55] border-b border-[var(--border-color)] bg-[var(--glass-bg-strong)] px-2 py-2 backdrop-blur-xl md:hidden">
                            <EditorToolbar onAddSection={() => setShowSectionTypeModal(true)} isMobile={true} />
                        </div>
                    )}
                    {activeTab === 'editor' && (
                        <div className="workspace-canvas flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto scroll-smooth pb-32 pt-3 md:pt-24" style={{ overscrollBehaviorY: 'contain' }}>
                            {/* Mobile-optimized Container - Fits Width Automatically */}
                            <div className="relative mt-2 flex w-full justify-center px-2 md:mt-8 md:w-auto md:px-0">
                                {/* Only apply transform scale on non-mobile, on mobile we use CSS Zoom or Width constraints */}
                                <div className="hidden origin-top scale-[0.88] transition-transform duration-300 md:block lg:scale-[0.9] xl:scale-[0.98] 2xl:scale-[1.04]">
                                    <ResumePreview
                                        data={data}
                                        id="resume-preview-content"
                                        isEditable={true}
                                        onUpdate={updateResume}
                                        onEditHeader={() => setShowInfoModal(true)}
                                        auditResult={guidanceAuditResult}
                                    />
                                </div>
                                {/* Mobile Specific View - Force Width to 100% and Scale via Style */}
                                <div className="block md:hidden w-full">
                                    <ResumePreview
                                        data={data}
                                        id="resume-preview-content-mobile"
                                        isEditable={true}
                                        onUpdate={updateResume}
                                        onEditHeader={() => setShowInfoModal(true)}
                                        viewMode="mobile"
                                        auditResult={guidanceAuditResult}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {showInfoModal && (
                        <PersonalInfoModal
                            data={data.personalInfo}
                            onSave={(info) => updateResume({ ...data, personalInfo: info })}
                            onClose={() => setShowInfoModal(false)}
                        />
                    )}

                    {showSuccessModal && (
                        <SuccessModal
                            fileName={lastDownloadedFile}
                            onClose={() => setShowSuccessModal(false)}
                            onViewJobs={() => {
                                setShowSuccessModal(false);
                                let keyword = data?.personalInfo?.title;
                                if (!keyword && data?.skills && data.skills.length > 0 && data.skills[0].items.length > 0) {
                                    keyword = data.skills[0].items[0];
                                }
                                if (!keyword) keyword = 'Software Developer';
                                
                                window.location.href = `/profile?tab=opportunities&keyword=${encodeURIComponent(keyword)}`;
                            }}
                        />
                    )}

                    {showOptimizeModal && (
                        <OptimizeResumeModal
                            isOpen={showOptimizeModal}
                            onClose={() => {
                                setShowOptimizeModal(false);
                                setShowAutoOptimize(false);
                            }}
                            autoOptimize={showAutoOptimize}
                            auditResult={guidanceAuditResult}
                        />
                    )}

                    {showImportModal && (
                        <ImportResumeModal
                            isOpen={showImportModal}
                            onClose={() => setShowImportModal(false)}
                            onImport={(parsedData) => updateResume(parsedData)}
                        />
                    )}

                    {showSectionTypeModal && (
                        <SectionTypeDialog
                            isOpen={showSectionTypeModal}
                            onClose={() => setShowSectionTypeModal(false)}
                            onSelect={handleAddSectionType}
                            existingSections={data.visibleSections}
                        />
                    )}

                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        resumeId={resumeMetadata?.slug || data.personalInfo.fullName.toLowerCase().replace(/\s+/g, '-')}
                        fullName={data.personalInfo.fullName}
                        username={user?.email?.split('@')[0] || 'user'}
                        isPublic={resumeMetadata?.isPublic || false}
                        onVisibilityChange={(isPublic) => {
                            if (resumeMetadata) {
                                setResumeMetadata({ ...resumeMetadata, isPublic });
                            }
                        }}
                        isAuthenticated={isAuthenticated}
                        onRequireAuth={() => setShowLoginModal(true)}
                    />

                    {showGuidanceModal && (
                        <CareerGuidanceModal
                            isOpen={showGuidanceModal}
                            onClose={() => setShowGuidanceModal(false)}
                            data={data}
                            insights={guidanceInsights}
                            auditResult={guidanceAuditResult}
                            onFixAll={() => {
                                setShowTailoredApplication(true);
                            }}
                        />
                    )}

                    {/* PDF Preview Mode */}
                    {activeTab === 'preview' && (
                        <div className="workspace-canvas flex h-full w-full justify-center overflow-y-auto p-3 md:p-8">
                            <div className="flex h-full w-full max-w-[210mm] flex-col overflow-hidden rounded-xl border border-[var(--border-color)] shadow-2xl">
                                {pdfPreviewUrl ? (
                                    <iframe
                                        src={pdfPreviewUrl}
                                        className="w-full flex-1 bg-white"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-[var(--text-main)]">
                                        <div className="text-center">
                                            <Loader2 size={48} className="animate-spin mb-4 mx-auto" />
                                            <p>Generating PDF Preview...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Parser View */}
                    {activeTab === 'parser' && (
                        <div className="w-full h-full overflow-y-auto p-4 md:p-8 bg-[var(--bg-main)]">
                            <div className="max-w-4xl mx-auto bg-[var(--bg-card)] p-6 rounded-lg shadow border border-[var(--border-color)]">
                                <TextPreview data={data} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - ATS Expert (Responsive) */}
                {/* On XL screens: Always visible as sidebar */}
                {activeTab === 'editor' && showRecruiterAI && (
                    <div className="hidden xl:block h-full border-l border-[var(--border-color)]">
                        <RecruiterPanel
                            data={data}
                            onUpdateJD={(jd) => updateResume({ ...data, targetJD: jd })}
                            onOpenGuidance={(insights, auditResult) => {
                                setGuidanceInsights(insights);
                                setGuidanceAuditResult(auditResult);
                                setShowGuidanceModal(true);
                            }}
                            onOpenOptimizer={() => {
                                setShowAutoOptimize(true);
                                setShowOptimizeModal(true);
                            }}
                            onAuditResult={(result) => setGuidanceAuditResult(result)}
                            isAuthenticated={isAuthenticated}
                            onRequireAuth={() => setShowLoginModal(true)}
                            onClose={() => setShowRecruiterAI(false)}
                        />
                    </div>
                )}

                {/* On Mobile/Tablet: Slide-over Drawer */}
                {activeTab === 'editor' && showRecruiterAI && (
                    <div className="fixed inset-0 z-[70] xl:hidden">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => setShowRecruiterAI(false)}
                        />
                        {/* Drawer Panel */}
                        <div className="absolute right-0 top-0 bottom-0 w-[90%] max-w-sm bg-[var(--bg-card)] shadow-2xl animate-in slide-in-from-right duration-300 border-l border-[var(--border-color)]">
                            <div className="h-full flex flex-col">
                                <div className="flex-1 overflow-hidden relative">
                                    <RecruiterPanel
                                        data={data}
                                        onUpdateJD={(jd) => updateResume({ ...data, targetJD: jd })}
                                        onClose={() => setShowRecruiterAI(false)}
                                        onOpenGuidance={(insights, auditResult) => {
                                            setGuidanceInsights(insights);
                                            setGuidanceAuditResult(auditResult);
                                            setShowGuidanceModal(true);
                                        }}
                                        onOpenOptimizer={() => {
                                            setShowAutoOptimize(true);
                                            setShowOptimizeModal(true);
                                            setShowRecruiterAI(false);
                                        }}
                                        onAuditResult={(result) => setGuidanceAuditResult(result)}
                                        isAuthenticated={isAuthenticated}
                                        onRequireAuth={() => window.dispatchEvent(new CustomEvent('show-login-modal'))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <TailoredApplicationReview
                isOpen={showTailoredApplication}
                onClose={() => setShowTailoredApplication(false)}
            />
            <StandaloneCoverLetterModal
                isOpen={showCoverLetterGenerator}
                onClose={() => setShowCoverLetterGenerator(false)}
            />
            <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
            <LoginModal />
        </div >
    );
}

export function ResumeBuilder() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <TokenProvider>
                    <ResumeProvider>
                        <ResumeBuilderContent />
                        <Toaster position="bottom-center" toastOptions={{
                            style: {
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border-color)',
                            },
                        }} />
                    </ResumeProvider>
                </TokenProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
