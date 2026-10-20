import type { ResumeSchema } from '../types/resume';

// Older example drafts predate the open-source section. Add it once without
// replacing the visitor's edits or restoring a section they later remove.
export function addOpenSourceToOlderExampleDraft(stored: ResumeSchema, template: ResumeSchema): ResumeSchema {
    if (!template.openSource?.length || stored.openSource?.length || stored.sectionOrder.includes('openSource')) return stored;
    const sectionOrder = [...stored.sectionOrder];
    const educationIndex = sectionOrder.indexOf('education');
    sectionOrder.splice(educationIndex < 0 ? sectionOrder.length : educationIndex, 0, 'openSource');
    return {
        ...stored,
        openSource: template.openSource,
        sectionOrder,
        visibleSections: { ...stored.visibleSections, openSource: true },
    };
}
