import type { ResumeSchema } from '../../types/resume';
import { SectionTitle } from './SectionTitle';
import { EditableField } from '../ui/EditableField';
import { ItemControls } from '../ui/ItemControls';
import { DraggableBullet } from '../ui/DraggableBullet';
import { Plus, List, ListMinus } from 'lucide-react';
import { DatePicker } from '../ui/DatePicker';
import { ATSWarning } from '../ui/ATSWarning';
import { useCallback } from 'react';

type ProjectItem = ResumeSchema['projects'][0];
// ... rest of file until the error spot

interface Props {
    projects: ProjectItem[];
    isEditable?: boolean;
    onUpdate?: (projects: ProjectItem[]) => void;
    title?: string;
    onTitleChange?: (newTitle: string) => void;
    showSeparator?: boolean;
    onToggleSeparator?: (show: boolean) => void;
    viewMode?: 'desktop' | 'mobile';
}

export function Projects({ projects, isEditable = false, onUpdate, title = "Projects", onTitleChange, showSeparator, onToggleSeparator, viewMode = 'desktop' }: Props) {
    const isMobile = viewMode === 'mobile';

    const updateProject = (id: string, field: keyof ProjectItem, value: any) => {
        if (!onUpdate) return;
        const newProj = projects.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        );
        onUpdate(newProj);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (!onUpdate) return;
        const newProj = [...projects];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newProj.length) return;
        [newProj[index], newProj[targetIndex]] = [newProj[targetIndex], newProj[index]];
        onUpdate(newProj);
    };

    const deleteItem = (index: number) => {
        if (!onUpdate) return;
        const newProj = projects.filter((_, i) => i !== index);
        onUpdate(newProj);
    };

    const duplicateItem = (index: number) => {
        if (!onUpdate) return;
        const itemToClone = projects[index];
        const newItem = {
            ...itemToClone,
            id: Math.random().toString(36).substr(2, 9),
            name: `${itemToClone.name} (Copy)`
        };
        const newProj = [...projects];
        newProj.splice(index + 1, 0, newItem);
        onUpdate(newProj);
    };

    const addItem = () => {
        if (!onUpdate) return;
        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'Project Name',
            date: 'Aug 2018 - Aug 2022',
            techStack: ['Tech 1', 'Tech 2'],
            metrics: ['Project summary or key feature...']
        };
        onUpdate([...projects, newItem]);
    };

    const addMetric = (projId: string) => {
        if (!onUpdate) return;
        const newProj = projects.map(p => {
            if (p.id !== projId) return p;
            return { ...p, metrics: [...(p.metrics || []), 'New feature...'] };
        });
        onUpdate(newProj);
    };

    /** Insert a new metric after a specific index and focus it */
    const insertMetricAfter = useCallback((projId: string, afterIndex: number) => {
        if (!onUpdate) return;
        const newProj = projects.map(p => {
            if (p.id !== projId) return p;
            const newMetrics = [...(p.metrics || [])];
            newMetrics.splice(afterIndex + 1, 0, '');
            return { ...p, metrics: newMetrics };
        });
        onUpdate(newProj);
        setTimeout(() => {
            const allBullets = document.querySelectorAll(`[data-bullet-index="${afterIndex + 1}"]`);
            const newBullet = allBullets[allBullets.length - 1] as HTMLElement;
            if (newBullet) newBullet.focus();
        }, 50);
    }, [projects, onUpdate]);

    const deleteMetric = (projId: string, metricIndex: number) => {
        if (!onUpdate) return;
        const newProj = projects.map(p => {
            if (p.id !== projId) return p;
            return { ...p, metrics: p.metrics?.filter((_, i) => i !== metricIndex) };
        });
        onUpdate(newProj);
        if (metricIndex > 0) {
            setTimeout(() => {
                const allBullets = document.querySelectorAll(`[data-bullet-index="${metricIndex - 1}"]`);
                const prevBullet = allBullets[allBullets.length - 1] as HTMLElement;
                if (prevBullet) prevBullet.focus();
            }, 50);
        }
    };

    /** Reorder metrics via drag and drop */
    const reorderMetric = useCallback((projId: string, fromIndex: number, toIndex: number) => {
        if (!onUpdate) return;
        const newProj = projects.map(p => {
            if (p.id !== projId) return p;
            const newMetrics = [...(p.metrics || [])];
            const [moved] = newMetrics.splice(fromIndex, 1);
            newMetrics.splice(toIndex, 0, moved);
            return { ...p, metrics: newMetrics };
        });
        onUpdate(newProj);
    }, [projects, onUpdate]);

    return (
        <section className="resume-section">
            <SectionTitle
                title={title}
                isEditable={isEditable}
                onChange={onTitleChange}
            />
            <div className="resume-space-y-5">
                {projects.map((project, index) => (
                    <ItemControls
                        key={project.id}
                        isFirst={index === 0}
                        isLast={index === projects.length - 1}
                        onMoveUp={() => moveItem(index, 'up')}
                        onMoveDown={() => moveItem(index, 'down')}
                        onDelete={() => deleteItem(index)}
                        onDuplicate={() => duplicateItem(index)}
                        isEditable={isEditable}
                        forceMobileControls={viewMode === 'mobile'}
                    >
                        <div className="resume-relative group/item-content">
                            <div className="resume-mb-1">
                                <div className="resume-flex resume-justify-between resume-items-baseline">
                                    <div className="resume-flex resume-items-center resume-gap-2">
                                        <EditableField
                                            tagName="h3"
                                            value={project.name}
                                            onSave={(val) => updateProject(project.id, 'name', val)}
                                            isEditable={isEditable}
                                            className="resume-project-name"
                                        />
                                        {/* Always show in edit mode, only show in view mode if link exists */}
                                        {/* Always show in edit mode, only show in view mode if link exists */}
                                        {isEditable && (
                                            <>
                                                {(() => {
                                                    const raw = project.link || '';
                                                    const noProtocol = raw.replace(/^https?:\/\//, '');
                                                    // Improved empty check: removes tags, html entities like &nbsp;, and whitespace
                                                    const cleanText = noProtocol
                                                        .replace(/<[^>]*>/g, '')
                                                        .replace(/&nbsp;/g, ' ')
                                                        .trim();
                                                    const isEmpty = cleanText.length === 0;

                                                    return (
                                                        <>
                                                            {!isEmpty && (
                                                                <span className="resume-text-gray resume-font-light resume-mx-1">|</span>
                                                            )}
                                                            <EditableField
                                                                tagName="span"
                                                                // Force empty string if effectively empty so contentEditable :empty CSS works
                                                                value={isEmpty ? '' : noProtocol}
                                                                onSave={(val) => updateProject(project.id, 'link', val)}
                                                                isEditable={isEditable}
                                                                className={`resume-link-text ${isEmpty ? 'opacity-50 resume-ml-2' : ''}`}
                                                                placeholder="+ Link"
                                                            />
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        )}
                                        {!isEditable && (() => {
                                            const raw = project.link || '';
                                            const cleanText = raw.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                                            if (cleanText.length === 0) return null;

                                            return (
                                                <>
                                                    <span className="resume-text-gray resume-font-light resume-mx-1">|</span>
                                                    <a
                                                        href={raw.startsWith('http') ? raw : `https://${raw}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="resume-link-text"
                                                    >
                                                        {raw.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                                    </a>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <DatePicker
                                        value={project.date || ''}
                                        onSave={(val) => updateProject(project.id, 'date', val)}
                                        isEditable={isEditable}
                                        className="resume-duration-gray resume-text-right"
                                    />
                                </div>
                            </div>



                            {(project.techStack && project.techStack.length > 0) && (
                                <div className={`resume-tech-stack ${isMobile ? 'flex flex-wrap gap-2 mt-2 mb-2' : ''}`}>
                                    {!isMobile && (
                                        <span className="resume-font-bold resume-text-dark resume-mr-1">
                                            <EditableField
                                                value={project.techStackLabel !== undefined ? project.techStackLabel : 'Stack:'}
                                                onSave={(val) => updateProject(project.id, 'techStackLabel', val)}
                                                isEditable={isEditable}
                                                tagName="span"
                                                placeholder="Label"
                                            />
                                        </span>
                                    )}

                                    {isMobile ? (
                                        <>
                                            {project.techStack.map((tech, i) => (
                                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--resume-bg-sub,rgba(128,128,128,0.1))] text-[var(--resume-gray)] border border-[var(--resume-border)]">
                                                    {isEditable ? (
                                                        <EditableField
                                                            value={tech}
                                                            onSave={(val) => {
                                                                const newStack = [...(project.techStack || [])];
                                                                newStack[i] = val;
                                                                updateProject(project.id, 'techStack', newStack);
                                                            }}
                                                            isEditable={true}
                                                            tagName="span"
                                                        />
                                                    ) : tech}
                                                </span>
                                            ))}
                                            {isEditable && (
                                                <button
                                                    onClick={() => updateProject(project.id, 'techStack', [...(project.techStack || []), 'New'])}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100"
                                                >
                                                    +
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <EditableField
                                            value={project.techStack.join(', ')}
                                            onSave={(val) => updateProject(project.id, 'techStack', val.split(',').map(s => s.trim()).filter(Boolean))}
                                            isEditable={isEditable}
                                        />
                                    )}
                                </div>
                            )}

                            {(project.metrics || isEditable) && (
                                <ul className="resume-details-list">
                                    {project.metrics
                                        ?.filter(metric => {
                                            const metricText = typeof metric === 'string' ? metric : metric?.text;
                                            return isEditable || metricText?.trim();
                                        })
                                        .map((metric, idx) => {
                                            const metricText = typeof metric === 'string' ? metric : (metric?.text || '');
                                            const hasBullet = typeof metric === 'string' ? true : (metric?.hasBullet !== false);

                                            return (
                                                <DraggableBullet
                                                    key={idx}
                                                    index={idx}
                                                    onReorder={(from, to) => reorderMetric(project.id, from, to)}
                                                    isEditable={isEditable}
                                                    as="li"
                                                    className={`resume-list-item resume-text-justify group/metric resume-relative ${hasBullet ? '' : 'resume-mb-1'}`}
                                                >
                                                    {hasBullet && <span className="resume-bullet">•</span>}
                                                    <div className="resume-flex-1">
                                                        <EditableField
                                                            tagName="span"
                                                            mode="html"
                                                            value={metricText}
                                                            onSave={(val) => {
                                                                if (!onUpdate) return;
                                                                const newProj = projects.map(p => {
                                                                    if (p.id !== project.id) return p;
                                                                    const nm = [...(p.metrics || [])];
                                                                    const current = nm[idx];
                                                                    if (typeof current === 'object' && current !== null) {
                                                                        nm[idx] = { ...current, text: val };
                                                                    } else {
                                                                        nm[idx] = val;
                                                                    }
                                                                    return { ...p, metrics: nm };
                                                                });
                                                                onUpdate(newProj);
                                                            }}
                                                            isEditable={isEditable}
                                                            controlsLayout="parent"
                                                            bulletIndex={idx}
                                                            maxRecommendedLength={200}
                                                            onEnterKey={() => insertMetricAfter(project.id, idx)}
                                                            onBackspaceEmpty={() => deleteMetric(project.id, idx)}
                                                            aiProps={{
                                                                type: 'bullet',
                                                                context: {
                                                                    projectName: project.name,
                                                                    techStack: project.techStack
                                                                }
                                                            }}
                                                            actions={
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (!onUpdate) return;
                                                                            const newProj = projects.map(p => {
                                                                                if (p.id !== project.id) return p;
                                                                                const nm = [...(p.metrics || [])];
                                                                                const current = nm[idx];
                                                                                if (typeof current === 'string') {
                                                                                    nm[idx] = { text: current, hasBullet: false };
                                                                                } else if (current && typeof current === 'object') {
                                                                                    nm[idx] = { ...current, hasBullet: !(current.hasBullet !== false) };
                                                                                } else {
                                                                                    nm[idx] = { text: '', hasBullet: false };
                                                                                }
                                                                                return { ...p, metrics: nm };
                                                                            });
                                                                            onUpdate(newProj);
                                                                        }}
                                                                        className="p-1 text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                                        title={hasBullet ? "Hide Bullet" : "Show Bullet"}
                                                                    >
                                                                        {hasBullet ? <ListMinus size={14} /> : <List size={14} />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteMetric(project.id, idx)}
                                                                        className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                                        title="Delete point"
                                                                    >
                                                                        <span className="text-lg leading-none">×</span>
                                                                    </button>
                                                                </>
                                                            }
                                                        />
                                                        {isEditable && metricText.includes('<') && (
                                                            <ATSWarning type="formatting" className="mt-2" />
                                                        )}
                                                    </div>
                                                </DraggableBullet>
                                            );
                                        })}
                                    {isEditable && (
                                        <li className="flex justify-center mt-1 opacity-40 hover:opacity-100 group-hover/item-content:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => addMetric(project.id)}
                                                className="resume-editor-add-inline"
                                            >
                                                <Plus size={12} /> Add Point
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </ItemControls>
                ))}
            </div>

            {isEditable && (
                <button
                    onClick={addItem}
                    aria-label="Add new project"
                    className="resume-editor-add group"
                >
                    <div className="p-1 bg-[var(--bg-card)] rounded-lg group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                        <Plus size={14} />
                    </div>
                    Add Project
                </button>
            )}
        </section>
    );
}
