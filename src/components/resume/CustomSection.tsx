import type { ResumeSchema } from '../../types/resume';
import { SectionTitle } from './SectionTitle';
import { EditableField } from '../ui/EditableField';
import { ItemControls } from '../ui/ItemControls';
import { Plus } from 'lucide-react';
import { ATSWarning } from '../ui/ATSWarning';
import { DatePicker } from '../ui/DatePicker';
import { hasUnsafeResumeFormatting, sanitizeInlineHtml } from '../../lib/resumeSanitizer';

type CustomSectionData = NonNullable<ResumeSchema['customSections']>[0];
type CustomItem = CustomSectionData['items'][0];

interface Props {
    sectionData: CustomSectionData;
    isEditable?: boolean;
    onUpdate?: (data: CustomSectionData) => void;
    showSeparator?: boolean;
    onToggleSeparator?: (show: boolean) => void;
    viewMode?: 'desktop' | 'mobile';
}

export function CustomSection({ sectionData, isEditable = false, onUpdate, showSeparator, onToggleSeparator, viewMode = 'desktop' }: Props) {
    if (!sectionData || (!sectionData.items.length && !isEditable)) return null;

    const handleTitleChange = (newTitle: string) => {
        if (onUpdate) {
            onUpdate({ ...sectionData, title: newTitle });
        }
    };

    const updateItem = (index: number, field: keyof CustomItem, value: string) => {
        if (!onUpdate) return;
        const newItems = [...sectionData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate({ ...sectionData, items: newItems });
    };

    const addItem = () => {
        if (!onUpdate) return;
        const newItem: CustomItem = {
            id: `item-${Date.now()}`,
            content: 'New item content...',
            title: '',
            date: ''
        };
        onUpdate({
            ...sectionData,
            items: [...sectionData.items, newItem]
        });
    };

    const deleteItem = (index: number) => {
        if (!onUpdate) return;
        const newItems = sectionData.items.filter((_, i) => i !== index);
        onUpdate({ ...sectionData, items: newItems });
    };

    const duplicateItem = (index: number) => {
        if (!onUpdate) return;
        const itemToClone = sectionData.items[index];
        const newItem = {
            ...itemToClone,
            id: `item-${Date.now()}`,
            // If title exists, append (Copy), otherwise if content exists, maybe do nothing special or just clone as is
            title: itemToClone.title ? `${itemToClone.title} (Copy)` : itemToClone.title,
            // If no title, user might want content to be slightly changed or just valid duplicate.
        };
        const newItems = [...sectionData.items];
        newItems.splice(index + 1, 0, newItem);
        onUpdate({ ...sectionData, items: newItems });
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (!onUpdate) return;
        const newItems = [...sectionData.items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newItems.length) return;
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        onUpdate({ ...sectionData, items: newItems });
    };

    return (
        <section className="resume-section-mb-12">
            <SectionTitle
                title={sectionData.title}
                isEditable={isEditable}
                onChange={handleTitleChange}
                showSeparator={showSeparator}
                onToggleSeparator={onToggleSeparator}
            />

            <div className="resume-space-y-6">
                {sectionData.items.map((item, idx) => (
                    <ItemControls
                        key={item.id}
                        isFirst={idx === 0}
                        isLast={idx === sectionData.items.length - 1}
                        onMoveUp={() => moveItem(idx, 'up')}
                        onMoveDown={() => moveItem(idx, 'down')}
                        onDelete={() => deleteItem(idx)}
                        onDuplicate={() => duplicateItem(idx)}
                        isEditable={isEditable}
                        forceMobileControls={viewMode === 'mobile'}
                    >
                        <div className="resume-custom-item">
                            <div className="resume-flex resume-justify-between resume-items-baseline resume-mb-1">
                                {item.title !== undefined && (
                                    <div className="resume-font-bold resume-text-dark resume-flex-1">
                                        <EditableField
                                            value={item.title}
                                            onSave={(val) => updateItem(idx, 'title', val)}
                                            isEditable={isEditable}
                                            placeholder="Item Title (Optional)"
                                        />
                                    </div>
                                )}
                                {(item.date !== undefined || isEditable) && (
                                    <div className="resume-custom-date">
                                        <DatePicker
                                            value={item.date}
                                            onSave={(val) => updateItem(idx, 'date', val)}
                                            isEditable={isEditable}
                                            className="resume-duration-gray"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="resume-pl-0">
                                <EditableField
                                    tagName="div"
                                    mode="html"
                                    value={item.content}
                                    onSave={(val) => updateItem(idx, 'content', val)}
                                    isEditable={isEditable}
                                    placeholder="Item content..."
                                    aiProps={{
                                        type: 'bullet',
                                        context: {
                                            jobDescription: sectionData.title // Contextualize with section title
                                        }
                                    }}
                                    actions={
                                        <div className="flex gap-1 bg-white/80 p-0.5 rounded">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteItem(idx); }}
                                                className="p-0.5 hover:text-red-500 text-gray-400"
                                                title="Delete item"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    }
                                />
                                {isEditable && hasUnsafeResumeFormatting(item.content) && (
                                    <ATSWarning
                                        type="formatting"
                                        className="mt-2"
                                        onFix={() => updateItem(idx, 'content', sanitizeInlineHtml(item.content))}
                                    />
                                )}
                            </div>
                        </div>
                    </ItemControls>
                ))}
            </div>

            {isEditable && (
                <button
                    onClick={addItem}
                    className="resume-editor-add"
                >
                    <Plus size={14} /> Add Item
                </button>
            )}
        </section>
    );
}
