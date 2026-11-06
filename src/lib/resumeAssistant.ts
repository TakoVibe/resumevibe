import type { ResumeSchema } from '../types/resume';

export const RESUME_ASSISTANT_TOKEN_COST = 5;
export const RESUME_ASSISTANT_ACTION_TYPE = 'inline_edit';
export const MAX_ASSISTANT_SUGGESTIONS = 3;

export type ResumeAssistantMemoryCategory = 'technology' | 'work_context' | 'achievement' | 'target_role' | 'preference';

export interface ResumeAssistantMemoryFact {
    id: string;
    category: ResumeAssistantMemoryCategory;
    fact: string;
    createdAt: number;
}

export type AssistantSection = 'summary' | 'experience' | 'projects' | 'skills' | 'achievements' | 'education' | 'openSource' | 'certifications' | 'custom';
export type AssistantAction = 'replace' | 'remove';
export type AssistantEvidence = 'resume' | 'user' | 'confirmation';

export interface AssistantSuggestion {
    id: string;
    /** Absent on suggestions saved before removals existed, which were all replacements. */
    action?: AssistantAction;
    section: AssistantSection;
    /** Entry id, or the custom section id when section is "custom". */
    targetId: string;
    /** Entry inside a custom section; empty elsewhere. */
    itemId?: string;
    targetIndex: number;
    before: string;
    /** The replacement text, or for a removal the plain-words outcome shown on the card. */
    after: string;
    reason: string;
    evidence: AssistantEvidence;
    /** What the user sees as the changed place, e.g. a custom section's title. */
    label?: string;
}

export interface RawAssistantSuggestion {
    action: AssistantAction;
    section: AssistantSection;
    targetId: string;
    itemId: string;
    targetIndex: number;
    after: string;
    reason: string;
    evidence: AssistantEvidence;
}

export interface DroppedAssistantSuggestion {
    section: AssistantSection;
    targetId: string;
    itemId: string;
    targetIndex: number;
    reason: 'empty' | 'unmatched' | 'unchanged' | 'duplicate';
}

const SECTION_LABELS: Record<Exclude<AssistantSection, 'custom'>, string> = {
    summary: 'Summary',
    experience: 'Experience',
    projects: 'Projects',
    skills: 'Skills',
    achievements: 'Achievements',
    education: 'Education',
    openSource: 'Open source',
    certifications: 'Certifications',
};

const HIDDEN_OUTCOME = 'Hidden from your resume. Use Show section in the editor to bring it back.';
const REMOVED_OUTCOME = 'Removed from your resume.';

function list(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
}

function itemText(item: unknown) {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'text' in item) return String((item as { text?: unknown }).text || '');
    return '';
}

const INLINE_FORMAT = /<(strong|em|b|i)>([^<]+)<\/\1>/gi;

/** Rewrites often drop the user's bold/italic; re-apply it to every phrase that survived word for word. */
export function restoreInlineFormatting(before: string, after: string) {
    if (/<(strong|em|b|i)>/i.test(after)) return after;
    let result = after;
    for (const [, tag, phrase] of before.matchAll(INLINE_FORMAT)) {
        const text = phrase.trim();
        const index = text ? result.indexOf(text) : -1;
        if (index === -1) continue;
        result = `${result.slice(0, index)}<${tag}>${text}</${tag}>${result.slice(index + text.length)}`;
    }
    return result;
}

function withText(current: unknown, text: string) {
    return typeof current === 'string' ? text : { ...(current as object), text };
}

