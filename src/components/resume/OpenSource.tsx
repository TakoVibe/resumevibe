import type { ResumeSchema } from '../../types/resume';
import { SectionTitle } from './SectionTitle';
import { EditableField } from '../ui/EditableField';
import { ItemControls } from '../ui/ItemControls';
import { Plus } from 'lucide-react';

type OpenSourceItem = NonNullable<ResumeSchema['openSource']>[0];

interface Props {
    openSource?: OpenSourceItem[];
    isEditable?: boolean;
    onUpdate?: (items: OpenSourceItem[]) => void;
    title?: string;
    onTitleChange?: (newTitle: string) => void;
    showSeparator?: boolean;
    onToggleSeparator?: (show: boolean) => void;
    viewMode?: 'desktop' | 'mobile';
}

export function OpenSource({ openSource, isEditable = false, onUpdate, title = "Open Source Contributions", onTitleChange, showSeparator, onToggleSeparator, viewMode = 'desktop' }: Props) {
    if (!openSource && !isEditable) return null;
    const safeOpenSource = openSource || [];
    const isMobile = viewMode === 'mobile';

    const stripHtml = (value: string) => value
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .trim();

    const sanitizeInlineHtml = (value: string) => value
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/?(span|font|div|p)[^>]*>/gi, '')
        .replace(/<b[^>]*>/gi, '<strong>')
        .replace(/<\/b>/gi, '</strong>')
        .replace(/<strong[^>]*>/gi, '<strong>')
        .replace(/<em[^>]*>/gi, '<em>')
        .replace(/<i[^>]*>/gi, '<em>')
        .replace(/<\/i>/gi, '</em>')
        .replace(/<u[^>]*>/gi, '<u>')
        .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, '<a href="$1">')
        .replace(/<(?!\/?(strong|em|u|a)(\s|>|\/))/gi, '&lt;')
        .replace(/\s+/g, ' ')
        .trim();

    const updateItem = (id: string, field: keyof NonNullable<Props['openSource']>[0], value: any) => {
        if (!onUpdate) return;
        const newOS = safeOpenSource.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        onUpdate(newOS);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (!onUpdate) return;
        const newOS = [...safeOpenSource];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newOS.length) return;
        [newOS[index], newOS[targetIndex]] = [newOS[targetIndex], newOS[index]];
        onUpdate(newOS);
    };

    const deleteItem = (index: number) => {
        if (!onUpdate || !openSource) return;
        const newOS = openSource.filter((_, i) => i !== index);
        onUpdate(newOS);
    };

    const duplicateItem = (index: number) => {
        if (!onUpdate || !openSource) return;
        const itemToClone = openSource[index];
        const newItem = {
            ...itemToClone,
            id: Math.random().toString(36).substr(2, 9),
            name: `${itemToClone.name} (Copy)`
        };
        const newOS = [...openSource];
        newOS.splice(index + 1, 0, newItem);
        onUpdate(newOS);
    };

    const addItem = () => {
        if (!onUpdate) return;
        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'Project Name',
            description: 'Core contribution description (#123)...',
            link: '',
            date: '2024',
            metrics: []
        };
        onUpdate([...safeOpenSource, newItem]);
    };


    return (
        <section className="resume-section mb-12">
            <SectionTitle
                title={title}
                isEditable={isEditable}
                onChange={onTitleChange}
                showSeparator={showSeparator}
                onToggleSeparator={onToggleSeparator}
            />
            <ul className="resume-details-list resume-open-source-list">
                {safeOpenSource.map((item, index) => (
                    <ItemControls
                        key={item.id}
                        isFirst={index === 0}
                        isLast={index === safeOpenSource.length - 1}
                        onMoveUp={() => moveItem(index, 'up')}
                        onMoveDown={() => moveItem(index, 'down')}
                        onDelete={() => deleteItem(index)}
                        onDuplicate={() => duplicateItem(index)}
                        isEditable={isEditable}
                        className="!py-0"
                    >
                        <li className="resume-list-item resume-open-source-item group/item-content resume-relative">
                            <span className="resume-bullet">•</span>
                            <div className={`resume-flex-1 resume-open-source-copy ${isMobile ? 'resume-flex resume-flex-col resume-gap-0.5' : ''}`}>
                                {isMobile ? (
                                    <>
                                        <EditableField
                                            tagName="span"
                                            value={item.name}
                                            onSave={(val) => updateItem(item.id, 'name', val)}
                                            isEditable={isEditable}
                                            className="resume-font-bold resume-text-dark resume-open-source-title-text resume-mb-0.5"
                                            placeholder="Project Name"
                                        />
                                        <EditableField
                                            tagName="span"
                                            value={item.description || ''}
                                            onSave={(val) => updateItem(item.id, 'description', val)}
                                            isEditable={isEditable}
                                            className="resume-text-dark resume-open-source-description-text"
                                            placeholder="Contribution description & references..."
                                            aiProps={{
                                                type: 'bullet',
                                                context: { projectName: item.name }
                                            }}
                                        />
                                    </>
                                ) : (
                                    <EditableField
                                        tagName="span"
                                        mode="html"
                                        value={`<strong>${stripHtml(item.name)}</strong>: ${sanitizeInlineHtml(item.description || '')}`}
                                        onSave={(val) => {
                                            const clean = sanitizeInlineHtml(val);
                                            const colonIndex = clean.indexOf(':');
                                            if (colonIndex === -1) {
                                                updateItem(item.id, 'name', stripHtml(clean));
                                                return;
                                            }
                                            updateItem(item.id, 'name', stripHtml(clean.slice(0, colonIndex)));
                                            updateItem(item.id, 'description', clean.slice(colonIndex + 1).trim());
                                        }}
                                        isEditable={isEditable}
                                        className="resume-open-source-line"
                                        placeholder="Project Name: Contribution description & references..."
                                        aiProps={{
                                            type: 'bullet',
                                            context: { projectName: item.name }
                                        }}
                                    />
                                )}
                            </div>
                        </li>
                    </ItemControls>
                ))}
            </ul>

            {isEditable && (
                <button
                    onClick={addItem}
                    aria-label="Add new open source contribution"
                    className="resume-editor-add group"
                >
                    <div className="p-1 bg-[var(--bg-card)] rounded-lg group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                        <Plus size={14} />
                    </div>
                    Add Contribution
                </button>
            )}
        </section>
    );
}
