import type { BulletItem, ResumeSchema } from '../types/resume';
import { sanitizeInlineHtml } from './resumeSanitizer';

/**
 * Sections whose written content the tailoring pass is allowed to rewrite.
 * Certifications are deliberately absent: every field on them is a verifiable
 * fact, so they only ever receive advisory feedback.
 */
export const TAILORABLE_SECTIONS = [
    'summary',
    'skills',
    'experience',
    'projects',
    'openSource',
    'achievements',
    'education',
    'customSections',
] as const;

export type TailorableSection = (typeof TAILORABLE_SECTIONS)[number];

/** Sections the model must comment on, whether or not it rewrote them. */
export const FEEDBACK_SECTIONS = [...TAILORABLE_SECTIONS, 'certifications', 'overall'] as const;

export type FeedbackSection = (typeof FEEDBACK_SECTIONS)[number];

export const SECTION_LABELS: Record<FeedbackSection, string> = {
    summary: 'Professional summary',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    openSource: 'Open source',
    achievements: 'Achievements',
    education: 'Education',
    customSections: 'Custom sections',
    certifications: 'Certifications',
    overall: 'Overall resume',
};

export interface ChangeReview {
    section: TailorableSection;
    whatChanged: string;
    why: string;
    jobRequirement: string;
    riskLevel: 'none' | 'low' | 'high';
    risk: string;
}

export interface MissingSkill {
    skill: string;
    priority: 'must-have' | 'preferred';
    jobEvidence: string;
    advice: string;
}

export interface SectionFeedback {
    section: FeedbackSection;
    verdict: 'strong' | 'needs-work' | 'missing';
    observation: string;
    action: string;
}

export interface RequirementReview {
    requirement: string;
    status: 'matched' | 'partial' | 'gap';
    evidence: string;
}

// ---------------------------------------------------------------------------
// Response contract
// ---------------------------------------------------------------------------

const bulletRewriteSchema = {
    type: 'array',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['sourceIndex', 'text'],
        properties: {
            // Index of the source bullet this line replaces. Addressing bullets by
            // origin instead of position lets the model reorder for impact while
            // every metric stays attached to the achievement it came from.
            sourceIndex: { type: 'integer' },
            text: { type: 'string' },
        },
    },
} as const;

export const TAILORED_RESUME_RESPONSE_FORMAT = {
    type: 'json_schema' as const,
    json_schema: {
        name: 'tailored_application_package',
        strict: true,
        schema: {
            type: 'object',
            additionalProperties: false,
            required: [
                'optimizedSummary',
                'optimizedSkills',
                'optimizedExperience',
                'optimizedProjects',
                'optimizedOpenSource',
                'optimizedAchievements',
                'optimizedEducation',
                'optimizedCustomSections',
                'requirements',
                'missingSkills',
                'sectionFeedback',
                'issues',
                'changeReviews',
                'coverLetter',
            ],
            properties: {
                optimizedSummary: { type: 'string' },
                optimizedSkills: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['id', 'name', 'items'],
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            items: { type: 'array', items: { type: 'string' } },
                        },
                    },
                },
                optimizedExperience: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['id', 'metrics', 'techStack'],
                        properties: {
                            id: { type: 'string' },
                            metrics: bulletRewriteSchema,
                            techStack: { type: 'array', items: { type: 'string' } },
                        },
                    },
                },
                optimizedProjects: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['id', 'description', 'metrics', 'techStack'],
                        properties: {
                            id: { type: 'string' },
                            description: { type: 'string' },
                            metrics: bulletRewriteSchema,
                            techStack: { type: 'array', items: { type: 'string' } },
                        },
                    },
                },
                optimizedOpenSource: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['id', 'description', 'metrics'],
                        properties: {
                            id: { type: 'string' },
                            description: { type: 'string' },
                            metrics: bulletRewriteSchema,
                        },
                    },
                },
                optimizedAchievements: bulletRewriteSchema,
                optimizedEducation: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['id', 'details'],
                        properties: {
                            id: { type: 'string' },
                            details: bulletRewriteSchema,
                        },
                    },
                },
                optimizedCustomSections: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['id', 'items'],
                        properties: {
                            id: { type: 'string' },
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    additionalProperties: false,
                                    required: ['id', 'content'],
                                    properties: {
                                        id: { type: 'string' },
                                        content: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
                requirements: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['requirement', 'status', 'evidence'],
                        properties: {
                            requirement: { type: 'string' },
                            status: { type: 'string', enum: ['matched', 'partial', 'gap'] },
                            evidence: { type: 'string' },
                        },
                    },
                },
                missingSkills: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['skill', 'priority', 'jobEvidence', 'advice'],
                        properties: {
                            skill: { type: 'string' },
                            priority: { type: 'string', enum: ['must-have', 'preferred'] },
                            jobEvidence: { type: 'string' },
                            advice: { type: 'string' },
                        },
                    },
                },
                sectionFeedback: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['section', 'verdict', 'observation', 'action'],
                        properties: {
                            section: { type: 'string', enum: [...FEEDBACK_SECTIONS] },
                            verdict: { type: 'string', enum: ['strong', 'needs-work', 'missing'] },
                            observation: { type: 'string' },
                            action: { type: 'string' },
                        },
                    },
                },
                issues: { type: 'array', items: { type: 'string' } },
                changeReviews: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['section', 'whatChanged', 'why', 'jobRequirement', 'riskLevel', 'risk'],
                        properties: {
                            section: { type: 'string', enum: [...TAILORABLE_SECTIONS] },
                            whatChanged: { type: 'string' },
                            why: { type: 'string' },
                            jobRequirement: { type: 'string' },
                            riskLevel: { type: 'string', enum: ['none', 'low', 'high'] },
                            risk: { type: 'string' },
                        },
                    },
                },
                coverLetter: { type: 'string' },
            },
        },
    },
};