/** Finds the text a suggestion would replace; null when the model pointed at something that does not exist. */
function locate(raw: RawAssistantSuggestion, resume: Record<string, any>) {
    const index = raw.targetIndex;
    switch (raw.section) {
        case 'summary':
            return { before: String(resume.summary || ''), targetId: '', itemId: '', targetIndex: -1, label: SECTION_LABELS.summary };
        case 'experience': {
            const entry = list(resume.experience).find((item) => String(item?.id) === raw.targetId);
            if (!entry || index < 0 || index >= list(entry.metrics).length) return null;
            return { before: itemText(entry.metrics[index]), targetId: raw.targetId, itemId: '', targetIndex: index, label: SECTION_LABELS.experience };
        }
        case 'projects': {
            const entry = list(resume.projects).find((item) => String(item?.id) === raw.targetId);
            if (!entry) return null;
            return { before: String(entry.description || ''), targetId: raw.targetId, itemId: '', targetIndex: -1, label: SECTION_LABELS.projects };
        }
        case 'skills': {
            const entry = list(resume.skills).find((item) => String(item?.id) === raw.targetId);
            if (!entry || !Array.isArray(entry.items)) return null;
            return { before: entry.items.map(String).join(', '), targetId: raw.targetId, itemId: '', targetIndex: -1, label: SECTION_LABELS.skills };
        }
        case 'achievements': {
            const achievements = list(resume.achievements);
            if (index < 0 || index >= achievements.length) return null;
            return { before: itemText(achievements[index]), targetId: '', itemId: '', targetIndex: index, label: SECTION_LABELS.achievements };
        }
        case 'custom': {
            const section = list(resume.customSections).find((item) => String(item?.id) === raw.targetId);
            if (!section) return null;
            const label = String(section.title || 'Custom section');
            if (section.type === 'summary') {
                return { before: itemText(list(section.items)[0]), targetId: raw.targetId, itemId: '', targetIndex: 0, label };
            }
            const item = list(section.items).find((entry) => String(entry?.id) === raw.itemId);
            if (!item) return null;
            if (section.type === 'experience') {
                if (index < 0 || index >= list(item.metrics).length) return null;
                return { before: itemText(item.metrics[index]), targetId: raw.targetId, itemId: raw.itemId, targetIndex: index, label };
            }
            if (section.type === 'custom') {
                return { before: String(item.content ?? ''), targetId: raw.targetId, itemId: raw.itemId, targetIndex: -1, label };
            }
            return null;
        }
        default:
            return null;
    }
}

function entryHeading(entry: any) {
    if (typeof entry === 'string' || (entry && typeof entry === 'object' && 'text' in entry)) return itemText(entry);
    return [entry?.role, entry?.degree, entry?.title, entry?.name, entry?.company, entry?.institution, entry?.issuer]
        .filter((part) => typeof part === 'string' && part.trim())
        .join(' · ') || String(entry?.content || '') || itemText(list(entry?.metrics)[0]);
}

function sectionContents(label: string, entries: unknown[]) {
    const headings = entries.map(entryHeading).filter(Boolean);
    return headings.length ? `${label}: ${headings.join('; ')}` : label;
}

/** Finds what a removal would take out; null when the model pointed at something that does not exist. */
function locateRemoval(raw: RawAssistantSuggestion, resume: Record<string, any>) {
    const { section, targetId, itemId, targetIndex } = raw;
    if (section === 'custom') {
        const custom = list(resume.customSections).find((item) => String(item?.id) === targetId);
        if (!custom) return null;
        const label = String(custom.title || 'Custom section');
        if (!itemId) return { before: sectionContents(label, list(custom.items)), targetId, itemId: '', targetIndex: -1, label, after: REMOVED_OUTCOME };
        const item = list(custom.items).find((entry) => String(entry?.id) === itemId);
        if (!item) return null;
        if (targetIndex < 0) return { before: entryHeading(item), targetId, itemId, targetIndex: -1, label, after: REMOVED_OUTCOME };
        if (custom.type !== 'experience' || targetIndex >= list(item.metrics).length) return null;
        return { before: itemText(item.metrics[targetIndex]), targetId, itemId, targetIndex, label, after: REMOVED_OUTCOME };
    }

    const label = String(resume.sectionTitles?.[section] || SECTION_LABELS[section] || section);
    const wholeSection = {
        before: section === 'summary' ? String(resume.summary || label) : sectionContents(label, list(resume[section])),
        targetId: '', itemId: '', targetIndex: -1, label, after: HIDDEN_OUTCOME,
    };
    if (section === 'summary') return wholeSection;
    if (section === 'achievements') {
        if (targetIndex < 0) return wholeSection;
        const achievement = list(resume.achievements)[targetIndex];
        return achievement === undefined ? null : { before: itemText(achievement), targetId: '', itemId: '', targetIndex, label, after: REMOVED_OUTCOME };
    }
    if (!targetId) return wholeSection;
    const entry = list(resume[section]).find((item) => String(item?.id) === targetId);
    if (!entry) return null;
    if (section === 'experience' && targetIndex >= 0) {
        if (targetIndex >= list(entry.metrics).length) return null;
        return { before: itemText(entry.metrics[targetIndex]), targetId, itemId: '', targetIndex, label, after: REMOVED_OUTCOME };
    }
    return { before: entryHeading(entry), targetId, itemId: '', targetIndex: -1, label, after: REMOVED_OUTCOME };
}

