import { useCallback, useState, useEffect, useRef } from 'react';
import { useResume } from '../hooks/useResume';
import { ResumePreview } from './ResumePreview';
import { Save, Download, FileText, Globe, History, Loader2, Edit, Check, Eye, Trash2, Zap, LogIn, RotateCcw, ChevronDown, User, LogOut, Sparkles, UserCheck, Lock, X, Moon, Sun, Mail, CircleHelp, Clipboard, BriefcaseBusiness, Target, CheckCircle2 } from 'lucide-react';
import { LoginModal } from './ui/LoginModal';
import { Toaster, toast } from 'react-hot-toast';
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
import { fetchLatestResume, resumeEditorUrl } from '../lib/resumeNavigation';
import { ProductTour, replayProductTour, type ProductTourStep } from './ui/ProductTour';
import { trackCampaignEvent } from '../lib/campaign';
import type { JobApplicationRecord } from '../types/application';
import { buildResumePdfPayload } from '../lib/pdfExport';
import { ResumeErrorBoundary } from './ui/ResumeErrorBoundary';
import { normalizeResumeData } from '../lib/normalizeResume';

const APPLICATIONS_STORAGE_KEY = 'application-copilot-records-v1';
const JOB_MATCH_HELPER_DISMISSED_KEY = 'resume-job-match-helper-dismissed-v1';

const RESUME_PRODUCT_TOUR_STEPS: ProductTourStep[] = [
    {
        id: 'welcome',
        title: 'Build your resume with confidence.',
        description: 'This quick walkthrough uses the real workspace. You will click a few controls and see exactly what each one does.',
    },
    {
        id: 'personal-details',
        title: 'Start with your details.',
        description: 'Your name, role, contact information, and professional links all live here.',
        target: '[data-tour="personal-details"]',
        advanceOn: 'target-click',
        instruction: 'Click Personal details to open the editor.',
    },
    {
        id: 'personal-details-done',
        title: 'Keep your header accurate.',
        description: 'Update anything you need in this form. Your resume preview refreshes as soon as you save it.',
        target: '[data-tour="personal-details-done"]',
        advanceOn: 'target-click',
        instruction: 'Click Done to return to your resume.',
    },
    {
        id: 'direct-editing',
        title: 'Edit directly on the page.',
        description: 'Click resume text, type your changes, and click away to save. The formatting controls above help you tune the layout.',
        target: '[data-tour="resume-summary"]',
        advanceOn: 'next',
    },
    {
        id: 'add-section',
        title: 'Add the sections you need.',
        description: 'Bring in projects, certifications, education, skills, or a custom section whenever your story needs more space.',
        target: '[data-tour="add-section"]',
        advanceOn: 'target-click',
        instruction: 'Click Add to see the available section types.',
    },
    {
        id: 'section-chooser',
        title: 'Choose a building block.',
        description: 'Selecting any card adds that section to the resume. We will leave your document unchanged during this tour.',
        target: '[data-tour="close-section-dialog"]',
        advanceOn: 'target-click',
        instruction: 'Click the close button to continue the tour.',
    },
    {
        id: 'ai-tools',
        title: 'Get focused AI assistance.',
        description: 'Open AI tools for resume review, writing help, importing, cover letters, and job-specific application support.',
        target: '[data-tour="ai-tools"]',
        advanceOn: 'next',
    },
    {
        id: 'preview',
        title: 'Check the finished document.',
        description: 'Preview shows the PDF layout your recruiter will receive before you export it.',
        target: '[data-tour="preview-resume"]',
        advanceOn: 'target-click',
        instruction: 'Click Preview to switch views.',
    },
    {
        id: 'export',
        title: 'You are ready to export.',
        description: 'When everything looks right, Export PDF creates the final file. You can replay this walkthrough anytime from More actions.',
        target: '[data-tour="export-resume"]',
        advanceOn: 'next',
    },
];

