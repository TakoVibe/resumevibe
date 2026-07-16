import type { ResumeSchema } from '../../types/resume';
import { SectionTitle } from './SectionTitle';
import { EditableField } from '../ui/EditableField';
import { ItemControls } from '../ui/ItemControls';
import { DraggableBullet } from '../ui/DraggableBullet';
import { Plus, List, ListMinus } from 'lucide-react';
import { ATSWarning } from '../ui/ATSWarning';
import { useCallback } from 'react';

type BulletItem = ResumeSchema['achievements'][0];

interface Props {
    achievements: ResumeSchema['achievements'];
    isEditable?: boolean;
    onUpdate?: (achievements: ResumeSchema['achievements']) => void;
    title?: string;
    onTitleChange?: (newTitle: string) => void;
    showSeparator?: boolean;
    onToggleSeparator?: (show: boolean) => void;
    viewMode?: 'desktop' | 'mobile';
}

export function Achievements({ achievements, isEditable = false, onUpdate, title = "Achievements", onTitleChange, showSeparator, onToggleSeparator, viewMode = 'desktop' }: Props) {
    if ((!achievements || achievements.length === 0) && !isEditable) return null;
    const safeAchievements = achievements || [];

    const updateAchievement = (index: number, value: string) => {
        if (!onUpdate) return;
        const newAchievements = [...safeAchievements];
        const current = newAchievements[index];
        if (typeof current === 'object' && current !== null) {
            newAchievements[index] = { ...current, text: value };
        } else {
            newAchievements[index] = value;
        }
        onUpdate(newAchievements);
    };

    const toggleBullet = (index: number) => {
        if (!onUpdate) return;
        const newAchievements = [...safeAchievements];
        const current = newAchievements[index];

        if (typeof current === 'string') {
            newAchievements[index] = { text: current, hasBullet: false };
        } else {
            newAchievements[index] = { ...current, hasBullet: !(current.hasBullet !== false) };
        }
        onUpdate(newAchievements);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (!onUpdate) return;
        const newAch = [...safeAchievements];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newAch.length) return;
        [newAch[index], newAch[targetIndex]] = [newAch[targetIndex], newAch[index]];
        onUpdate(newAch);
    };

    const deleteItem = (index: number) => {
        if (!onUpdate) return;
        const newAch = safeAchievements.filter((_, i) => i !== index);
        onUpdate(newAch);
    };

    const duplicateItem = (index: number) => {
        if (!onUpdate) return;
        const itemToClone = safeAchievements[index];
        let newItem;
        if (typeof itemToClone === 'string') {
            newItem = `${itemToClone} (Copy)`;
        } else {
            newItem = { ...itemToClone, text: `${itemToClone.text} (Copy)` };
        }
        const newAch = [...safeAchievements];
        newAch.splice(index + 1, 0, newItem);
        onUpdate(newAch);
    };

    const addItem = () => {
        if (!onUpdate) return;
        onUpdate([...safeAchievements, 'New achievement...']);
    };

    /** Insert a new item after a specific index and focus it */
    const insertAfter = useCallback((afterIndex: number) => {
        if (!onUpdate) return;
        const newAch = [...safeAchievements];
        newAch.splice(afterIndex + 1, 0, '');
        onUpdate(newAch);
        setTimeout(() => {
            const allBullets = document.querySelectorAll(`[data-bullet-index="${afterIndex + 1}"]`);
            const newBullet = allBullets[allBullets.length - 1] as HTMLElement;
            if (newBullet) newBullet.focus();
        }, 50);
    }, [safeAchievements, onUpdate]);

    /** Enhanced deleteItem with focus management */
    const deleteItemWithFocus = useCallback((index: number) => {
        if (!onUpdate) return;
        const newAch = safeAchievements.filter((_, i) => i !== index);
        onUpdate(newAch);
        if (index > 0) {
            setTimeout(() => {
                const allBullets = document.querySelectorAll(`[data-bullet-index="${index - 1}"]`);
                const prevBullet = allBullets[allBullets.length - 1] as HTMLElement;
                if (prevBullet) prevBullet.focus();
            }, 50);
        }
    }, [safeAchievements, onUpdate]);

    /** Reorder items via drag and drop */
    const reorderItem = useCallback((fromIndex: number, toIndex: number) => {
        if (!onUpdate) return;
        const newAch = [...safeAchievements];
        const [moved] = newAch.splice(fromIndex, 1);
        newAch.splice(toIndex, 0, moved);
        onUpdate(newAch);
    }, [safeAchievements, onUpdate]);

    return (
        <section className="resume-mb-8">
            <SectionTitle
                title={title}
                isEditable={isEditable}
                onChange={onTitleChange}
                showSeparator={showSeparator}
                onToggleSeparator={onToggleSeparator}
            />
            <ul className="resume-details-list">
                {safeAchievements.map((achievement, idx) => {
                    const achievementText = typeof achievement === 'string' ? achievement : achievement.text;
                    const hasBullet = typeof achievement === 'string' ? true : (achievement.hasBullet !== false);

                    return (
                        <ItemControls
                            key={idx}
                            isFirst={idx === 0}
                            isLast={idx === safeAchievements.length - 1}
                            onMoveUp={() => moveItem(idx, 'up')}
                            onMoveDown={() => moveItem(idx, 'down')}
                            onDelete={() => deleteItem(idx)}
                            onDuplicate={() => duplicateItem(idx)}
                            isEditable={isEditable}
                            forceMobileControls={viewMode === 'mobile'}
                        >
                            <DraggableBullet
                                index={idx}
                                onReorder={reorderItem}
                                isEditable={isEditable}
                                as="li"
                                className="resume-list-item resume-text-justify group/item-content resume-relative"
                            >
                                {hasBullet && <span className="resume-bullet">•</span>}
                                <div className="resume-flex-1">
                                    <EditableField
                                        tagName="span"
                                        mode="html"
                                        value={achievementText}
                                        onSave={(val) => updateAchievement(idx, val)}
                                        isEditable={isEditable}
                                        bulletIndex={idx}
                                        maxRecommendedLength={200}
                                        onEnterKey={() => insertAfter(idx)}
                                        onBackspaceEmpty={() => deleteItemWithFocus(idx)}
                                        aiProps={{
                                            type: 'bullet',
                                            context: {
                                                jobDescription: title // Using section title as context
                                            }
                                        }}
                                        actions={
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleBullet(idx); }}
                                                    className="p-1 text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                    title={hasBullet ? "Hide Bullet" : "Show Bullet"}
                                                >
                                                    {hasBullet ? <ListMinus size={14} /> : <List size={14} />}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteItem(idx); }}
                                                    className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete item"
                                                >
                                                    <span className="text-lg leading-none">×</span>
                                                </button>
                                            </>
                                        }
                                    />
                                    {isEditable && achievementText.includes('<') && (
                                        <ATSWarning type="formatting" className="mt-2" />
                                    )}
                                </div>
                            </DraggableBullet>
                        </ItemControls>
                    );
                })}
            </ul>

            {isEditable && (
                <button
                    onClick={addItem}
                    className="resume-editor-add"
                >
                    <Plus size={16} /> Add Achievement
                </button>
            )}
        </section>
    );
}