export const TAILORING_SYSTEM_PROMPT = `You are a senior technical recruiter and resume editor. In one pass you tailor a complete resume to one job description, and you never invent a fact.

WHAT YOU REWRITE
Rewrite the wording of every section that already has content: the summary, skill group names and grouping, experience bullets, project descriptions and bullets, open-source descriptions and bullets, achievements, education details, and custom section content. If a section is empty, leave it empty and report it in sectionFeedback.

WHAT YOU NEVER CHANGE
- Any id.
- Employer, role title, dates, durations, locations, institution, degree, score, certification name, issuer, project name, link, or custom item title and date.
- Any number, percentage, currency amount, or scale. A rewritten line may only contain numbers that already appear in the exact line it replaces. If you cannot keep a metric where it belongs, leave that line as it is.
- The set of skills. Regroup, rename groups, and reorder freely, but never add a skill the resume does not already list and never delete one.
- The number of bullets in an entry. Every source bullet appears exactly once in your output, addressed by its sourceIndex. You may change the order so the strongest evidence reads first.

WRITING RULES (how recruiters actually screen)
1. One line, one outcome. Open with a strong past-tense action verb (Architected, Reduced, Migrated, Automated, Led). Never "Responsible for", "Worked on", "Helped with", "Tasked with".
2. Keep the metric that is already there, but make the result the point: what changed, for whom, at what scale.
3. Front-load the keywords this job actually uses, but only where the resume already supports them. Mirror the employer's vocabulary for the same thing (for example "CI/CD" instead of "build pipelines") when both describe the same evidenced work.
4. Cut filler, hedging, first person, and phrasing repeated across bullets. Aim for 12-28 words per bullet.
5. Summary: 2-3 sentences. Target title first, then the strongest evidenced specialisms, then scale. No adjective you cannot prove from the resume.
6. Skills: group them the way this employer thinks about the work, most relevant group first, most relevant skill first inside each group. Rename a vague group ("Other", "Misc") to something a recruiter scans for.
7. Emphasis: <strong> on at most two genuinely high-weight terms per line, and only on an existing metric or a technology this job names. Never bold a whole clause. Inline tags only (<strong>, <em>) - never headings, lists, tables, or divs.
8. Stay ATS-plain: no tables, columns, icons, emoji, or decorative characters.

WHAT YOU REPORT INSTEAD OF WRITING
- missingSkills: every skill, tool, or qualification this job requires that the resume does not evidence. Never add these to the resume. List them so the candidate decides: name where the job asks for it, and give one honest next step (cite adjacent evidence they already have, learn it before applying, or treat the role as a stretch).
- sectionFeedback: one entry for each resume section plus one for "overall". Cover sections you did not change and sections that are empty or missing. Say what a recruiter will see, then the single most valuable next action.
- requirements: 3-8 important job requirements scored against the CURRENT resume, not against your rewrite. For a gap, write "No supporting evidence found."
- issues: factual risks, unsupported requirements, and anything you refused to write.
- changeReviews: one record for each section you actually changed.

Finally, draft a cover letter of three short paragraphs, 180-220 words, from the same evidence. Plain text, no HTML, no invented facts.

Return only valid JSON matching the provided schema.`;

// ---------------------------------------------------------------------------
// Fact guards
//
// The prompt asks the model to preserve facts; these helpers make it true.
// Structural fields are copied from the source rather than read back from the
// model, and any rewritten line that introduces a number the source line does
// not contain is discarded in favour of the original wording. Numbers are the
// claims a recruiter can check, so they are the ones worth enforcing in code.
// ---------------------------------------------------------------------------

const NUMERIC_TOKEN = /\d+(?:[.,]\d+)*/g;

function plainText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function numericTokens(value: unknown): string[] {
    return (plainText(value).match(NUMERIC_TOKEN) || [])
        .map((token) => token.replace(/,/g, '').replace(/\.0+$/, ''));
}

function introducesUnsupportedNumbers(rewrite: string, sources: unknown[]): boolean {
    const supported = new Set(sources.flatMap(numericTokens));
    return numericTokens(rewrite).some((token) => !supported.has(token));
}

function bulletText(bullet: BulletItem): string {
    return typeof bullet === 'string' ? bullet : String(bullet?.text || '');
}