/**
 * Takes out what a removal points at. Whole standard sections are hidden, exactly like the
 * editor's hide control, so they can be shown again; custom sections are deleted like the
 * editor's delete control. Returns the same object when there is nothing to remove.
 */
function removeTarget(data: ResumeSchema, suggestion: AssistantSuggestion): ResumeSchema {
    const { section, targetId, itemId, targetIndex } = suggestion;
    const without = <T,>(items: T[], index: number) => items.filter((_, position) => position !== index);
    const hide = (key: string) => (data.visibleSections?.[key] === false
        ? data
        : { ...data, visibleSections: { ...data.visibleSections, [key]: false } });

    if (section === 'custom') {
        const custom = (data.customSections || []).find((item) => item.id === targetId);
        if (!custom) return data;
        if (!itemId) {
            const { [targetId]: _removed, ...visibleSections } = data.visibleSections || {};
            return {
                ...data,
                customSections: (data.customSections || []).filter((item) => item.id !== targetId),
                sectionOrder: data.sectionOrder.filter((key) => key !== targetId),
                visibleSections,
            };
        }
        let changed = false;
        const items = custom.items.flatMap((item: any) => {
            if (item?.id !== itemId) return [item];
            if (targetIndex < 0) {
                changed = true;
                return [];
            }
            if (!Array.isArray(item.metrics) || item.metrics[targetIndex] === undefined) return [item];
            changed = true;
            return [{ ...item, metrics: without(item.metrics, targetIndex) }];
        });
        return changed
            ? { ...data, customSections: (data.customSections || []).map((item) => (item.id === targetId ? { ...item, items } : item)) }
            : data;
    }
    if (section === 'summary') return hide('summary');
    if (section === 'achievements') {
        if (targetIndex < 0) return hide('achievements');
        return data.achievements[targetIndex] === undefined ? data : { ...data, achievements: without(data.achievements, targetIndex) };
    }
    if (!targetId) return hide(section);

    const entries = list((data as any)[section]);
    const entry = entries.find((item) => item?.id === targetId);
    if (!entry) return data;
    if (section === 'experience' && targetIndex >= 0) {
        if (!Array.isArray(entry.metrics) || entry.metrics[targetIndex] === undefined) return data;
        return {
            ...data,
            experience: data.experience.map((item) => (item.id === targetId ? { ...item, metrics: without(item.metrics, targetIndex) } : item)),
        };
    }
    return { ...data, [section]: entries.filter((item) => item?.id !== targetId) };
}

/**
 * Keeps only suggestions that point at real text, change it, and are the first for their target,
 * so the panel never shows a change it cannot apply or two versions of the same bullet.
 */
