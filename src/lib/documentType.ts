import type { ResumeSchema } from '../types/resume';

export type DocumentType = 'resume' | 'cv';

// Read from the content rather than stored as a choice, so it stays right when someone adds
// Publications to a resume or trims a CV down for an industry job.
const ACADEMIC_SECTION_TITLE = /research|publication|teaching|grant|fellowship|conference|talks?\b|\bpapers?\b|presentation|thesis|dissertation/i;

/** An academic CV is a document with at least one academic section; everything else is a resume. */
export function documentTypeOf(resume: Pick<ResumeSchema, 'customSections'>): DocumentType {
    return (resume.customSections || []).some((section) => ACADEMIC_SECTION_TITLE.test(section.title || '')) ? 'cv' : 'resume';
}