function withBulletText(bullet: BulletItem, text: string): BulletItem {
    return typeof bullet === 'string' ? text : { ...bullet, text };
}

function normalizeKey(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLocaleLowerCase() : '';
}

function asRecordsById(value: unknown): Map<string, Record<string, unknown>> {
    if (!Array.isArray(value)) return new Map();
    return new Map(
        value
            .filter((item): item is Record<string, unknown> =>
                Boolean(item) && typeof item === 'object' && typeof (item as any).id === 'string')
            .map((item) => [item.id as string, item]),
    );
}

interface GuardTally {
    /** Lines the model rewrote but that were rejected for adding a number. */
    blockedNumberRewrites: number;
    /** Entries whose bullet list was ignored because it was not a clean permutation. */
    blockedStructureRewrites: number;
    /** Skill names the model tried to introduce that the resume does not list. */
    blockedSkillAdditions: string[];
}

function createTally(): GuardTally {
    return { blockedNumberRewrites: 0, blockedStructureRewrites: 0, blockedSkillAdditions: [] };
}

interface BulletRewrite {
    /** Fully applied bullets: every surviving rewrite, in the proposed order. */
    bullets: BulletItem[] | undefined;
    /** Proposed reading order, expressed as source indices. */
    order: number[];
    /** Each surviving line rewrite, addressed by the source bullet it replaces. */
    rewrites: Array<{ sourceIndex: number; before: string; after: string }>;
}

function identityOrder(length: number): number[] {
    return Array.from({ length }, (_, index) => index);
}

function isIdentityOrder(order: number[]): boolean {
    return order.every((sourceIndex, position) => sourceIndex === position);
}

/**
 * Rewrites a bullet list. `proposed` must address every source bullet exactly
 * once by `sourceIndex`; anything else is treated as a malformed response and
 * the original list is kept untouched.
 *
 * The reordering and each line rewrite are reported separately so the reviewer
 * can take any subset of them.
 */
function rewriteBullets(
    source: BulletItem[] | undefined,
    proposed: unknown,
    tally: GuardTally,
): BulletRewrite {
    if (!Array.isArray(source) || source.length === 0) {
        return { bullets: source, order: [], rewrites: [] };
    }

    const untouched: BulletRewrite = { bullets: source, order: identityOrder(source.length), rewrites: [] };
    if (!Array.isArray(proposed) || proposed.length !== source.length) {
        if (Array.isArray(proposed) && proposed.length) tally.blockedStructureRewrites += 1;
        return untouched;
    }

    const seen = new Set<number>();
    const ordered: Array<{ index: number; text: string }> = [];
    for (const entry of proposed) {
        if (!entry || typeof entry !== 'object') break;
        const record = entry as Record<string, unknown>;
        const index = Number(record.sourceIndex);
        if (!Number.isInteger(index) || index < 0 || index >= source.length || seen.has(index)) break;
        seen.add(index);
        ordered.push({ index, text: typeof record.text === 'string' ? record.text : '' });
    }

    if (ordered.length !== source.length) {
        tally.blockedStructureRewrites += 1;
        return untouched;
    }

    const rewrites: BulletRewrite['rewrites'] = [];
    const bullets = ordered.map(({ index, text }) => {
        const original = source[index];
        const before = bulletText(original);
        const rewrite = sanitizeInlineHtml(text);
        if (!rewrite || plainText(rewrite) === plainText(before)) return original;
        if (introducesUnsupportedNumbers(rewrite, [before])) {
            tally.blockedNumberRewrites += 1;
            return original;
        }
        rewrites.push({ sourceIndex: index, before, after: rewrite });
        return withBulletText(original, rewrite);
    });

    return { bullets, order: ordered.map((entry) => entry.index), rewrites };
}

/** Keeps only technologies the source entry already claims. */
function filterTechStack(source: unknown, proposed: unknown): string[] | undefined {
    const original = Array.isArray(source) ? source.filter((item): item is string => typeof item === 'string') : undefined;
    if (!original || original.length === 0) return original;
    if (!Array.isArray(proposed)) return original;

    const supported = new Map(original.map((item) => [normalizeKey(item), item]));
    const kept: string[] = [];
    const used = new Set<string>();
    for (const item of proposed) {
        const key = normalizeKey(item);
        const match = supported.get(key);
        if (match && !used.has(key)) {
            used.add(key);
            kept.push(match);
        }
    }
    // A partial list would silently drop evidence, so only accept a full reorder.
    return kept.length === original.length ? kept : original;
}

function rewriteFreeText(source: unknown, proposed: unknown, evidence: unknown[], tally: GuardTally): string | undefined {
    if (typeof source !== 'string' || !source.trim()) return typeof source === 'string' ? source : undefined;
    if (typeof proposed !== 'string' || !proposed.trim()) return source;

    const rewrite = sanitizeInlineHtml(proposed);
    if (!rewrite || plainText(rewrite) === plainText(source)) return source;
    if (introducesUnsupportedNumbers(rewrite, evidence)) {
        tally.blockedNumberRewrites += 1;
        return source;
    }
    return rewrite;
}

