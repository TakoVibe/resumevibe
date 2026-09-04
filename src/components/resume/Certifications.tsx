import type { ResumeSchema } from '../../types/resume';
import { SectionTitle } from './SectionTitle';
import { EditableField } from '../ui/EditableField';
import { ItemControls } from '../ui/ItemControls';
import { Plus } from 'lucide-react';
import { InlineAIButton } from '../ui/InlineAIButton';
import { DatePicker } from '../ui/DatePicker';

type CertificationItem = ResumeSchema['certifications'][0];

interface Props {
    certifications: CertificationItem[];
    isEditable?: boolean;
    onUpdate?: (certifications: CertificationItem[]) => void;
    title?: string;
    onTitleChange?: (newTitle: string) => void;
    showSeparator?: boolean;
    onToggleSeparator?: (show: boolean) => void;
    viewMode?: 'desktop' | 'mobile';
}

export function Certifications({ certifications, isEditable = false, onUpdate, title = "Certifications", onTitleChange, showSeparator, onToggleSeparator, viewMode = 'desktop' }: Props) {
    if (!certifications) return null;
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
        .replace(/\s+/g, ' ')
        .trim();

    const updateCert = (id: string, field: keyof CertificationItem, value: any) => {
        if (!onUpdate) return;
        const newCerts = certifications.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        );
        onUpdate(newCerts);
    };

    const updateCertFields = (id: string, fields: Partial<CertificationItem>) => {
        if (!onUpdate) return;
        const newCerts = certifications.map(c =>
            c.id === id ? { ...c, ...fields } : c
        );
        onUpdate(newCerts);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (!onUpdate) return;
        const newCerts = [...certifications];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newCerts.length) return;
        [newCerts[index], newCerts[targetIndex]] = [newCerts[targetIndex], newCerts[index]];
        onUpdate(newCerts);
    };

    const deleteItem = (index: number) => {
        if (!onUpdate) return;
        const newCerts = certifications.filter((_, i) => i !== index);
        onUpdate(newCerts);
    };

    const duplicateItem = (index: number) => {
        if (!onUpdate) return;
        const itemToClone = certifications[index];
        const newItem = {
            ...itemToClone,
            id: Math.random().toString(36).substr(2, 9),
            name: `${itemToClone.name} (Copy)`
        };
        const newCerts = [...certifications];
        newCerts.splice(index + 1, 0, newItem);
        onUpdate(newCerts);
    };

    const addItem = () => {
        if (!onUpdate) return;
        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'Certification Name',
            issuer: 'Issuer',
            date: 'Aug 2022'
        };
        onUpdate([...certifications, newItem]);
    };

    return (
        <section className="resume-mb-8 resume-certifications-section">
            <SectionTitle
                title={title}
                isEditable={isEditable}
                onChange={onTitleChange}
            />
            <ul className="resume-details-list resume-certifications-list">
                {certifications.map((cert, index) => (
                    <ItemControls
                        key={cert.id}
                        isFirst={index === 0}
                        isLast={index === certifications.length - 1}
                        onMoveUp={() => moveItem(index, 'up')}
                        onMoveDown={() => moveItem(index, 'down')}
                        onDelete={() => deleteItem(index)}
                        onDuplicate={() => duplicateItem(index)}
                        isEditable={isEditable}
                        forceMobileControls={viewMode === 'mobile'}
                    >
                        <li className="resume-list-item resume-certification-item group/item-content resume-relative">
                            <span className="resume-bullet">•</span>
                            <div className="resume-flex-1 resume-break-avoid resume-certification-content">
                                <div className={`resume-flex resume-certification-row ${isMobile ? 'resume-flex-col resume-gap-0.5' : 'resume-justify-between resume-items-baseline'}`}>
                                    <div className={`resume-flex resume-gap-1 resume-certification-identity group/cert-row resume-relative resume-items-baseline ${isMobile ? 'resume-font-bold resume-text-dark resume-flex-col resume-items-start resume-gap-0' : ''}`}>
                                        {isMobile ? (
                                            <>
                                                <EditableField
                                                    value={cert.name}
                                                    onSave={(val) => updateCert(cert.id, 'name', val)}
                                                    isEditable={isEditable}
                                                    className="resume-certification-name"
                                                    actions={
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteItem(index); }}
                                                            className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete item"
                                                        >
                                                            <span className="text-lg leading-none">×</span>
                                                        </button>
                                                    }
                                                />
                                                <EditableField
                                                    value={cert.issuer}
                                                    onSave={(val) => updateCert(cert.id, 'issuer', val)}
                                                    isEditable={isEditable}
                                                    className="resume-font-normal resume-text-gray resume-certification-issuer"
                                                />
                                            </>
                                        ) : (
                                            <EditableField
                                                mode="html"
                                                tagName="span"
                                                value={`${stripHtml(cert.name)} - <strong>${stripHtml(cert.issuer || '')}</strong>`}
                                                onSave={(val) => {
                                                    const clean = stripHtml(val);
                                                    const separatorIndex = clean.indexOf(' - ');
                                                    if (separatorIndex === -1) {
                                                        updateCert(cert.id, 'name', clean);
                                                        return;
                                                    }
                                                    const nextName = clean.slice(0, separatorIndex).trim();
                                                    const nextIssuer = clean.slice(separatorIndex + 3).trim();
                                                    updateCertFields(cert.id, { name: nextName, issuer: nextIssuer });
                                                }}
                                                isEditable={isEditable}
                                                className="resume-certification-line"
                                                placeholder="Certification - Issuer"
                                                actions={
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteItem(index); }}
                                                        className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete item"
                                                    >
                                                        <span className="text-lg leading-none">×</span>
                                                    </button>
                                                }
                                            />
                                        )}
                                    </div>
                                    <DatePicker
                                        value={cert.date || ''}
                                        onSave={(val) => updateCert(cert.id, 'date', val)}
                                        isEditable={isEditable}
                                        className="resume-duration-gray resume-certification-date"
                                        mode="single"
                                    />
                                </div>
                            </div>
                        </li>
                    </ItemControls>
                ))}
            </ul>

            {isEditable && (
                <button
                    onClick={addItem}
                    aria-label="Add new certification"
                    className="resume-editor-add group"
                >
                    <div className="p-1 bg-[var(--bg-card)] rounded-lg group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                        <Plus size={14} />
                    </div>
                    Add Certification
                </button>
            )}
        </section >
    );
}
