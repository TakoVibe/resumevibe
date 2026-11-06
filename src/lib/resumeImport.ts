import type { ResumeSchema } from '../types/resume';

export const RESUME_IMPORT_TOKEN_COST = 50;
export const MAX_IMPORT_PDF_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_TEXT_CHARS = 60_000;

export type ImportPurpose = 'import' | 'job_fit';
export type ImportSource = 'pdf' | 'text';

// Existing billing keys: the backend applies the free first job-fit check to job_fit_* actions.
export function importActionType(purpose: ImportPurpose, source: ImportSource) {
    return purpose === 'job_fit' ? `job_fit_import_${source}` : `import_resume_${source}`;
}

const STANDARD_SECTIONS = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'openSource', 'achievements'] as const;
type StandardSection = typeof STANDARD_SECTIONS[number];

const STANDARD_LABELS: Record<StandardSection, string> = {
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certifications: 'Certifications',
    openSource: 'Open source',
    achievements: 'Achievements',
};

export function buildResumeImportPrompt(text: string) {
    return `You are an expert resume and CV parser. Convert the document below into JSON without losing any section.

Return a JSON object with exactly these keys:
{
  "personalInfo": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "title": "string (optional job title)",
    "profiles": [{"network": "string", "username": "string", "url": "string"}]
  },
  "summary": "string (professional summary, objective, or research statement)",
  "experience": [
    {"id": "exp-1", "company": "string", "role": "string", "duration": "string", "location": "string", "metrics": ["bullet"], "techStack": ["tech"], "techStackLabel": "string"}
  ],
  "education": [
    {"id": "edu-1", "institution": "string", "degree": "string", "duration": "string", "location": "string", "score": "string (optional GPA, thesis, or advisor)", "details": ["detail"]}
  ],
  "skills": [{"id": "skill-1", "name": "Category name", "items": ["skill"]}],
  "projects": [
    {"id": "proj-1", "name": "string", "techStack": ["tech"], "techStackLabel": "string", "link": "string", "date": "string", "metrics": ["description as the first bullet", "achievement"]}
  ],
  "certifications": [{"id": "cert-1", "name": "string", "issuer": "string", "date": "string"}],
  "openSource": [{"id": "os-1", "name": "string", "description": "string", "link": "string", "date": "string"}],
  "achievements": ["one string per award, honour, or achievement"],
  "customSections": [
    {
      "id": "custom-1",
      "title": "the section heading exactly as written",
      "type": "experience or custom",
      "items": ["for type experience: objects shaped like experience entries; for type custom: {\\"id\\": \\"string\\", \\"title\\": \\"string\\", \\"date\\": \\"string\\", \\"content\\": \\"string\\"}"]
    }
  ],
  "sectionOrder": ["section keys in the order they appear in the document: summary, experience, education, skills, projects, certifications, openSource, achievements, or a customSections id"]
}

Rules:
- Every heading that does not match a standard key becomes a customSections entry. Never drop a section, and never move its content into experience or projects.
- Academic CVs: research positions, labs, and teaching or TA roles go into customSections with type "experience" (company = lab, institution, or course; role = position).
- Publications, presentations and talks, grants and fellowships, references, memberships, service, and languages go into customSections with type "custom", one item per entry.
- Publications: title = the paper or book title, date = the year, content = authors, venue, volume, and pages as written.
- References: title = the person's name, content = their role, institution, and contact details as written.
- A plain list of awards or honours goes into achievements; awards with dates or descriptions go into a custom section.
- Generate a unique id for every item. Do not merge separate entries, even with the same title or dates.
- Keep the source order. Normalise dates to 'MMM YYYY' (e.g. 'Aug 2018 - Present'); a year alone stays a year.
- Projects: put any description paragraph in metrics as the first bullet; do not use a description field.
- Put technologies, tools, and infrastructure into techStack arrays.
- Preserve the original wording of bullets, citations, and descriptions; do not summarise or rewrite them.
- Open source: sections titled "Open Source", "Contributions", or "Community Work", with repository or PR links.
- The text may contain PDF extraction artifacts; infer section boundaries sensibly.
- Use an empty array for missing sections. Return only the JSON object.

Document:
${text}`;
}

function list(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
}

/** Turns the model's JSON into editor data: stable custom ids, source order kept, every non-empty section visible. */
export function buildImportedResume(parsed: Record<string, any>): Record<string, any> {
    const idsFromModel = new Map<string, string>();
    const customSections = list(parsed.customSections)
        .filter((section) => section && list(section.items).length > 0)
        .map((section, index) => {
            const id = `imported-${index + 1}`;
            if (section.id) idsFromModel.set(String(section.id), id);
            return { ...section, id, type: section.type === 'experience' ? 'experience' : 'custom' };
        });

    const present = STANDARD_SECTIONS.filter((key) => key === 'summary'
        ? typeof parsed.summary === 'string' && parsed.summary.trim() !== ''
        : list(parsed[key]).length > 0);
    const allSections = new Set<string>([...present, ...customSections.map((section) => section.id)]);
    const requestedOrder = list(parsed.sectionOrder)
        .map((key) => idsFromModel.get(String(key)) ?? String(key))
        .filter((key) => allSections.has(key));
    const sectionOrder = [...new Set([...requestedOrder, ...allSections])];

    return {
        ...parsed,
        achievements: list(parsed.achievements),
        openSource: list(parsed.openSource),
        customSections,
        config: { baseFontSize: 10, fontFamily: 'Inter', margins: 'standard', lineHeight: 1.35 },
        sectionOrder,
        visibleSections: {
            ...Object.fromEntries(STANDARD_SECTIONS.map((key) => [key, false])),
            ...Object.fromEntries(sectionOrder.map((key) => [key, true])),
        },
    };
}

/** What an import produced, in document order, for the post-import banner. */
export function summarizeImport(resume: ResumeSchema): Array<{ title: string; count: number | null }> {
    const custom = new Map((resume.customSections || []).map((section) => [section.id, section]));
    return resume.sectionOrder
        .filter((key) => resume.visibleSections[key])
        .map((key) => {
            const section = custom.get(key);
            if (section) return { title: section.title, count: section.type === 'summary' ? null : section.items.length };
            if (key === 'summary') return { title: STANDARD_LABELS.summary, count: null };
            const label = STANDARD_LABELS[key as StandardSection];
            return label ? { title: label, count: list((resume as any)[key]).length } : null;
        })
        .filter((entry): entry is { title: string; count: number | null } => entry !== null);
}