/**
 * Regroups skills. The model may rename groups and move skills between them,
 * but the union of skills must match the source exactly - no additions, no
 * quiet deletions. Anything the resume does not list is reported, not merged.
 */
function tailorSkills(source: ResumeSchema['skills'], proposed: unknown, tally: GuardTally): ResumeSchema['skills'] {
    if (!Array.isArray(source) || source.length === 0) return source;
    const proposedById = asRecordsById(proposed);
    if (proposedById.size !== source.length || source.some((group) => !proposedById.has(group.id))) return source;

    const supported = new Map<string, string>();
    source.forEach((group) => {
        (Array.isArray(group.items) ? group.items : []).forEach((item) => {
            if (typeof item === 'string' && item.trim()) supported.set(normalizeKey(item), item);
        });
    });

    const claimed = new Set<string>();
    const regrouped = source.map((group) => {
        const candidate = proposedById.get(group.id)!;
        const items: string[] = [];
        if (Array.isArray(candidate.items)) {
            for (const item of candidate.items) {
                const key = normalizeKey(item);
                if (!key) continue;
                const match = supported.get(key);
                if (!match) {
                    if (typeof item === 'string' && !tally.blockedSkillAdditions.includes(item.trim())) {
                        tally.blockedSkillAdditions.push(item.trim());
                    }
                    continue;
                }
                if (claimed.has(key)) continue;
                claimed.add(key);
                items.push(match);
            }
        }
        const name = typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : group.name;
        return { ...group, id: group.id, name, items };
    });

    // Every source skill must survive somewhere, otherwise discard the regrouping.
    if (claimed.size !== supported.size) return source;

    const withContent = regrouped.filter((group) => group.items.length > 0);
    return withContent.length > 0 ? withContent : source;
}

// ---------------------------------------------------------------------------
// Proposals
//
// Every edit is surfaced as an individually selectable proposal rather than a
// section-level take-it-or-leave-it. A line rewrite and the reordering of the
// entry it lives in are separate proposals, so any subset composes into a
// valid resume: text substitutions are keyed by source index and the ordering
// is applied last.
// ---------------------------------------------------------------------------

export type ProposalKind = 'text' | 'bullet' | 'order' | 'techStack' | 'skills';

interface ProposalBase {
    id: string;
    section: TailorableSection;
    /** Entry the proposal belongs to, or null for whole-section fields. */
    entryId: string | null;
    entryHeading: string;
    label: string;
}

export interface TextProposal extends ProposalBase {
    kind: 'text';
    field: 'summary' | 'description' | 'content';
    itemId?: string;
    before: string;
    after: string;
}

export interface BulletProposal extends ProposalBase {
    kind: 'bullet';
    sourceIndex: number;
    before: string;
    after: string;
}

export interface OrderProposal extends ProposalBase {
    kind: 'order';
    afterOrder: number[];
    beforeLines: string[];
    afterLines: string[];
}

export interface TechStackProposal extends ProposalBase {
    kind: 'techStack';
    beforeItems: string[];
    afterItems: string[];
}

export interface SkillsProposal extends ProposalBase {
    kind: 'skills';
    beforeSkills: ResumeSchema['skills'];
    afterSkills: ResumeSchema['skills'];
}

export type Proposal = TextProposal | BulletProposal | OrderProposal | TechStackProposal | SkillsProposal;

export interface TailoringResult {
    /** Every proposal applied - the "accept everything" resume. */
    optimizedResume: ResumeSchema;
    changedSections: TailorableSection[];
    proposals: Proposal[];
    guardNotes: string[];
}

function bulletLines(bullets: BulletItem[] | undefined, order: number[]): string[] {
    if (!Array.isArray(bullets)) return [];
    return order.map((sourceIndex) => bulletText(bullets[sourceIndex])).filter((line) => line.trim().length > 0);
}

/**
 * Merges the model's proposal onto the source resume, section by section.
 * Returns the fully applied resume, the individually selectable proposals
 * behind it, and any guard notes worth showing the user. The source resume is
 * never mutated.
 */