function ResumeBuilderContent() {
    const { data, updateResume, resetToDefault, isLoaded, undo, redo, saveToBackend, saveVersionToBackend, isSaving, lastSaved, resumeMetadata, setResumeMetadata } = useResume();
    const { user, isAuthenticated, logout, isLoading: isAuthLoading } = useAuth();
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
    const [pdfPreviewError, setPdfPreviewError] = useState('');
    const [lastDownloadedFile, setLastDownloadedFile] = useState('');
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isPublicView, setIsPublicView] = useState(false);
    const [isResolvingInitialResume, setIsResolvingInitialResume] = useState(true);
    const [completedApplication, setCompletedApplication] = useState<JobApplicationRecord | null>(null);
    const [showCompletionBanner, setShowCompletionBanner] = useState(false);
    const [showApplicationKit, setShowApplicationKit] = useState(false);
    const trackedCompletionRef = useRef<string | null>(null);
    const pdfPreviewUrlRef = useRef<string | null>(null);
    const pdfPreviewRequestRef = useRef(0);
    const pdfPreviewAbortRef = useRef<AbortController | null>(null);

    const openJobMatchHelper = useCallback(() => {
        setShowRecruiterAI(true);
        try {
            localStorage.removeItem(JOB_MATCH_HELPER_DISMISSED_KEY);
        } catch (error) {
            console.warn('Could not save the Job Match Helper visibility.', error);
        }
    }, []);

    const hideJobMatchHelper = useCallback(() => {
        setShowRecruiterAI(false);
        try {
            localStorage.setItem(JOB_MATCH_HELPER_DISMISSED_KEY, 'true');
        } catch (error) {
            console.warn('Could not save the Job Match Helper visibility.', error);
        }
    }, []);

    useEffect(() => {
        try {
            const wasExplicitlyDismissed = localStorage.getItem(JOB_MATCH_HELPER_DISMISSED_KEY) === 'true';
            const hasDesktopWorkspace = window.matchMedia('(min-width: 1280px)').matches;
            setShowRecruiterAI(hasDesktopWorkspace && !wasExplicitlyDismissed);
        } catch (error) {
            console.warn('Could not restore the Job Match Helper visibility.', error);
            setShowRecruiterAI(window.matchMedia('(min-width: 1280px)').matches);
        }
    }, []);

    // Close login modal when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            setShowLoginModal(false);
        }
    }, [isAuthenticated]);

    // Resolve a requested resume, or continue a returning user's most recently
    // updated resume when they arrive at the bare homepage.
    useEffect(() => {
        if (!isLoaded || isAuthLoading) return;
        let cancelled = false;

        const resolveInitialResume = async () => {
            if (!cancelled) setIsResolvingInitialResume(true);
            const params = new URLSearchParams(window.location.search);
            const isPublic = params.get('view') === 'public';
            if (isPublic) {
                if (!cancelled) {
                    setIsPublicView(true);
                    setIsResolvingInitialResume(false);
                }
                return;
            }

            const requestedSlug = params.get('edit');
            if (requestedSlug) {
                if (!isAuthenticated) {
                    if (!cancelled) setIsResolvingInitialResume(false);
                    return;
                }

                try {
                    const response = await api.get(`/api/resumes/${encodeURIComponent(requestedSlug)}/`);
                    if (response.ok) {
                        const resume = await response.json();
                        if (!cancelled) {
                            updateResume(resume.resume_data);
                            setResumeMetadata({
                                id: resume.id,
                                slug: resume.slug,
                                name: resume.resume_name,
                                isPublic: resume.is_public,
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to load resume:', error);
                } finally {
                    if (!cancelled) setIsResolvingInitialResume(false);
                }
                return;
            }

            const isExplicitNewDocument = params.has('new');
            if (isAuthenticated && !isExplicitNewDocument && window.location.pathname === '/') {
                try {
                    const latestResume = await fetchLatestResume();
                    if (latestResume?.slug && !cancelled) {
                        const requestedAITool = params.get('ai');
                        window.location.replace(resumeEditorUrl(
                            latestResume.slug,
                            requestedAITool ? { ai: requestedAITool } : undefined,
                        ));
                        return;
                    }
                } catch (error) {
                    console.error('Could not continue the latest resume:', error);
                }
            }

            if (!cancelled) setIsResolvingInitialResume(false);
        };

        resolveInitialResume();
        return () => { cancelled = true; };
    }, [isAuthLoading, isAuthenticated, isLoaded, setResumeMetadata, updateResume]);

    // A completed Job Fit flow deep-links the exact saved resume and keeps the
    // associated application assets available from the editor.
    useEffect(() => {
        if (!isLoaded || isAuthLoading || isResolvingInitialResume || isPublicView) return;
        const params = new URLSearchParams(window.location.search);
        const applicationId = params.get('application');
        if (params.get('from') !== 'job-fit' || !applicationId) return;

        try {
            const stored = JSON.parse(localStorage.getItem(APPLICATIONS_STORAGE_KEY) || '[]');
            const application = Array.isArray(stored)
                ? stored.find((item) => item?.id === applicationId)
                : null;
            if (!application) return;

            setCompletedApplication(application);
            setShowCompletionBanner(true);
            setActiveTab('editor');
            if (trackedCompletionRef.current !== applicationId) {
                trackedCompletionRef.current = applicationId;
                trackCampaignEvent('improved_resume_opened', {
                    application_id: applicationId,
                    resume_slug: application.resumeSlug,
                    resume_change_count: application.acceptedResumeChangeCount || 0,
                });
            }
        } catch (error) {
            console.error('Could not restore the completed application handoff:', error);
        }
    }, [isAuthLoading, isLoaded, isPublicView, isResolvingInitialResume]);

    // Deep links from the AI tools page open the requested workflow after the
    // correct resume has been resolved.
    useEffect(() => {
        if (!isLoaded || isAuthLoading || isResolvingInitialResume || isPublicView) return;
        const requestedAITool = new URLSearchParams(window.location.search).get('ai');
        if (!requestedAITool) return;

        if (requestedAITool === 'audit') {
            openJobMatchHelper();
            return;
        }
        if (requestedAITool === 'cover-letter') {
            setShowCoverLetterGenerator(true);
            return;
        }
        if (requestedAITool === 'import') {
            setShowImportModal(true);
            return;
        }
        if (requestedAITool === 'writing') {
            setActiveTab('editor');
            window.setTimeout(() => {
                document.getElementById('summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 350);
        }
    }, [isAuthLoading, isLoaded, isPublicView, isResolvingInitialResume, openJobMatchHelper]);

    // Generate the same canonical PDF used by Export, while cancelling stale work.
    useEffect(() => {
        if (activeTab !== 'preview') {
            pdfPreviewAbortRef.current?.abort();
            return;
        }

        const timer = window.setTimeout(() => void generatePdfPreview(), 150);
        return () => {
            window.clearTimeout(timer);
            pdfPreviewAbortRef.current?.abort();
        };
    }, [activeTab, data]); // Re-generate if data changes while in preview

    useEffect(() => () => {
        pdfPreviewAbortRef.current?.abort();
        if (pdfPreviewUrlRef.current) window.URL.revokeObjectURL(pdfPreviewUrlRef.current);
    }, []);

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

    const prepareProductTourStep = useCallback((nextIndex: number) => {
        setShowMoreActions(false);
        setShowOptimizeModal(false);
        setShowImportModal(false);
        setShowShareModal(false);
        setShowGuidanceModal(false);
        setShowCoverLetterGenerator(false);
        setShowInfoModal(nextIndex === 2);
        setShowSectionTypeModal(nextIndex === 5);
        setActiveTab(nextIndex === 8 ? 'preview' : 'editor');
    }, []);

    const handleProductTourStart = useCallback(() => {
        prepareProductTourStep(0);
        setShowSuccessModal(false);
        setShowTailoredApplication(false);
    }, [prepareProductTourStep]);

    const handleProductTourEnd = useCallback((reason: 'completed' | 'skipped') => {
        setShowInfoModal(false);
        setShowSectionTypeModal(false);
        if (reason === 'skipped') setActiveTab('editor');
    }, []);

    if (!isLoaded || isAuthLoading || isResolvingInitialResume) {
        return <LoadingScreen message={isAuthenticated ? 'Opening your latest resume...' : 'Unlocking your professional potential...'} />;
    }

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
        return buildResumePdfPayload(element, data);
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
            window.setTimeout(() => window.URL.revokeObjectURL(url), 1_000);

            setLastDownloadedFile(filename);
            setShowSuccessModal(true);
            if (completedApplication) {
                trackCampaignEvent('tailored_resume_exported', {
                    application_id: completedApplication.id,
                    resume_slug: completedApplication.resumeSlug,
                });
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('PDF export failed. Please try again.');
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
        const requestId = ++pdfPreviewRequestRef.current;
        pdfPreviewAbortRef.current?.abort();
        const controller = new AbortController();
        pdfPreviewAbortRef.current = controller;
        setPdfPreviewError('');

        try {
            const payload = await generatePdfPayload();
            if (!payload) return;

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            if (!response.ok) throw new Error('Failed to generate preview');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            if (controller.signal.aborted || requestId !== pdfPreviewRequestRef.current) {
                window.URL.revokeObjectURL(url);
                return;
            }

            if (pdfPreviewUrlRef.current) window.URL.revokeObjectURL(pdfPreviewUrlRef.current);
            pdfPreviewUrlRef.current = url;
            setPdfPreviewUrl(url);
        } catch (error) {
            if (controller.signal.aborted) return;
            console.error('Error generating preview:', error);
            if (requestId === pdfPreviewRequestRef.current) {
                setPdfPreviewError('The PDF preview could not be generated. Your resume is still safe.');
            }
        }
    };

    const handleFixFormatting = () => {
        const repairedData = normalizeResumeData(data);
        const formattingChanged = JSON.stringify(repairedData) !== JSON.stringify(data);

        setShowMoreActions(false);
        if (formattingChanged) {
            updateResume(repairedData);
            toast.success('Formatting fixed. Your wording and valid inline styles were preserved.');
            return;
        }

        if (activeTab === 'preview') void generatePdfPreview();
        toast.success('No formatting problems found. The document is already clean.');
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
                    <div className="hidden min-w-0 2xl:block">
                        <p className="truncate text-sm font-semibold text-[var(--text-main)]">{documentTitle}</p>
                        <p className="text-[10px] font-medium text-[var(--text-muted)]">
                            {isSaving ? 'Saving changes…' : lastSaved ? 'All changes saved' : 'Ready to edit'}
                        </p>
                    </div>

                    <div className="flex h-9 shrink-0 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] p-1" role="tablist" aria-label="Editor views">
                        <button
                            id="editor-view-tab"
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'editor'}
                            aria-controls="editor-view-panel"
                            tabIndex={activeTab === 'editor' ? 0 : -1}
                            onClick={() => setActiveTab('editor')}
                            onKeyDown={(event) => {
                                if (event.key === 'ArrowRight' || event.key === 'End') {
                                    event.preventDefault();
                                    setActiveTab('preview');
                                    document.getElementById('preview-view-tab')?.focus();
                                }
                            }}
                            className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-all sm:px-3 ${activeTab === 'editor' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Edit size={13} /> <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                            id="preview-view-tab"
                            data-tour="preview-resume"
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'preview'}
                            aria-controls="preview-view-panel"
                            tabIndex={activeTab === 'preview' ? 0 : -1}
                            onClick={() => setActiveTab('preview')}
                            onKeyDown={(event) => {
                                if (event.key === 'ArrowLeft' || event.key === 'Home') {
                                    event.preventDefault();
                                    setActiveTab('editor');
                                    document.getElementById('editor-view-tab')?.focus();
                                }
                            }}
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
                            data-tour="export-resume"
                            onClick={handleDownload}
                            disabled={isGenerating}
                            className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--text-main)] px-3 text-[11px] font-semibold text-[var(--bg-main)] shadow-sm transition hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                        >
                            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            <span className="hidden sm:inline">{isGenerating ? 'Exporting…' : 'Export PDF'}</span>
                        </button>

                        <button
                            onClick={() => setShowCoverLetterGenerator(true)}
                            className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-2 text-[11px] font-semibold text-[var(--text-main)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)] sm:px-3"
                            title="Generate cover letter (30 tokens)"
                        >
                            <Mail size={14} className="text-[var(--accent)]" />
                            <span className="hidden sm:inline">Cover letter</span>
                        </button>

                        <button
                            onClick={() => setShowShareModal(true)}
                            className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-2 text-[11px] font-semibold text-[var(--text-main)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)] sm:px-3"
                            title="Share resume"
                        >
                            <Globe size={14} className="text-[var(--accent)]" />
                            <span className="hidden sm:inline">Share</span>
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
                                            onClick={handleFixFormatting}
                                            className="flex w-full items-center gap-3 rounded-xl bg-[var(--accent-subtle)] px-3 py-2.5 text-left text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                                        >
                                            <Sparkles size={15} /> Fix formatting
                                        </button>
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
                                        {completedApplication && (
                                            <button
                                                onClick={() => {
                                                    setShowMoreActions(false);
                                                    setShowApplicationKit(true);
                                                }}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"
                                            >
                                                <BriefcaseBusiness size={15} className="text-[var(--accent)]" /> Open application kit
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setShowMoreActions(false);
                                                window.location.href = '/application-copilot';
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"
                                        >
                                            <Sparkles size={15} className="text-[var(--accent)]" /> Tailor application
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowMoreActions(false);
                                                replayProductTour();
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"
                                        >
                                            <CircleHelp size={15} className="text-[var(--accent)]" /> Replay walkthrough
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

            {completedApplication && showCompletionBanner && (
                <section className="relative z-[58] border-b border-green-500/25 bg-green-500/10 px-3 py-3 sm:px-5" aria-label="Tailored resume saved">
                    <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500/15 text-green-700 dark:text-green-400">
                            <CheckCircle2 size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[var(--text-main)]">
                                {completedApplication.acceptedResumeChangeCount
                                    ? `Resume tailored${completedApplication.role ? ` for ${completedApplication.role}` : ''}`
                                    : 'Application kit saved—your resume sections were left unchanged'}
                            </p>
                            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                                {completedApplication.acceptedResumeChangeCount
                                    ? `${completedApplication.acceptedResumeChangeCount} approved resume update${completedApplication.acceptedResumeChangeCount === 1 ? '' : 's'} saved to this exact document.`
                                    : 'Your recruiter message, interview preparation, and any approved cover letter are available in the application kit.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setActiveTab('editor')} className="rv-button-secondary px-3 py-2 text-[10px]"><Edit size={13} /> Review resume</button>
                            <button type="button" onClick={() => setShowApplicationKit(true)} className="rv-button-secondary px-3 py-2 text-[10px]"><BriefcaseBusiness size={13} /> Application kit</button>
                            <button type="button" onClick={() => void handleDownload()} disabled={isGenerating} className="rv-button-primary px-3 py-2 text-[10px]"><Download size={13} /> Export PDF</button>
                            <button type="button" onClick={() => setShowCompletionBanner(false)} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card)]" aria-label="Dismiss tailored resume notice"><X size={14} /></button>
                        </div>
                    </div>
                </section>
            )}

            <main className="relative flex flex-1 items-stretch overflow-hidden bg-[var(--bg-main)]">
                {activeTab === 'editor' && (
                    <aside
                        data-layout="workspace-sidebar"
                        className={`w-60 shrink-0 flex-col border-r border-[var(--border-color)] bg-[var(--bg-card)] xl:w-64 ${showRecruiterAI ? 'hidden' : 'hidden lg:flex'}`}
                    >
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
                                    <button data-tour="personal-details" onClick={() => setShowInfoModal(true)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--bg-input)]">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]"><User size={15} /></span>
                                        <span className="min-w-0">
                                            <span className="block text-xs font-semibold text-[var(--text-main)]">Personal details</span>
                                            <span className="block text-[10px] text-[var(--text-muted)]">Name, links and contact</span>
                                        </span>
                                    </button>
                                    <button data-tour="add-section" onClick={() => setShowSectionTypeModal(true)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--bg-input)]">
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
                                <div className="flex items-center justify-between gap-2 px-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">AI career tools</p>
                                    <a href="/ai-tools" className="text-[9px] font-semibold text-[var(--accent)] hover:underline">View all</a>
                                </div>
                                <button
                                    onClick={() => { window.location.href = '/application-copilot'; }}
                                    className="rv-ai-home-glow mt-2 w-full rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-subtle)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:shadow-md"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-sm"><Zap size={17} /></span>
                                    <span className="mt-3 block text-sm font-semibold text-[var(--text-main)]">Your application, handled.</span>
                                    <span className="mt-1 block text-[11px] leading-relaxed text-[var(--text-muted)]">Paste the job. We’ll prepare the resume edits and cover letter—you just approve.</span>
                                    <span className="mt-3 block text-[10px] font-semibold text-[var(--accent)]">Build my application →</span>
                                </button>
                                <button onClick={() => setShowCoverLetterGenerator(true)} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-3 text-left transition hover:border-[var(--accent)]/35 hover:bg-[var(--bg-input)]">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]"><Mail size={15} /></span>
                                    <span className="min-w-0">
                                        <span className="block text-xs font-semibold text-[var(--text-main)]">Generate cover letter</span>
                                        <span className="block text-[10px] leading-4 text-[var(--text-muted)]">30 tokens · charged only on success</span>
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-[var(--border-color)] px-5 py-4">
                            <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">Tip: click directly on the resume to edit. Your layout updates as you type.</p>
                        </div>
                    </aside>
                )}

                {!showRecruiterAI && (
                    <button
                        type="button"
                        data-action="open-recruiter-panel"
                        onClick={openJobMatchHelper}
                        className={`absolute right-3 z-[59] inline-flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-card)] px-3 py-2.5 text-[11px] font-semibold text-[var(--text-main)] shadow-lg transition hover:-translate-y-0.5 hover:border-[var(--accent)]/55 hover:bg-[var(--accent-subtle)] ${activeTab === 'editor' ? 'top-24' : 'top-4'}`}
                        aria-label="Open Job Match Helper"
                    >
                        <Target size={14} className="text-[var(--accent)]" />
                        Job Match
                    </button>
                )}

                <div
                    id={activeTab === 'preview' ? 'preview-view-panel' : 'editor-view-panel'}
                    role="tabpanel"
                    aria-labelledby={activeTab === 'preview' ? 'preview-view-tab' : 'editor-view-tab'}
                    tabIndex={0}
                    data-layout="resume-editor"
                    className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
                >
                    {activeTab === 'editor' && (
                        <div className="absolute inset-x-0 top-0 z-[55] hidden h-20 items-center justify-center border-b border-[var(--border-color)] bg-[var(--glass-bg-strong)] px-4 backdrop-blur-xl md:flex">
                            <EditorToolbar
                                onAddSection={() => setShowSectionTypeModal(true)}
                                onFixFormatting={handleFixFormatting}
                            />
                        </div>
                    )}

                    {activeTab === 'editor' && (
                        <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--glass-bg-strong)] p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
                            <button data-tour="personal-details" onClick={() => setShowInfoModal(true)} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"><User size={15} /> Details</button>
                            <button data-tour="add-section" onClick={() => setShowSectionTypeModal(true)} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-input)]"><FileText size={15} /> Add</button>
                            <button onClick={() => { window.location.href = '/application-copilot'; }} className="rv-ai-home-glow flex h-11 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-[11px] font-semibold text-white"><Zap size={15} /> Job fit</button>
                        </div>
                    )}

                    {/* Mobile Top Toolbar (Unified for editing context) */}
                    {activeTab === 'editor' && (
                        <div className="sticky left-0 right-0 top-0 z-[55] border-b border-[var(--border-color)] bg-[var(--glass-bg-strong)] px-2 py-2 backdrop-blur-xl md:hidden">
                            <EditorToolbar
                                onAddSection={() => setShowSectionTypeModal(true)}
                                onFixFormatting={handleFixFormatting}
                                isMobile={true}
                            />
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
                                {pdfPreviewError ? (
                                    <div className="flex flex-1 items-center justify-center p-6 text-[var(--text-main)]">
                                        <div className="max-w-sm text-center">
                                            <CircleHelp size={42} className="mx-auto text-amber-500" />
                                            <p className="mt-4 text-sm font-semibold">Preview unavailable</p>
                                            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{pdfPreviewError}</p>
                                            <button type="button" onClick={() => void generatePdfPreview()} className="rv-button-secondary mt-5">
                                                Try preview again
                                            </button>
                                        </div>
                                    </div>
                                ) : pdfPreviewUrl ? (
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

                {/* One responsive helper instance: docked on desktop, drawer on smaller screens. */}
                {showRecruiterAI && (
                    <div
                        data-layout="recruiter-panel"
                        className="fixed inset-0 z-[70] xl:static xl:z-auto xl:h-full xl:w-[400px] xl:shrink-0 2xl:w-[420px]"
                    >
                        <button
                            type="button"
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 xl:hidden"
                            onClick={hideJobMatchHelper}
                            aria-label="Hide Job Match Helper"
                        />
                        <div className="absolute inset-y-0 right-0 w-[90%] max-w-sm border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl xl:relative xl:inset-auto xl:h-full xl:w-full xl:max-w-none">
                            <RecruiterPanel
                                data={data}
                                onUpdateJD={(jd) => updateResume({ ...data, targetJD: jd })}
                                onClose={hideJobMatchHelper}
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
                            />
                        </div>
                    </div>
                )}
            </main>

            <ProductTour
                steps={RESUME_PRODUCT_TOUR_STEPS}
                onStart={handleProductTourStart}
                onStepChange={prepareProductTourStep}
                onEnd={handleProductTourEnd}
            />

            {completedApplication && showApplicationKit && (
                <ApplicationKitDialog
                    application={completedApplication}
                    onClose={() => setShowApplicationKit(false)}
                />
            )}

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

function ApplicationKitDialog({ application, onClose }: { application: JobApplicationRecord; onClose: () => void }) {
    const copy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied.`);
        } catch {
            toast.error(`Could not copy ${label.toLowerCase()}.`);
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="application-kit-title">
                <header className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] p-5 sm:p-7">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="rv-icon-tile h-11 w-11 shrink-0"><BriefcaseBusiness size={18} /></span>
                        <div className="min-w-0">
                            <p className="rv-kicker">Saved application kit</p>
                            <h2 id="application-kit-title" className="mt-1 truncate font-serif-ed text-3xl text-[var(--text-main)] sm:text-4xl">
                                {application.role || 'Target role'}{application.company ? ` · ${application.company}` : ''}
                            </h2>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">Everything here is connected to the resume currently open in the editor.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--bg-input)]" aria-label="Close application kit"><X size={18} /></button>
                </header>

                <div className="grid gap-4 overflow-y-auto bg-[var(--bg-main)] p-5 sm:p-7 md:grid-cols-2">
                    <ApplicationKitAsset icon={Mail} title="Cover letter">
                        {application.coverLetter ? (
                            <>
                                <p className="max-h-56 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-[var(--text-muted)]">{application.coverLetter}</p>
                                <button type="button" onClick={() => void copy(application.coverLetter || '', 'Cover letter')} className="rv-button-secondary mt-4 w-full"><Clipboard size={14} /> Copy cover letter</button>
                            </>
                        ) : <p className="text-xs text-[var(--text-muted)]">The cover letter proposal was not approved.</p>}
                    </ApplicationKitAsset>

                    <ApplicationKitAsset icon={BriefcaseBusiness} title="Recruiter message">
                        <p className="text-xs leading-6 text-[var(--text-muted)]">{application.recruiterMessage || 'No recruiter message is available.'}</p>
                        {application.recruiterMessage && <button type="button" onClick={() => void copy(application.recruiterMessage || '', 'Recruiter message')} className="rv-button-secondary mt-4 w-full"><Clipboard size={14} /> Copy message</button>}
                    </ApplicationKitAsset>

                    <ApplicationKitAsset icon={Target} title="Interview preparation" wide>
                        <div className="space-y-3 text-xs leading-5 text-[var(--text-muted)]">
                            {(application.interviewQuestions || []).map((question, index) => <p key={`${index}-${question}`}><strong className="text-[var(--text-main)]">{index + 1}.</strong> {question}</p>)}
                        </div>
                    </ApplicationKitAsset>
                </div>
            </section>
        </div>
    );
}

function ApplicationKitAsset({ icon: Icon, title, wide = false, children }: { icon: typeof Mail; title: string; wide?: boolean; children: React.ReactNode }) {
    return (
        <article className={`rv-panel p-5 !shadow-none sm:p-6 ${wide ? 'md:col-span-2' : ''}`}>
            <div className="flex items-center gap-3"><span className="rv-icon-tile h-9 w-9"><Icon size={15} /></span><h3 className="font-serif-ed text-2xl text-[var(--text-main)]">{title}</h3></div>
            <div className="mt-4">{children}</div>
        </article>
    );
}

export function ResumeBuilder() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <TokenProvider>
                    <ResumeProvider>
                        <ResumeErrorBoundary>
                            <ResumeBuilderContent />
                        </ResumeErrorBoundary>
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
