import type { ResumeSchema } from '../../types/resume';
import { softwareEngineerExample } from '../resumeExamples';

// One-page resume, offered on /create. The early-career example, minus open source, leaves
// room for the editor's own controls so the one-page layout opens without an overflow warning.
export default {
    ...softwareEngineerExample,
    visibleSections: { ...softwareEngineerExample.visibleSections, openSource: false },
    config: { ...softwareEngineerExample.config, documentMode: 'singlePage' },
} satisfies ResumeSchema;