export function mergeTailoredResume(resume: ResumeSchema, parsed: Record<string, any>): TailoringResult {
    const tally = createTally();
    const optimizedResume: ResumeSchema = { ...resume };
    const proposals: Proposal[] = [];

    const pushTechStackProposal = (
        section: TailorableSection,
        entryId: string,
        entryHeading: string,
        source: string[] | undefined,
        reordered: string[] | undefined,
    ) => {
        if (!Array.isArray(source) || !Array.isArray(reordered)) return;
        if (JSON.stringify(source) === JSON.stringify(reordered)) return;
        proposals.push({
            id: `${section}:${entryId}:techStack`,
            section,
            entryId,
            entryHeading,
            label: 'Reorder tech stack to lead with what this job names',
            kind: 'techStack',
            beforeItems: source,
            afterItems: reordered,
        });
    };

    const pushBulletProposals = (
        section: TailorableSection,
        entryId: string | null,
        entryHeading: string,
        source: BulletItem[] | undefined,
        result: BulletRewrite,
        bulletNoun: string,
    ) => {
        result.rewrites.forEach(({ sourceIndex, before, after }) => {
            proposals.push({
                id: `${section}:${entryId ?? '_'}:bullet:${sourceIndex}`,
                section,
                entryId,
                entryHeading,
                label: `${bulletNoun} ${sourceIndex + 1}`,
                kind: 'bullet',
                sourceIndex,
                before,
                after,
            });
        });

        if (result.order.length > 1 && !isIdentityOrder(result.order)) {
            proposals.push({
                id: `${section}:${entryId ?? '_'}:order`,
                section,
                entryId,
                entryHeading,
                label: 'Reorder to lead with the strongest evidence',
                kind: 'order',
                afterOrder: result.order,
                beforeLines: bulletLines(source, identityOrder(result.order.length)),
                afterLines: bulletLines(source, result.order),
            });
        }
    };

    // Summary metrics usually restate evidence from elsewhere in the resume, so
    // the whole document is the allowed number pool for this one field.
    const resumeNumberEvidence = [
        ...(Array.isArray(resume.experience) ? resume.experience.flatMap((item) => [
            ...(Array.isArray(item.metrics) ? item.metrics.map(bulletText) : []),
            item.duration || '',
        ]) : []),
        ...(Array.isArray(resume.projects) ? resume.projects.flatMap((item) => [
            item.description || '',
            ...(Array.isArray(item.metrics) ? item.metrics.map(bulletText) : []),
        ]) : []),
        ...(Array.isArray(resume.achievements) ? resume.achievements.map(bulletText) : []),
        resume.summary || '',
    ];
    optimizedResume.summary = rewriteFreeText(resume.summary, parsed.optimizedSummary, resumeNumberEvidence, tally) ?? resume.summary;
    if (optimizedResume.summary !== resume.summary) {
        proposals.push({
            id: 'summary:_:text',
            section: 'summary',
            entryId: null,
            entryHeading: '',
            label: 'Rewritten summary',
            kind: 'text',
            field: 'summary',
            before: resume.summary,
            after: optimizedResume.summary,
        });
    }

    optimizedResume.skills = tailorSkills(resume.skills, parsed.optimizedSkills, tally);
    if (JSON.stringify(optimizedResume.skills) !== JSON.stringify(resume.skills)) {
        proposals.push({
            id: 'skills:_:skills',
            section: 'skills',
            entryId: null,
            entryHeading: '',
            // Regrouping is all-or-nothing on purpose: taking half of it could
            // duplicate or drop a skill, which is exactly what the guards forbid.
            label: 'Regroup and reorder skills',
            kind: 'skills',
            beforeSkills: resume.skills,
            afterSkills: optimizedResume.skills,
        });
    }

    if (Array.isArray(resume.experience)) {
        const proposedById = asRecordsById(parsed.optimizedExperience);
        optimizedResume.experience = resume.experience.map((original) => {
            const candidate = proposedById.get(original.id);
            if (!candidate) return original;
            const metrics = rewriteBullets(original.metrics, candidate.metrics, tally);
            const heading = `${original.role} · ${original.company}`;
            pushBulletProposals('experience', original.id, heading, original.metrics, metrics, 'Bullet');
            const techStack = original.techStack === undefined
                ? undefined
                : filterTechStack(original.techStack, candidate.techStack);
            pushTechStackProposal('experience', original.id, heading, original.techStack, techStack);
            return {
                ...original,
                id: original.id,
                company: original.company,
                role: original.role,
                duration: original.duration,
                metrics: metrics.bullets || original.metrics,
                ...(original.techStack === undefined ? {} : { techStack }),
            };
        });
    }

    if (Array.isArray(resume.projects)) {
        const proposedById = asRecordsById(parsed.optimizedProjects);
        optimizedResume.projects = resume.projects.map((original) => {
            const candidate = proposedById.get(original.id);
            if (!candidate) return original;
            const evidence = [original.description || '', ...(Array.isArray(original.metrics) ? original.metrics.map(bulletText) : [])];
            const description = original.description === undefined
                ? undefined
                : rewriteFreeText(original.description, candidate.description, evidence, tally);
            if (description !== undefined && description !== original.description) {
                proposals.push({
                    id: `projects:${original.id}:description`,
                    section: 'projects',
                    entryId: original.id,
                    entryHeading: original.name,
                    label: 'Description',
                    kind: 'text',
                    field: 'description',
                    before: original.description || '',
                    after: description,
                });
            }
            const metrics = rewriteBullets(original.metrics, candidate.metrics, tally);
            pushBulletProposals('projects', original.id, original.name, original.metrics, metrics, 'Bullet');
            const techStack = original.techStack === undefined
                ? undefined
                : filterTechStack(original.techStack, candidate.techStack);
            pushTechStackProposal('projects', original.id, original.name, original.techStack, techStack);
            return {
                ...original,
                id: original.id,
                name: original.name,
                ...(original.description === undefined ? {} : { description }),
                ...(original.metrics === undefined ? {} : { metrics: metrics.bullets }),
                ...(original.techStack === undefined ? {} : { techStack }),
            };
        });
    }

    if (Array.isArray(resume.openSource)) {
        const proposedById = asRecordsById(parsed.optimizedOpenSource);
        optimizedResume.openSource = resume.openSource.map((original) => {
            const candidate = proposedById.get(original.id);
            if (!candidate) return original;
            const evidence = [original.description || '', ...(Array.isArray(original.metrics) ? original.metrics.map(bulletText) : [])];
            const description = original.description === undefined
                ? undefined
                : rewriteFreeText(original.description, candidate.description, evidence, tally);
            if (description !== undefined && description !== original.description) {
                proposals.push({
                    id: `openSource:${original.id}:description`,
                    section: 'openSource',
                    entryId: original.id,
                    entryHeading: original.name,
                    label: 'Description',
                    kind: 'text',
                    field: 'description',
                    before: original.description || '',
                    after: description,
                });
            }
            const metrics = rewriteBullets(original.metrics, candidate.metrics, tally);
            pushBulletProposals('openSource', original.id, original.name, original.metrics, metrics, 'Bullet');
            return {
                ...original,
                id: original.id,
                name: original.name,
                ...(original.description === undefined ? {} : { description }),
                ...(original.metrics === undefined ? {} : { metrics: metrics.bullets }),
            };
        });
    }

    if (Array.isArray(resume.achievements)) {
        const achievements = rewriteBullets(resume.achievements, parsed.optimizedAchievements, tally);
        pushBulletProposals('achievements', null, '', resume.achievements, achievements, 'Achievement');
        optimizedResume.achievements = achievements.bullets || resume.achievements;
    }

    if (Array.isArray(resume.education)) {
        const proposedById = asRecordsById(parsed.optimizedEducation);
        optimizedResume.education = resume.education.map((original) => {
            const candidate = proposedById.get(original.id);
            if (!candidate) return original;
            const details = rewriteBullets(original.details, candidate.details, tally);
            pushBulletProposals(
                'education',
                original.id,
                `${original.degree} · ${original.institution}`,
                original.details,
                details,
                'Detail',
            );
            return {
                ...original,
                id: original.id,
                institution: original.institution,
                degree: original.degree,
                duration: original.duration,
                location: original.location,
                ...(original.score === undefined ? {} : { score: original.score }),
                ...(original.details === undefined ? {} : { details: details.bullets }),
            };
        });
    }

    if (Array.isArray(resume.customSections)) {
        const proposedById = asRecordsById(parsed.optimizedCustomSections);
        optimizedResume.customSections = resume.customSections.map((original) => {
            const candidate = proposedById.get(original.id);
            if (!candidate || !Array.isArray(original.items)) return original;
            const proposedItems = asRecordsById(candidate.items);
            return {
                ...original,
                id: original.id,
                title: original.title,
                items: original.items.map((item: any) => {
                    if (!item || typeof item !== 'object' || typeof item.id !== 'string') return item;
                    const itemCandidate = proposedItems.get(item.id);
                    if (!itemCandidate) return item;
                    const content = rewriteFreeText(item.content, itemCandidate.content, [item.content], tally) ?? item.content;
                    if (content !== item.content) {
                        proposals.push({
                            id: `customSections:${original.id}:content:${item.id}`,
                            section: 'customSections',
                            entryId: original.id,
                            entryHeading: original.title,
                            label: item.title ? String(item.title) : 'Item',
                            kind: 'text',
                            field: 'content',
                            itemId: item.id,
                            before: String(item.content || ''),
                            after: content,
                        });
                    }
                    return {
                        ...item,
                        id: item.id,
                        ...(item.title === undefined ? {} : { title: item.title }),
                        ...(item.date === undefined ? {} : { date: item.date }),
                        content,
                    };
                }),
            };
        });
    }

    const changedSections = TAILORABLE_SECTIONS.filter(
        (section) => JSON.stringify(resume[section] ?? null) !== JSON.stringify(optimizedResume[section] ?? null),
    );

    const guardNotes: string[] = [];
    if (tally.blockedNumberRewrites > 0) {
        guardNotes.push(`${tally.blockedNumberRewrites} rewritten line${tally.blockedNumberRewrites === 1 ? '' : 's'} introduced a number your resume does not contain, so the original wording was kept.`);
    }
    if (tally.blockedStructureRewrites > 0) {
        guardNotes.push(`${tally.blockedStructureRewrites} ${tally.blockedStructureRewrites === 1 ? 'entry' : 'entries'} came back with a mismatched bullet list, so those bullets were left unchanged.`);
    }
    if (tally.blockedSkillAdditions.length > 0) {
        guardNotes.push(`Not added to your skills because your resume does not evidence them: ${tally.blockedSkillAdditions.slice(0, 8).join(', ')}.`);
    }

    return { optimizedResume, changedSections, proposals, guardNotes };
}

