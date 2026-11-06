import type { ResumeSchema } from '../types/resume';
import { initialResume } from './sample-resume';
import { normalizeResumeData } from '../lib/normalizeResume';

/*
 * Starter templates: one file per template in ./templates, picked up automatically.
 * The file name is the template id, and the link to start from it is
 *   /editor?fresh=1&start=<id>        (templates/campus.ts -> start=campus)
 * To add one, for example a university's own format, add templates/<id>.ts with
 * `export default { ... } satisfies ResumeSchema`; nothing else needs to change.
 * Rule 1: template content is placeholder only. Never a real person's name, contact
 * details, address or profile links.
 */
const templateFiles = import.meta.glob<ResumeSchema>('./templates/*.ts', { eager: true, import: 'default' });

export const START_TEMPLATES = new Map<string, ResumeSchema>(
    Object.entries(templateFiles).map(([path, template]) => [path.replace(/^\.\/templates\/|\.ts$/g, ''), template]),
);

let starterSnapshots: Set<string> | null = null;

/**
 * True while a document is still exactly a starter: the sample resume or a template.
 * Autosave skips these so opening the editor never creates a document by itself. Any edit,
 * or an explicit Save, makes the document the user's.
 */
export function isUntouchedStarter(data: ResumeSchema) {
    starterSnapshots ??= new Set([initialResume, ...START_TEMPLATES.values()].map((starter) => JSON.stringify(normalizeResumeData(starter))));
    return starterSnapshots.has(JSON.stringify(normalizeResumeData(data)));
}
