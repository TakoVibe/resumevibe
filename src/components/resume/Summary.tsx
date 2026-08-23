import type { ResumeSchema } from '../../types/resume';
import { SectionTitle } from './SectionTitle';
import { EditableField } from '../ui/EditableField';
import { InlineAIButton } from '../ui/InlineAIButton';
import { ATSWarning } from '../ui/ATSWarning';

interface Props {
    summary: string;
    isEditable?: boolean;
    onUpdate?: (summary: string) => void;
    title?: string;
    onTitleChange?: (newTitle: string) => void;
    showSeparator?: boolean;
    onToggleSeparator?: (show: boolean) => void;
    viewMode?: 'desktop' | 'mobile';
    auditResult?: any;
    targetJD?: string;
}

export function Summary({ summary, isEditable = false, onUpdate, title = "Summary", onTitleChange, showSeparator, onToggleSeparator, viewMode = 'desktop', auditResult, targetJD }: Props) {
    const summaryGap = auditResult?.insights?.find((i: any) =>
        i.type === 'gap' && (i.category?.toLowerCase().includes('summary') || i.category?.toLowerCase().includes('narrative'))
    );

    return (
        <section data-tour={isEditable ? 'resume-summary' : undefined} className="resume-section-mb-12">
            <SectionTitle
                title={title}
                isEditable={isEditable}
                onChange={onTitleChange}
                showSeparator={showSeparator}
                onToggleSeparator={onToggleSeparator}
                gapText={summaryGap?.text}
            />
            <EditableField
                tagName="div"
                value={summary}
                onSave={(val) => onUpdate?.(val)}
                isEditable={isEditable}
                mode="html"
                className="resume-summary-text"
                aiProps={{
                    type: 'summary',
                    context: {
                        jobDescription: targetJD
                    }
                }}
            />
            {isEditable && summary.includes('<') && (
                <ATSWarning type="formatting" className="mt-2" />
            )}
        </section>
    );
}