/**
 * Rebuilds a resume from the source plus only the selected proposals. Ordering
 * is applied after text substitution, so accepting a rewrite without its
 * reorder (or the reverse) both produce a coherent entry.
 */
export function applyProposals(
    resume: ResumeSchema,
    proposals: Proposal[],
    selectedIds: Set<string> | string[],
): ResumeSchema {
    const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
    const chosen = proposals.filter((proposal) => selected.has(proposal.id));
    if (chosen.length === 0) return resume;

    const byEntry = new Map<string, Proposal[]>();
    chosen.forEach((proposal) => {
        const key = `${proposal.section}:${proposal.entryId ?? '_'}`;
        const bucket = byEntry.get(key);
        if (bucket) bucket.push(proposal);
        else byEntry.set(key, [proposal]);
    });

    const next: ResumeSchema = { ...resume };

    const rebuildBullets = (section: TailorableSection, entryId: string | null, source: BulletItem[] | undefined) => {
        if (!Array.isArray(source) || source.length === 0) return source;
        const bucket = byEntry.get(`${section}:${entryId ?? '_'}`);
        if (!bucket) return source;

        const texts = source.slice();
        bucket.forEach((proposal) => {
            if (proposal.kind !== 'bullet') return;
            if (proposal.sourceIndex < 0 || proposal.sourceIndex >= source.length) return;
            texts[proposal.sourceIndex] = withBulletText(source[proposal.sourceIndex], proposal.after);
        });

        const orderProposal = bucket.find((proposal): proposal is OrderProposal => proposal.kind === 'order');
        const order = orderProposal?.afterOrder;
        const isValidOrder = Array.isArray(order)
            && order.length === source.length
            && new Set(order).size === order.length
            && order.every((index) => Number.isInteger(index) && index >= 0 && index < source.length);

        return (isValidOrder ? order! : identityOrder(source.length)).map((index) => texts[index]);
    };

    const techStackFor = (section: TailorableSection, entryId: string) =>
        byEntry.get(`${section}:${entryId}`)
            ?.find((proposal): proposal is TechStackProposal => proposal.kind === 'techStack')?.afterItems;

    const textFor = (section: TailorableSection, entryId: string | null, field: TextProposal['field'], itemId?: string) => {
        const bucket = byEntry.get(`${section}:${entryId ?? '_'}`);
        return bucket?.find((proposal): proposal is TextProposal =>
            proposal.kind === 'text' && proposal.field === field && proposal.itemId === itemId)?.after;
    };

    const summary = textFor('summary', null, 'summary');
    if (summary !== undefined) next.summary = summary;

    const skillsProposal = chosen.find((proposal): proposal is SkillsProposal => proposal.kind === 'skills');
    if (skillsProposal) next.skills = skillsProposal.afterSkills;

    if (Array.isArray(resume.experience)) {
        next.experience = resume.experience.map((entry) => {
            const techStack = techStackFor('experience', entry.id);
            return {
                ...entry,
                metrics: rebuildBullets('experience', entry.id, entry.metrics) || entry.metrics,
                ...(techStack === undefined ? {} : { techStack }),
            };
        });
    }

    if (Array.isArray(resume.projects)) {
        next.projects = resume.projects.map((entry) => {
            const description = textFor('projects', entry.id, 'description');
            const techStack = techStackFor('projects', entry.id);
            return {
                ...entry,
                ...(description === undefined ? {} : { description }),
                ...(entry.metrics === undefined ? {} : { metrics: rebuildBullets('projects', entry.id, entry.metrics) }),
                ...(techStack === undefined ? {} : { techStack }),
            };
        });
    }

    if (Array.isArray(resume.openSource)) {
        next.openSource = resume.openSource.map((entry) => {
            const description = textFor('openSource', entry.id, 'description');
            return {
                ...entry,
                ...(description === undefined ? {} : { description }),
                ...(entry.metrics === undefined ? {} : { metrics: rebuildBullets('openSource', entry.id, entry.metrics) }),
            };
        });
    }

    if (Array.isArray(resume.achievements)) {
        next.achievements = rebuildBullets('achievements', null, resume.achievements) || resume.achievements;
    }

    if (Array.isArray(resume.education)) {
        next.education = resume.education.map((entry) => ({
            ...entry,
            ...(entry.details === undefined ? {} : { details: rebuildBullets('education', entry.id, entry.details) }),
        }));
    }

    if (Array.isArray(resume.customSections)) {
        next.customSections = resume.customSections.map((section) => ({
            ...section,
            items: (Array.isArray(section.items) ? section.items : []).map((item: any) => {
                if (!item || typeof item !== 'object' || typeof item.id !== 'string') return item;
                const content = textFor('customSections', section.id, 'content', item.id);
                return content === undefined ? item : { ...item, content };
            }),
        }));
    }

    return next;
}