export function canonicalizeAssistantSuggestions(raw: RawAssistantSuggestion[], resume: Record<string, any>, now = Date.now()) {
    const suggestions: AssistantSuggestion[] = [];
    const dropped: DroppedAssistantSuggestion[] = [];
    const seenTargets = new Set<string>();

    raw.forEach((suggestion, index) => {
        const target = { section: suggestion.section, targetId: suggestion.targetId, itemId: suggestion.itemId, targetIndex: suggestion.targetIndex };
        if (suggestion.action === 'remove') {
            const located = locateRemoval(suggestion, resume);
            if (!located) return dropped.push({ ...target, reason: 'unmatched' });
            const key = [suggestion.section, located.targetId, located.itemId, located.targetIndex].join('|');
            if (seenTargets.has(key)) return dropped.push({ ...target, reason: 'duplicate' });
            const removal: AssistantSuggestion = {
                id: `assistant-${now}-${index}`,
                action: 'remove',
                section: suggestion.section,
                targetId: located.targetId,
                itemId: located.itemId,
                targetIndex: located.targetIndex,
                before: located.before,
                after: located.after,
                reason: suggestion.reason.trim() || 'Removes this as you asked.',
                evidence: 'resume',
                label: located.label,
            };
            if (removeTarget(resume as ResumeSchema, removal) === resume) return dropped.push({ ...target, reason: 'unchanged' });
            seenTargets.add(key);
            return suggestions.push(removal);
        }
        if (!suggestion.after.trim()) return dropped.push({ ...target, reason: 'empty' });
        const located = locate(suggestion, resume);
        if (!located) return dropped.push({ ...target, reason: 'unmatched' });
        const after = restoreInlineFormatting(located.before, suggestion.after.trim());
        if (located.before.trim() === after) return dropped.push({ ...target, reason: 'unchanged' });
        const key = [suggestion.section, located.targetId, located.itemId, located.targetIndex].join('|');
        if (seenTargets.has(key)) return dropped.push({ ...target, reason: 'duplicate' });
        seenTargets.add(key);

        suggestions.push({
            id: `assistant-${now}-${index}`,
            action: 'replace',
            section: suggestion.section,
            targetId: located.targetId,
            itemId: located.itemId,
            targetIndex: located.targetIndex,
            before: located.before,
            after,
            reason: suggestion.reason.trim() || 'Makes this part of the resume clearer and more relevant.',
            evidence: suggestion.evidence,
            label: located.label,
        });
    });

    return { suggestions: suggestions.slice(0, MAX_ASSISTANT_SUGGESTIONS), dropped };
}

/** The section key the editor highlights for a suggestion: custom sections are keyed by their id. */
export function assistantHighlightKey(suggestion: Pick<AssistantSuggestion, 'section' | 'targetId'>) {
    return suggestion.section === 'custom' ? suggestion.targetId : suggestion.section;
}

/** Returns the resume with the suggestion applied, or the same object when its target no longer exists. */
export function applyAssistantSuggestion(data: ResumeSchema, suggestion: AssistantSuggestion): ResumeSchema {
    if (suggestion.action === 'remove') return removeTarget(data, suggestion);
    const { after, targetId, targetIndex } = suggestion;

    switch (suggestion.section) {
        case 'summary':
            return data.summary === after ? data : { ...data, summary: after };
        case 'experience': {
            let changed = false;
            const experience = data.experience.map((entry) => {
                if (entry.id !== targetId || entry.metrics[targetIndex] === undefined) return entry;
                const metrics = [...entry.metrics];
                metrics[targetIndex] = withText(entry.metrics[targetIndex], after) as typeof metrics[number];
                changed = true;
                return { ...entry, metrics };
            });
            return changed ? { ...data, experience } : data;
        }
        case 'projects': {
            let changed = false;
            const projects = data.projects.map((project) => {
                if (project.id !== targetId) return project;
                changed = true;
                return { ...project, description: after };
            });
            return changed ? { ...data, projects } : data;
        }
        case 'skills': {
            const items = after.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
            let changed = false;
            const skills = data.skills.map((group) => {
                if (group.id !== targetId) return group;
                changed = true;
                return { ...group, items };
            });
            return changed ? { ...data, skills } : data;
        }
        case 'achievements': {
            const current = data.achievements[targetIndex];
            if (current === undefined) return data;
            const achievements = [...data.achievements];
            achievements[targetIndex] = withText(current, after) as typeof achievements[number];
            return { ...data, achievements };
        }
        case 'custom': {
            let changed = false;
            const customSections = (data.customSections || []).map((section) => {
                if (section.id !== targetId) return section;
                if (section.type === 'summary') {
                    changed = true;
                    return { ...section, items: [after] };
                }
                const items = section.items.map((item) => {
                    if (item?.id !== suggestion.itemId) return item;
                    if (section.type === 'experience') {
                        if (!Array.isArray(item.metrics) || item.metrics[targetIndex] === undefined) return item;
                        const metrics = [...item.metrics];
                        metrics[targetIndex] = withText(item.metrics[targetIndex], after);
                        changed = true;
                        return { ...item, metrics };
                    }
                    if (section.type !== 'custom') return item;
                    changed = true;
                    return { ...item, content: after };
                });
                return { ...section, items };
            });
            return changed ? { ...data, customSections } : data;
        }
        default:
            return data;
    }
}
