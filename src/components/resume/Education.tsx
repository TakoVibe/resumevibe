import type { ResumeSchema } from '../../types/resume';
import { SectionTitle } from './SectionTitle';
import { EditableField } from '../ui/EditableField';
import { ItemControls } from '../ui/ItemControls';
import { DraggableBullet } from '../ui/DraggableBullet';
import { Plus, List, ListMinus } from 'lucide-react';
import { DatePicker } from '../ui/DatePicker';
import { ATSWarning } from '../ui/ATSWarning';
import { useCallback } from 'react';

type EducationItem = ResumeSchema['education'][0];

interface Props {
    education: EducationItem[];
    isEditable?: boolean;
    onUpdate?: (education: EducationItem[]) => void;
    title?: string;
    onTitleChange?: (newTitle: string) => void;
    showSeparator?: boolean;
    onToggleSeparator?: (show: boolean) => void;
    viewMode?: 'desktop' | 'mobile';
}

export function Education({ education, isEditable = false, onUpdate, title = "Education", onTitleChange, showSeparator, onToggleSeparator, viewMode = 'desktop' }: Props) {
    const isMobile = viewMode === 'mobile';
    const updateEdu = (id: string, field: keyof Props['education'][0], value: any) => {
        if (!onUpdate) return;
        const newEdu = education.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        );
        onUpdate(newEdu);
    };

    const updateDetail = (eduId: string, detailIndex: number, value: string) => {
        if (!onUpdate) return;
        const newEdu = education.map(e => {
            if (e.id !== eduId) return e;
            const newDetails = [...(e.details || [])];
            const current = newDetails[detailIndex];
            if (typeof current === 'object' && current !== null) {
                newDetails[detailIndex] = { ...current, text: value };
            } else {
                newDetails[detailIndex] = value;
            }
            return { ...e, details: newDetails };
        });
        onUpdate(newEdu);
    };

    const toggleBullet = (eduId: string, detailIndex: number) => {
        if (!onUpdate) return;
        const newEdu = education.map(e => {
            if (e.id !== eduId) return e;
            const newDetails = [...(e.details || [])];
            const current = newDetails[detailIndex];

            if (typeof current === 'string') {
                newDetails[detailIndex] = { text: current, hasBullet: false };
            } else {
                newDetails[detailIndex] = { ...current, hasBullet: !(current.hasBullet !== false) };
            }
            return { ...e, details: newDetails };
        });
        onUpdate(newEdu);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (!onUpdate) return;
        const newEdu = [...education];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newEdu.length) return;
        [newEdu[index], newEdu[targetIndex]] = [newEdu[targetIndex], newEdu[index]];
        onUpdate(newEdu);
    };

    const deleteItem = (index: number) => {
        if (!onUpdate) return;
        const newEdu = education.filter((_, i) => i !== index);
        onUpdate(newEdu);
    };

    const duplicateItem = (index: number) => {
        if (!onUpdate) return;
        const itemToClone = education[index];
        const newItem = {
            ...itemToClone,
            id: Math.random().toString(36).substr(2, 9),
            institution: `${itemToClone.institution} (Copy)`
        };
        const newEdu = [...education];
        newEdu.splice(index + 1, 0, newItem);
        onUpdate(newEdu);
    };

    const addItem = () => {
        if (!onUpdate) return;
        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            institution: 'Institution Name',
            degree: 'Degree',
            duration: 'Aug 2018 - Aug 2022',
            location: 'Location',
            details: []
        };
        onUpdate([...education, newItem]);
    };

    const addDetail = (eduId: string) => {
        if (!onUpdate) return;
        const newEdu = education.map(e => {
            if (e.id !== eduId) return e;
            return { ...e, details: [...(e.details || []), 'New detail...'] };
        });
        onUpdate(newEdu);
    };

    /** Insert a new detail after a specific index and focus it */
    const insertDetailAfter = useCallback((eduId: string, afterIndex: number) => {
        if (!onUpdate) return;
        const newEdu = education.map(e => {
            if (e.id !== eduId) return e;
            const newDetails = [...(e.details || [])];
            newDetails.splice(afterIndex + 1, 0, '');
            return { ...e, details: newDetails };
        });
        onUpdate(newEdu);
        setTimeout(() => {
            const allBullets = document.querySelectorAll(`[data-bullet-index="${afterIndex + 1}"]`);
            const newBullet = allBullets[allBullets.length - 1] as HTMLElement;
            if (newBullet) newBullet.focus();
        }, 50);
    }, [education, onUpdate]);

    const deleteDetail = (eduId: string, detailIndex: number) => {
        if (!onUpdate) return;
        const newEdu = education.map(e => {
            if (e.id !== eduId) return e;
            return { ...e, details: e.details?.filter((_, i) => i !== detailIndex) };
        });
        onUpdate(newEdu);
        if (detailIndex > 0) {
            setTimeout(() => {
                const allBullets = document.querySelectorAll(`[data-bullet-index="${detailIndex - 1}"]`);
                const prevBullet = allBullets[allBullets.length - 1] as HTMLElement;
                if (prevBullet) prevBullet.focus();
            }, 50);
        }
    };

    /** Reorder details via drag and drop */
    const reorderDetail = useCallback((eduId: string, fromIndex: number, toIndex: number) => {
        if (!onUpdate) return;
        const newEdu = education.map(e => {
            if (e.id !== eduId) return e;
            const newDetails = [...(e.details || [])];
            const [moved] = newDetails.splice(fromIndex, 1);
            newDetails.splice(toIndex, 0, moved);
            return { ...e, details: newDetails };
        });
        onUpdate(newEdu);
    }, [education, onUpdate]);

    return (
        <section className="resume-section">
            <SectionTitle
                title={title}
                isEditable={isEditable}
                onChange={onTitleChange}
            />
            <div className="resume-space-y-4">
                {education.map((edu, index) => (
                    <ItemControls
                        key={edu.id}
                        isFirst={index === 0}
                        isLast={index === education.length - 1}
                        onMoveUp={() => moveItem(index, 'up')}
                        onMoveDown={() => moveItem(index, 'down')}
                        onDelete={() => deleteItem(index)}
                        onDuplicate={() => duplicateItem(index)}
                        isEditable={isEditable}
                        forceMobileControls={viewMode === 'mobile'}
                    >
                        <div className="resume-relative resume-education-item group/item-content">
                            {/* Degree & Duration */}
                            <div className={`resume-flex resume-education-primary-row resume-items-baseline resume-mb-1 ${isMobile ? 'resume-flex-col resume-items-start resume-gap-0.5' : 'resume-justify-between'}`}>
                                <EditableField
                                    tagName="h3"
                                    value={edu.degree}
                                    onSave={(val) => updateEdu(edu.id, 'degree', val)}
                                    isEditable={isEditable}
                                    className="resume-role"
                                />
                                <DatePicker
                                    value={edu.duration}
                                    onSave={(val) => updateEdu(edu.id, 'duration', val)}
                                    isEditable={isEditable}
                                    className={`resume-duration-gray ${isMobile ? 'resume-mt-0.5' : ''}`}
                                />
                            </div>

                            {/* Institution & Location */}
                            <div className={`resume-flex resume-education-secondary-row resume-items-baseline resume-mb-1 ${isMobile ? 'resume-flex-col resume-items-start resume-gap-0.5' : 'resume-justify-between'}`}>
                                <div className="resume-flex-1">
                                    <EditableField
                                        tagName="h4"
                                        value={edu.institution}
                                        onSave={(val) => updateEdu(edu.id, 'institution', val)}
                                        isEditable={isEditable}
                                        className="resume-company"
                                    />
                                </div>
                                <div className={!isMobile ? "resume-text-right shrink-0 ml-2" : ""}>
                                    <EditableField
                                        value={edu.location || ''}
                                        onSave={(val) => updateEdu(edu.id, 'location', val)}
                                        isEditable={isEditable}
                                        className={`resume-location-text ${isMobile ? 'resume-mt-0.5' : ''}`}
                                    />
                                </div>
                            </div>

                            {(edu.details || isEditable) && (
                                <ul className="resume-details-list">
                                    {edu.details
                                        ?.filter(detail => isEditable || (typeof detail === 'string' ? detail : detail.text)?.trim())
                                        .map((detail, idx) => {
                                            const detailText = typeof detail === 'string' ? detail : detail.text;
                                            const hasBullet = typeof detail === 'string' ? true : (detail.hasBullet !== false);

                                            return (
                                                <DraggableBullet
                                                    key={idx}
                                                    index={idx}
                                                    onReorder={(from, to) => reorderDetail(edu.id, from, to)}
                                                    isEditable={isEditable}
                                                    as="li"
                                                    className={`resume-list-item resume-text-justify group/metric resume-relative ${hasBullet ? '' : 'resume-mb-1'}`}
                                                >
                                                    {hasBullet && <span className="resume-bullet">•</span>}
                                                    <div className="resume-flex-1">
                                                        <EditableField
                                                            tagName="span"
                                                            mode="html"
                                                            value={detailText}
                                                            onSave={(val) => updateDetail(edu.id, idx, val)}
                                                            isEditable={isEditable}
                                                            bulletIndex={idx}
                                                            onEnterKey={() => insertDetailAfter(edu.id, idx)}
                                                            onBackspaceEmpty={() => deleteDetail(edu.id, idx)}
                                                            aiProps={{
                                                                type: 'bullet',
                                                                context: {
                                                                    role: edu.degree,
                                                                    company: edu.institution
                                                                }
                                                            }}
                                                            actions={
                                                                <>
                                                                    <button
                                                                        onClick={() => toggleBullet(edu.id, idx)}
                                                                        className="p-1 text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                                        title={hasBullet ? "Hide Bullet" : "Show Bullet"}
                                                                    >
                                                                        {hasBullet ? <ListMinus size={14} /> : <List size={14} />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteDetail(edu.id, idx)}
                                                                        className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                                        title="Delete point"
                                                                    >
                                                                        <span className="text-lg leading-none">×</span>
                                                                    </button>
                                                                </>
                                                            }
                                                        />
                                                        {isEditable && detailText.includes('<') && (
                                                            <ATSWarning type="formatting" className="mt-2" />
                                                        )}
                                                    </div>
                                                </DraggableBullet>
                                            );
                                        })}
                                    {isEditable && (
                                        <li className="flex justify-center mt-1 opacity-40 hover:opacity-100 group-hover/item-content:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => addDetail(edu.id)}
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

            {
                isEditable && (
                    <button
                        onClick={addItem}
                        aria-label="Add new education entry"
                        className="resume-editor-add group"
                    >
                        <div className="p-1 bg-[var(--bg-card)] rounded-lg group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                            <Plus size={14} />
                        </div>
                        Add Education
                    </button>
                )
            }
        </section >
    );
}