// ---------------------------------------------------------------------------
// Advisory normalizers
// ---------------------------------------------------------------------------

export function normalizeChangeReviews(value: unknown): ChangeReview[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const review = item as Record<string, unknown>;
        const section = String(review.section) as TailorableSection;
        if (!TAILORABLE_SECTIONS.includes(section)) return [];
        return [{
            section,
            whatChanged: String(review.whatChanged || 'Content was rewritten for the target role.'),
            why: String(review.why || 'Improves relevance and makes supporting evidence easier to find.'),
            jobRequirement: String(review.jobRequirement || 'Relevant responsibilities in the job description'),
            riskLevel: (['none', 'low', 'high'].includes(String(review.riskLevel)) ? review.riskLevel : 'low') as ChangeReview['riskLevel'],
            risk: String(review.risk || 'Confirm the wording accurately reflects your experience.'),
        }];
    }).slice(0, TAILORABLE_SECTIONS.length);
}

export function normalizeMissingSkills(value: unknown): MissingSkill[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const entry = item as Record<string, unknown>;
        const skill = String(entry.skill || '').trim();
        if (!skill || seen.has(skill.toLocaleLowerCase())) return [];
        seen.add(skill.toLocaleLowerCase());
        return [{
            skill,
            priority: (entry.priority === 'must-have' ? 'must-have' : 'preferred') as MissingSkill['priority'],
            jobEvidence: String(entry.jobEvidence || 'Named in the job description.'),
            advice: String(entry.advice || 'Decide whether you can evidence this honestly before adding it.'),
        }];
    }).slice(0, 12);
}

