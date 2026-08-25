import { useEffect, useRef, useState } from 'react';
import type { ResumeSchema } from '../types/resume';
import { Header } from './resume/Header';
import { Summary } from './resume/Summary';
import { Skills } from './resume/Skills';
import { Experience } from './resume/Experience';
import { Projects } from './resume/Projects';
import { OpenSource } from './resume/OpenSource';
import { Education } from './resume/Education';
import { Achievements } from './resume/Achievements';
import { Certifications } from './resume/Certifications';
import { CustomSection } from './resume/CustomSection';
import { SectionControls } from './ui/SectionControls';
import { EditableField } from './ui/EditableField';
import { Plus, Eye, AlertTriangle } from 'lucide-react';
import { THEME_PRESETS } from '../styles/themes';
import { useTheme } from '../context/ThemeContext';
import { MOBILE_RESUME_PADDING, RESUME_MARGIN_PADDING, SINGLE_PAGE_PADDING, resolveResumeMarginKey } from '../lib/resumeLayout';

interface Props {
    data: ResumeSchema;
    id?: string;
    isEditable?: boolean;
    onUpdate?: (newData: ResumeSchema) => void;
    onEditHeader?: () => void;
    viewMode?: 'desktop' | 'mobile';

    auditResult?: any;
}

export function ResumePreview({ data, id, isEditable = false, onUpdate, onEditHeader, viewMode = 'desktop', auditResult }: Props) {
    const isMobile = viewMode === 'mobile'; // Define isMobile derived from viewMode
    const resumeRef = useRef<HTMLDivElement>(null);
    const [isSinglePageOverflowing, setIsSinglePageOverflowing] = useState(false);

    // ... handlers ...

    const handleUpdate = (section: keyof ResumeSchema, value: any) => {
        if (onUpdate) {
            onUpdate({ ...data, [section]: value });
        }
    };
    // ... existing handlers ...
    const handleTitleUpdate = (sectionKey: string, newTitle: string) => {
        if (!onUpdate) return;
        const newTitles = { ...data.sectionTitles, [sectionKey]: newTitle };
        onUpdate({ ...data, sectionTitles: newTitles });
    };

    const handleSeparatorUpdate = (sectionKey: string, show: boolean) => {
        if (!onUpdate) return;
        const newSeparators = { ...data.sectionSeparators, [sectionKey]: show };
        onUpdate({ ...data, sectionSeparators: newSeparators });
    };

    const handleCustomSectionUpdate = (id: string, newSectionData: any) => {
        if (!onUpdate) return;
        const newCustomSections = data.customSections?.map(s =>
            s.id === id ? newSectionData : s
        ) || [];
        onUpdate({ ...data, customSections: newCustomSections });
    };

    const addCustomSection = () => {
        if (!onUpdate) return;
        const id = `custom-${Date.now()}`;
        const newSection = {
            id,
            title: "New Custom Section",
            items: []
        };
        const newCustomSections = [...(data.customSections || []), newSection];
        const newOrder = [...data.sectionOrder, id];
        const newVisible = { ...data.visibleSections, [id]: true };

        onUpdate({
            ...data,
            customSections: newCustomSections,
            sectionOrder: newOrder,
            visibleSections: newVisible
        });
    };

    const duplicateSection = (key: string) => {
        if (!onUpdate) return;
        const customSection = data.customSections?.find(s => s.id === key);
        if (customSection) {
            const newId = `custom-${Date.now()}`;
            const newSection = {
                ...customSection,
                id: newId,
                title: `${customSection.title} (Copy)`
            };
            const newCustomSections = [...(data.customSections || []), newSection];

            const currentIndex = data.sectionOrder.indexOf(key);
            const newOrder = [...data.sectionOrder];
            newOrder.splice(currentIndex + 1, 0, newId);

            const newVisible = { ...data.visibleSections, [newId]: true };

            onUpdate({
                ...data,
                customSections: newCustomSections,
                sectionOrder: newOrder,
                visibleSections: newVisible
            });
        }
    };

    const updateFontSize = (size: number) => {
        if (!onUpdate) return;
        onUpdate({
            ...data,
            config: { ...data.config, baseFontSize: size }
        });
    };

    const unhideSection = (key: string) => {
        if (!onUpdate) return;
        onUpdate({
            ...data,
            visibleSections: { ...data.visibleSections, [key]: true } // Set explicit true
        });
    };

    const getTitle = (key: string, defaultTitle: string) => {
        return data.sectionTitles?.[key] || defaultTitle;
    };

    const getSeparator = (key: string) => {
        return data.sectionSeparators?.[key] ?? true;
    };

    // Font size config
    const baseFontSize = data.config?.baseFontSize || 10;
    const fontFamily = data.config?.fontFamily || 'Inter';
    const isSinglePage = data.config?.documentMode === 'singlePage';
    const lineHeight = data.config?.lineHeight || (isSinglePage ? 1.18 : 1.35);

    // Mobile specific overrides

    const { isDarkMode } = useTheme();

    const marginKey = resolveResumeMarginKey(data.config?.margins, isSinglePage);
    const padding = isMobile
        ? MOBILE_RESUME_PADDING[marginKey]
        : RESUME_MARGIN_PADDING[marginKey];
    const singlePagePadding = SINGLE_PAGE_PADDING[marginKey];
    const singlePageBase = Number(baseFontSize) || 10;

    const theme = THEME_PRESETS.standard;

    // Apply dark mode only in editor (isEditable)
    const applyDarkMode = isEditable && isDarkMode;

    const resumeStyle = {
        width: isMobile ? '100%' : 'min(100%, 210mm)',
        minHeight: isMobile ? 'auto' : '297mm',
        padding: !isMobile && isSinglePage ? '0' : padding,
        fontFamily: fontFamily === 'Inter' ? '"Inter", sans-serif' :
            fontFamily === 'Merriweather' ? '"Merriweather", serif' :
                fontFamily === 'Roboto Mono' ? '"Roboto Mono", monospace' :
                    fontFamily === 'Outfit' ? '"Outfit", sans-serif' :
                        fontFamily === 'Plus Jakarta Sans' ? '"Plus Jakarta Sans", sans-serif' :
                            'Helvetica, Arial, sans-serif',
        lineHeight: lineHeight,
        overflow: !isMobile && isSinglePage ? 'visible' : undefined,
        boxSizing: 'border-box',
        background: applyDarkMode ? 'var(--bg-card)' : theme.styles['--resume-bg'],
        color: applyDarkMode ? 'var(--text-main)' : theme.styles['--resume-text'],
        backgroundImage: applyDarkMode ? 'none' : theme.styles['--resume-gradient'],
        // In mobile mode, we enforce larger, legible base sizes regardless of config
        '--resume-base': isMobile ? `${Math.max(13, baseFontSize * 1.3)}px` : `${baseFontSize}pt`,
        '--resume-body': isMobile ? `${Math.max(12, baseFontSize * 1.25)}px` : `${baseFontSize * 0.95}pt`,
        '--resume-heading': isMobile ? `${Math.max(14, baseFontSize * 1.4)}px` : `${baseFontSize * 1.1}pt`,
        '--resume-h1': isMobile ? `${Math.max(20, baseFontSize * 2.0)}px` : `${baseFontSize * 2.2}pt`,
        '--resume-sub': isMobile ? `${Math.max(11, baseFontSize * 1.1)}px` : `${baseFontSize * 0.9}pt`,
        '--single-sidebar-padding': singlePagePadding.sidebar,
        '--single-main-padding': singlePagePadding.main,
        '--single-name-size': `${singlePageBase * 2.44}pt`,
        '--single-title-size': `${singlePageBase}pt`,
        '--single-sidebar-title-size': `${singlePageBase * 1.04}pt`,
        '--single-edit-size': `${singlePageBase * 0.8}pt`,
        '--single-contact-size': `${singlePageBase * 0.87}pt`,
        '--single-contact-label-size': `${singlePageBase * 0.68}pt`,
        '--single-section-title-size': `${singlePageBase * 1.11}pt`,
        '--single-sidebar-section-title-size': `${singlePageBase * 1.05}pt`,
        '--single-body-size': `${singlePageBase}pt`,
        '--single-summary-size': `${singlePageBase * 1.01}pt`,
        '--single-sidebar-body-size': `${singlePageBase * 0.93}pt`,
        '--single-role-size': `${singlePageBase * 1.07}pt`,
        '--single-company-size': `${singlePageBase * 0.94}pt`,
        '--single-meta-size': `${singlePageBase * 0.9}pt`,
        '--single-cert-issuer-size': `${singlePageBase * 0.89}pt`,
        ...(applyDarkMode ? {
            '--resume-bg': 'var(--bg-card)',
            '--resume-text': 'var(--text-main)',
            '--resume-dark': 'var(--text-main)',
            '--resume-gray': 'var(--text-muted)',
            '--resume-light-gray': 'rgba(255,255,255,0.4)',
            '--resume-border': 'rgba(255,255,255,0.1)',
            '--resume-accent': 'var(--accent)',
            '--resume-primary': 'var(--accent)',
        } : theme.styles),
    } as any;

    useEffect(() => {
        if (!isSinglePage || isMobile || !resumeRef.current) {
            setIsSinglePageOverflowing(false);
            return;
        }

        const checkOverflow = () => {
            const node = resumeRef.current;
            if (!node) return;
            const a4HeightInCssPixels = (297 / 25.4) * 96;
            setIsSinglePageOverflowing(node.scrollHeight > a4HeightInCssPixels + 4);
        };

        const frame = window.requestAnimationFrame(checkOverflow);
        window.addEventListener('resize', checkOverflow);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', checkOverflow);
        };
    }, [data, isMobile, isSinglePage]);

    const moveSection = (index: number, direction: 'up' | 'down') => {
        if (!onUpdate) return;
        const newOrder = [...data.sectionOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newOrder.length) return;

        [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
        onUpdate({ ...data, sectionOrder: newOrder });
    };

    const hideSection = (key: string) => {
        if (!onUpdate) return;
        onUpdate({
            ...data,
            visibleSections: { ...data.visibleSections, [key]: false }
        });
    };

    const getSectionState = (key: string) => {
        const customSection = data.customSections?.find(s => s.id === key);
        let sectionTitle = key.charAt(0).toUpperCase() + key.slice(1);
        if (customSection) sectionTitle = customSection.title || "Custom Section";
        else sectionTitle = SECTION_LABELS[key] || sectionTitle;

        const isHidden = data.visibleSections && data.visibleSections[key] === false;
        const isEmpty = (() => {
            switch (key) {
                case 'summary': return !data.summary || data.summary.trim() === '';
                case 'experience': return !data.experience || data.experience.length === 0;
                case 'education': return !data.education || data.education.length === 0;
                case 'skills': return !data.skills || data.skills.length === 0;
                case 'projects': return !data.projects || data.projects.length === 0;
                case 'achievements': return !data.achievements || data.achievements.length === 0;
                case 'certifications': return !data.certifications || data.certifications.length === 0;
                case 'openSource': return !data.openSource || data.openSource.length === 0;
                default:
                    if (!customSection) return true;
                    if (customSection.type === 'summary') return !customSection.items[0] || customSection.items[0].trim() === '';
                    return !customSection.items || customSection.items.length === 0;
            }
        })();

        return { customSection, sectionTitle, isHidden, isEmpty };
    };

    const renderManagedSection = (key: string, index: number, order: string[]) => {
        const { customSection, sectionTitle, isHidden, isEmpty } = getSectionState(key);

        if (isHidden) {
            if (!isEditable) return null;

            return (
                <div key={key} className="resume-editor-hidden print:hidden group/hidden">
                    <span className="flex items-center gap-2 font-medium">
                        <Eye size={14} /> {sectionTitle} (Hidden)
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => unhideSection(key)}
                            className="transition-colors"
                            title="Show Section"
                        >
                            <Eye size={12} /> Show Section
                        </button>
                    </div>
                </div>
            );
        }

        if (isEmpty && !isEditable) return null;

        const content = renderSection(key);
        if (!content) return null;

        const handleDelete = customSection ? () => {
            const newOrder = data.sectionOrder.filter(k => k !== key);
            const newCustomSections = data.customSections?.filter(s => s.id !== key) || [];
            const { [key]: _, ...newVisible } = data.visibleSections;

            if (onUpdate) {
                onUpdate({
                    ...data,
                    sectionOrder: newOrder,
                    customSections: newCustomSections,
                    visibleSections: newVisible
                });
            }
        } : undefined;

        return (
            <SectionControls
                key={key}
                id={key}
                title={sectionTitle}
                isFirst={index === 0}
                isLast={index === order.length - 1}
                onMoveUp={() => moveSection(data.sectionOrder.indexOf(key), 'up')}
                onMoveDown={() => moveSection(data.sectionOrder.indexOf(key), 'down')}
                onHide={() => hideSection(key)}
                onDelete={handleDelete}
                onDuplicate={customSection ? () => duplicateSection(key) : undefined}
                isEditable={isEditable}
                forceMobileControls={isMobile}
            >
                {content}
            </SectionControls>
        );
    };

    const renderSinglePageContact = () => {
        const contactFields = [
            { label: 'Location', value: data.personalInfo.location },
            { label: 'Phone', value: data.personalInfo.phone },
            { label: 'Email', value: data.personalInfo.email }
        ].filter(field => field.value?.trim());

        const formatUrl = (url: string) => url
            .replace(/^https?:\/\/(www\.)?/, '')
            .replace(/\/$/, '')
            .replace(/^linkedin\.com\/in\//, 'linkedin.com/')
            .replace(/^github\.com\//, 'github.com/');

        return (
            <section className="resume-single-contact">
                <div className="resume-single-sidebar-title">Contact</div>
                {isEditable && (
                    <button
                        onClick={onEditHeader}
                        className="resume-single-edit-contact print:hidden"
                        title="Edit Contact Info"
                    >
                        Edit
                    </button>
                )}
                <div className="resume-single-contact-list">
                    {contactFields.map(field => (
                        <div key={field.label} className="resume-single-contact-item">
                            <span className="resume-single-contact-label">{field.label}</span>
                            {field.label === 'Email' ? (
                                <a href={`mailto:${field.value}`} className="resume-link">{field.value}</a>
                            ) : (
                                <span>{field.value}</span>
                            )}
                        </div>
                    ))}
                    {data.personalInfo.profiles?.filter(profile => profile.url?.trim()).map((profile, index) => (
                        <div key={`${profile.network}-${index}`} className="resume-single-contact-item">
                            <span className="resume-single-contact-label">{profile.network || 'Profile'}</span>
                            <a href={profile.url} target="_blank" rel="noreferrer" className="resume-link">
                                {formatUrl(profile.url)}
                            </a>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    const renderSinglePageLayout = () => {
        const sidebarSections = data.sectionOrder.filter(key =>
            ['skills', 'projects', 'certifications', 'achievements'].includes(key)
        );
        const mainSections = data.sectionOrder.filter(key => !sidebarSections.includes(key));

        return (
            <div className="resume-single-page-layout">
                <aside className="resume-single-sidebar">
                    {renderSinglePageContact()}
                    {sidebarSections.map((key, index) => renderManagedSection(key, index, sidebarSections))}
                </aside>
                <main className="resume-single-main">
                    <header className="resume-single-identity">
                        <EditableField
                            tagName="h1"
                            value={data.personalInfo.fullName}
                            onSave={(val) => handleUpdate('personalInfo', { ...data.personalInfo, fullName: val })}
                            isEditable={isEditable}
                            className="resume-name"
                            placeholder="YOUR NAME"
                        />
                        {(data.personalInfo.title?.trim() || isEditable) && (
                            <EditableField
                                tagName="p"
                                value={data.personalInfo.title || ""}
                                onSave={(val) => handleUpdate('personalInfo', { ...data.personalInfo, title: val })}
                                isEditable={isEditable}
                                className="resume-title"
                                placeholder="PROFESSIONAL TITLE"
                            />
                        )}
                    </header>
                    {mainSections.map((key, index) => renderManagedSection(key, index, mainSections))}
                </main>
            </div>
        );
    };

    const renderSection = (key: string) => {
        switch (key) {
            case 'summary':
                return <Summary
                    summary={data.summary}
                    isEditable={isEditable}
                    onUpdate={(val) => handleUpdate('summary', val)}
                    title={getTitle('summary', 'Professional Summary')}
                    onTitleChange={(val) => handleTitleUpdate('summary', val)}
                    showSeparator={getSeparator('summary')}
                    onToggleSeparator={(val) => handleSeparatorUpdate('summary', val)}
                    viewMode={viewMode}
                    auditResult={auditResult}
                    targetJD={data.targetJD}
                />;
            case 'skills':
                return <Skills
                    skills={data.skills}
                    isEditable={isEditable}
                    onUpdate={(val) => handleUpdate('skills', val)}
                    title={getTitle('skills', 'Key Skills')}
                    onTitleChange={(val) => handleTitleUpdate('skills', val)}
                    showSeparator={getSeparator('skills')}
                    onToggleSeparator={(val) => handleSeparatorUpdate('skills', val)}
                    viewMode={viewMode}
                    auditResult={auditResult}
                />;
            case 'experience':
                return <Experience
                    experience={data.experience}
                    isEditable={isEditable}
                    onUpdate={(val) => handleUpdate('experience', val)}
                    title={getTitle('experience', 'Professional Experience')}
                    onTitleChange={(val) => handleTitleUpdate('experience', val)}
                    showSeparator={getSeparator('experience')}
                    onToggleSeparator={(val) => handleSeparatorUpdate('experience', val)}
                    viewMode={viewMode}
                    auditResult={auditResult}
                    targetJD={data.targetJD}
                />;
            case 'projects':
                return <Projects
                    projects={data.projects}
                    isEditable={isEditable}
                    onUpdate={(val) => handleUpdate('projects', val)}
                    title={getTitle('projects', 'Key Development Projects')}
                    onTitleChange={(val) => handleTitleUpdate('projects', val)}
                    showSeparator={getSeparator('projects')}
                    onToggleSeparator={(val) => handleSeparatorUpdate('projects', val)}
                    viewMode={viewMode}
                />;
            case 'openSource':
                return <OpenSource
                    openSource={data.openSource}
                    isEditable={isEditable}
                    onUpdate={(val) => handleUpdate('openSource', val)}
                    title={getTitle('openSource', 'Open Source Contributions')}
                    onTitleChange={(val) => handleTitleUpdate('openSource', val)}
                    showSeparator={getSeparator('openSource')}
                    onToggleSeparator={(val) => handleSeparatorUpdate('openSource', val)}
                    viewMode={viewMode}
                />;
            case 'achievements':
                return <Achievements
                    achievements={data.achievements}
                    isEditable={isEditable}
                    onUpdate={(val) => handleUpdate('achievements', val)}
                    title={getTitle('achievements', 'Achievements')}
                    onTitleChange={(val) => handleTitleUpdate('achievements', val)}
                    showSeparator={getSeparator('achievements')}
                    onToggleSeparator={(val) => handleSeparatorUpdate('achievements', val)}
                    viewMode={viewMode}
                />;
            case 'certifications':
                return <Certifications
                    certifications={data.certifications}
                    isEditable={isEditable}
                    onUpdate={(val) => handleUpdate('certifications', val)}
                    title={getTitle('certifications', 'Certifications')}
                    onTitleChange={(val) => handleTitleUpdate('certifications', val)}
                    showSeparator={getSeparator('certifications')}
                    onToggleSeparator={(val) => handleSeparatorUpdate('certifications', val)}
                    viewMode={viewMode}
                />;
            case 'education':
                return <Education
                    education={data.education}
                    isEditable={isEditable}
                    onUpdate={(val) => handleUpdate('education', val)}
                    title={getTitle('education', 'Education')}
                    onTitleChange={(val) => handleTitleUpdate('education', val)}
                    showSeparator={getSeparator('education')}
                    onToggleSeparator={(val) => handleSeparatorUpdate('education', val)}
                    viewMode={viewMode}
                />;
            default:
                // Check if it's a custom section
                const customSection = data.customSections?.find(s => s.id === key);
                if (customSection) {
                    // Handle typed custom sections
                    if (customSection.type === 'summary') {
                        return <Summary
                            summary={customSection.items[0] || ''}
                            isEditable={isEditable}
                            onUpdate={(newSummary) => handleCustomSectionUpdate(key, { ...customSection, items: [newSummary] })}
                            title={customSection.title}
                            onTitleChange={(newTitle) => handleCustomSectionUpdate(key, { ...customSection, title: newTitle })}
                            showSeparator={getSeparator(key)}
                            onToggleSeparator={(val) => handleSeparatorUpdate(key, val)}
                            viewMode={viewMode}
                        />;
                    }
                    if (customSection.type === 'skills') {
                        return <Skills
                            skills={customSection.items}
                            isEditable={isEditable}
                            onUpdate={(newItems) => handleCustomSectionUpdate(key, { ...customSection, items: newItems })}
                            title={customSection.title}
                            onTitleChange={(newTitle) => handleCustomSectionUpdate(key, { ...customSection, title: newTitle })}
                            showSeparator={getSeparator(key)}
                            onToggleSeparator={(val) => handleSeparatorUpdate(key, val)}
                            viewMode={viewMode}
                        />;
                    }
                    if (customSection.type === 'experience') {
                        return <Experience
                            experience={customSection.items}
                            isEditable={isEditable}
                            onUpdate={(newItems) => handleCustomSectionUpdate(key, { ...customSection, items: newItems })}
                            title={customSection.title}
                            onTitleChange={(newTitle) => handleCustomSectionUpdate(key, { ...customSection, title: newTitle })}
                            showSeparator={getSeparator(key)}
                            onToggleSeparator={(val) => handleSeparatorUpdate(key, val)}
                            viewMode={viewMode}
                        />;
                    }
                    if (customSection.type === 'projects') {
                        return <Projects
                            projects={customSection.items}
                            isEditable={isEditable}
                            onUpdate={(newItems) => handleCustomSectionUpdate(key, { ...customSection, items: newItems })}
                            title={customSection.title}
                            onTitleChange={(newTitle) => handleCustomSectionUpdate(key, { ...customSection, title: newTitle })}
                            showSeparator={getSeparator(key)}
                            onToggleSeparator={(val) => handleSeparatorUpdate(key, val)}
                            viewMode={viewMode}
                        />;
                    }
                    if (customSection.type === 'education') {
                        return <Education
                            education={customSection.items}
                            isEditable={isEditable}
                            onUpdate={(newItems) => handleCustomSectionUpdate(key, { ...customSection, items: newItems })}
                            title={customSection.title}
                            onTitleChange={(newTitle) => handleCustomSectionUpdate(key, { ...customSection, title: newTitle })}
                            showSeparator={getSeparator(key)}
                            onToggleSeparator={(val) => handleSeparatorUpdate(key, val)}
                            viewMode={viewMode}
                        />;
                    }
                    if (customSection.type === 'certifications') {
                        return <Certifications
                            certifications={customSection.items}
                            isEditable={isEditable}
                            onUpdate={(newItems) => handleCustomSectionUpdate(key, { ...customSection, items: newItems })}
                            title={customSection.title}
                            onTitleChange={(newTitle) => handleCustomSectionUpdate(key, { ...customSection, title: newTitle })}
                            showSeparator={getSeparator(key)}
                            onToggleSeparator={(val) => handleSeparatorUpdate(key, val)}
                            viewMode={viewMode}
                        />;
                    }
                    if (customSection.type === 'openSource') {
                        return <OpenSource
                            openSource={customSection.items}
                            isEditable={isEditable}
                            onUpdate={(newItems) => handleCustomSectionUpdate(key, { ...customSection, items: newItems })}
                            title={customSection.title}
                            onTitleChange={(newTitle) => handleCustomSectionUpdate(key, { ...customSection, title: newTitle })}
                            showSeparator={getSeparator(key)}
                            onToggleSeparator={(val) => handleSeparatorUpdate(key, val)}
                            viewMode={viewMode}
                        />;
                    }

                    // Default generic custom section
                    return <CustomSection
                        sectionData={customSection}
                        isEditable={isEditable}
                        onUpdate={(newData) => handleCustomSectionUpdate(key, newData)}
                        showSeparator={getSeparator(key)}
                        onToggleSeparator={(val) => handleSeparatorUpdate(key, val)}
                        viewMode={viewMode}
                    />;
                }
                return null;
        }
    };

    return (
        <div className="relative">
            {/* Old inline toolbar removed - now using EditorToolbar */}

            <div
                ref={resumeRef}
                id={id}
                className={`mx-auto print:shadow-none print:m-0 resume-root ${isSinglePage ? 'resume-mode-single-page' : 'resume-mode-standard'} ${isEditable ? 'rounded-b-lg rounded-t-none' : ''} ${viewMode === 'mobile' ? '!shadow-none !w-full !max-w-none' : ''} ${applyDarkMode ? 'dark-mode-editor' : ''}`}
                style={{
                    boxShadow: theme.styles['--resume-card-shadow'] || '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                    backdropFilter: theme.styles['--resume-glass-blur'] ? `blur(${theme.styles['--resume-glass-blur']})` : 'none',
                    border: theme.styles['--resume-card-border'] || 'none',
                    ...resumeStyle
                }}
            >
                {isEditable && isSinglePage && !isMobile && isSinglePageOverflowing && (
                    <div className="resume-single-overflow-banner absolute right-0 -top-9 print:hidden flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold shadow-sm">
                        <AlertTriangle size={13} />
                        <span>Content exceeds one page</span>
                        <span className="resume-single-beta-badge rounded border px-1.5 py-0.5 text-[8px] font-black tracking-widest">
                            BETA
                        </span>
                    </div>
                )}

                {isSinglePage && !isMobile ? (
                    renderSinglePageLayout()
                ) : (
                    <>
                        {/* Single column layout for ATS compatibility */}
                        <Header
                            personalInfo={data.personalInfo}
                            isEditable={isEditable}
                            onUpdate={(newInfo) => handleUpdate('personalInfo', newInfo)}
                            onEdit={onEditHeader}
                        />

                        {data.sectionOrder.map((key, index) => {
                    // Check visibility
                    const isHidden = data.visibleSections && data.visibleSections[key] === false;

                    // Check if empty
                    const isEmpty = (() => {
                        switch (key) {
                            case 'summary': return !data.summary || data.summary.trim() === '';
                            case 'experience': return !data.experience || data.experience.length === 0;
                            case 'education': return !data.education || data.education.length === 0;
                            case 'skills': return !data.skills || data.skills.length === 0;
                            case 'projects': return !data.projects || data.projects.length === 0;
                            case 'achievements': return !data.achievements || data.achievements.length === 0;
                            case 'certifications': return !data.certifications || data.certifications.length === 0;
                            case 'openSource': return !data.openSource || data.openSource.length === 0;
                            default:
                                const custom = data.customSections?.find(s => s.id === key);
                                if (!custom) return true;
                                if (custom.type === 'summary') return !custom.items[0] || custom.items[0].trim() === '';
                                return !custom.items || custom.items.length === 0;
                        }
                    })();

                    // If hidden: Render a "Hidden Placeholder" strip in editor, hide in export
                    if (isHidden) {
                        if (!isEditable) return null;

                        // Get label for placeholder
                        let sectionTitle = key.charAt(0).toUpperCase() + key.slice(1);
                        const customSection = data.customSections?.find(s => s.id === key);
                        if (customSection) sectionTitle = customSection.title || "Custom Section";
                        else sectionTitle = SECTION_LABELS[key] || sectionTitle;

                        return (
                            <div key={key} className="resume-editor-hidden print:hidden group/hidden">
                                <span className="flex items-center gap-2 font-medium">
                                    <Eye size={14} /> {sectionTitle} (Hidden)
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => unhideSection(key)}
                                        className="transition-colors"
                                        title="Show Section"
                                    >
                                        <Eye size={12} /> Show Section
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    if (isEmpty && !isEditable) return null;

                    const content = renderSection(key);
                    if (!content) return null;

                    // For title in controls
                    let sectionTitle = key.charAt(0).toUpperCase() + key.slice(1);
                    const customSection = data.customSections?.find(s => s.id === key);
                    if (customSection) {
                        sectionTitle = customSection.title || "Custom Section";
                    } else {
                        sectionTitle = SECTION_LABELS[key] || sectionTitle;
                    }

                    // Add delete handler for custom sections
                    const handleDelete = customSection ? () => {
                        const newOrder = data.sectionOrder.filter(k => k !== key);
                        const newCustomSections = data.customSections?.filter(s => s.id !== key) || [];
                        const { [key]: _, ...newVisible } = data.visibleSections;

                        if (onUpdate) {
                            onUpdate({
                                ...data,
                                sectionOrder: newOrder,
                                customSections: newCustomSections,
                                visibleSections: newVisible
                            });
                        }
                    } : undefined;

                    return (
                        <SectionControls
                            key={key}
                            id={key}
                            title={sectionTitle}
                            isFirst={index === 0}
                            isLast={index === data.sectionOrder.length - 1}
                            onMoveUp={() => moveSection(index, 'up')}
                            onMoveDown={() => moveSection(index, 'down')}
                            onHide={() => hideSection(key)}
                            onDelete={handleDelete}
                            onDuplicate={customSection ? () => duplicateSection(key) : undefined}
                            isEditable={isEditable}
                            forceMobileControls={isMobile}
                        >
                            {content}
                        </SectionControls>
                    );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}

const SECTION_LABELS: Record<string, string> = {
    summary: "Professional Summary",
    skills: "Key Skills",
    experience: "Experience",
    projects: "Projects",
    openSource: "Open Source",
    education: "Education",
    achievements: "Achievements",
    certifications: "Certifications"
};