export function normalizeSectionFeedback(value: unknown): SectionFeedback[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const entry = item as Record<string, unknown>;
        const section = String(entry.section) as FeedbackSection;
        if (!FEEDBACK_SECTIONS.includes(section) || seen.has(section)) return [];
        seen.add(section);
        return [{
            section,
            verdict: (['strong', 'needs-work', 'missing'].includes(String(entry.verdict)) ? entry.verdict : 'needs-work') as SectionFeedback['verdict'],
            observation: String(entry.observation || 'Reviewed against standard resume screening criteria.'),
            action: String(entry.action || 'No change required.'),
        }];
    }).sort((a, b) => FEEDBACK_SECTIONS.indexOf(a.section) - FEEDBACK_SECTIONS.indexOf(b.section));
}

export function normalizeRequirements(value: unknown): RequirementReview[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const entry = item as Record<string, unknown>;
        const requirement = String(entry.requirement || '').trim();
        if (!requirement) return [];
        return [{
            requirement,
            status: (['matched', 'partial', 'gap'].includes(String(entry.status)) ? entry.status : 'partial') as RequirementReview['status'],
            evidence: String(entry.evidence || 'No supporting evidence found.'),
        }];
    }).slice(0, 8);
}

/**
 * Strips the resume down to the content the model is allowed to rewrite, plus
 * the factual anchors it needs for context. Sending less keeps the single call
 * affordable and removes any temptation to edit layout or contact details.
 */
export function buildTailoringPayload(resume: ResumeSchema, jobDescription: string, auditGaps: string[] = []) {
    const bullets = (items: BulletItem[] | undefined) =>
        (Array.isArray(items) ? items : []).map((item, index) => ({ sourceIndex: index, text: bulletText(item) }));

    return {
        jobDescription,
        ...(auditGaps.length ? { auditGaps } : {}),
        resume: {
            targetTitle: resume.personalInfo?.title || '',
            location: resume.personalInfo?.location || '',
            summary: resume.summary || '',
            skills: (Array.isArray(resume.skills) ? resume.skills : []).map((group) => ({
                id: group.id,
                name: group.name,
                items: Array.isArray(group.items) ? group.items : [],
            })),
            experience: (Array.isArray(resume.experience) ? resume.experience : []).map((item) => ({
                id: item.id,
                company: item.company,
                role: item.role,
                duration: item.duration,
                location: item.location,
                metrics: bullets(item.metrics),
                techStack: item.techStack || [],
            })),
            projects: (Array.isArray(resume.projects) ? resume.projects : []).map((item) => ({
                id: item.id,
                name: item.name,
                description: item.description || '',
                metrics: bullets(item.metrics),
                techStack: item.techStack || [],
            })),
            openSource: (Array.isArray(resume.openSource) ? resume.openSource : []).map((item) => ({
                id: item.id,
                name: item.name,
                description: item.description || '',
                metrics: bullets(item.metrics),
            })),
            achievements: bullets(resume.achievements),
            education: (Array.isArray(resume.education) ? resume.education : []).map((item) => ({
                id: item.id,
                institution: item.institution,
                degree: item.degree,
                duration: item.duration,
                score: item.score || '',
                details: bullets(item.details),
            })),
            certifications: (Array.isArray(resume.certifications) ? resume.certifications : []).map((item) => ({
                id: item.id,
                name: item.name,
                issuer: item.issuer,
                date: item.date || '',
            })),
            customSections: (Array.isArray(resume.customSections) ? resume.customSections : []).map((section) => ({
                id: section.id,
                title: section.title,
                items: (Array.isArray(section.items) ? section.items : []).map((item: any) => ({
                    id: item?.id,
                    title: item?.title || '',
                    date: item?.date || '',
                    content: item?.content || '',
                })),
            })),
        },
    };
}
