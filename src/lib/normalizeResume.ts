import type { BulletItem, ResumeSchema } from '../types/resume';
import { sanitizeInlineHtml, sanitizeLinkUrl } from './resumeSanitizer';

const STANDARD_SECTION_ORDER = [
    'summary', 'experience', 'projects', 'openSource', 'skills',
    'education', 'achievements', 'certifications'
];
const MARGINS = new Set(['compact', 'narrow', 'standard', 'wide', 'relaxed']);
const FONTS = new Set(['Inter', 'Merriweather', 'Roboto Mono', 'Outfit', 'Plus Jakarta Sans']);
const CUSTOM_TYPES = new Set(['custom', 'summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'openSource']);

function record(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, any>
        : {};
}

function array(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
}

function richText(value: unknown): string {
    if (typeof value === 'string') return sanitizeInlineHtml(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
}

function text(value: unknown): string {
    return richText(value)
        .replace(/<br\s*\/?\s*>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/ {2,}/g, ' ')
        .trim();
}

function identifier(value: unknown, fallback: string): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function bullet(value: unknown): BulletItem | null {
    if (typeof value === 'string') {
        const clean = sanitizeInlineHtml(value);
        return clean ? clean : null;
    }

    const source = record(value);
    const clean = sanitizeInlineHtml(source.text);
    if (!clean) return null;
    return {
        text: clean,
        ...(typeof source.hasBullet === 'boolean' ? { hasBullet: source.hasBullet } : {})
    };
}

function bullets(value: unknown): BulletItem[] {
    return array(value).map(bullet).filter((item): item is BulletItem => item !== null);
}

function strings(value: unknown): string[] {
    return array(value).map(text).filter(Boolean);
}

function richStrings(value: unknown): string[] {
    return array(value).map(richText).filter(Boolean);
}

function skills(value: unknown, prefix = 'skill') {
    return array(value).map((item, index) => {
        const source = record(item);
        return {
            id: identifier(source.id, `${prefix}-${index + 1}`),
            name: text(source.name),
            items: strings(source.items)
        };
    });
}

function experience(value: unknown, prefix = 'exp') {
    return array(value).map((item, index) => {
        const source = record(item);
        return {
            id: identifier(source.id, `${prefix}-${index + 1}`),
            company: text(source.company),
            role: text(source.role),
            duration: text(source.duration),
            location: text(source.location),
            metrics: bullets(source.metrics),
            techStack: strings(source.techStack),
            ...(source.techStackLabel !== undefined ? { techStackLabel: text(source.techStackLabel) } : {})
        };
    });
}

function projects(value: unknown, prefix = 'project') {
    return array(value).map((item, index) => {
        const source = record(item);
        return {
            id: identifier(source.id, `${prefix}-${index + 1}`),
            name: text(source.name),
            description: richText(source.description),
            techStack: strings(source.techStack),
            ...(source.techStackLabel !== undefined ? { techStackLabel: text(source.techStackLabel) } : {}),
            link: sanitizeLinkUrl(source.link),
            date: text(source.date),
            metrics: bullets(source.metrics)
        };
    });
}

function education(value: unknown, prefix = 'education') {
    return array(value).map((item, index) => {
        const source = record(item);
        return {
            id: identifier(source.id, `${prefix}-${index + 1}`),
            institution: text(source.institution),
            degree: text(source.degree),
            duration: text(source.duration),
            location: text(source.location),
            ...(source.score !== undefined ? { score: text(source.score) } : {}),
            details: bullets(source.details)
        };
    });
}

function certifications(value: unknown, prefix = 'certification') {
    return array(value).map((item, index) => {
        const source = record(item);
        return {
            id: identifier(source.id, `${prefix}-${index + 1}`),
            name: text(source.name),
            issuer: text(source.issuer),
            date: text(source.date)
        };
    });
}

function openSource(value: unknown, prefix = 'open-source') {
    return array(value).map((item, index) => {
        const source = record(item);
        return {
            id: identifier(source.id, `${prefix}-${index + 1}`),
            name: text(source.name),
            description: richText(source.description),
            link: sanitizeLinkUrl(source.link),
            linkText: text(source.linkText),
            date: text(source.date),
            metrics: bullets(source.metrics)
        };
    });
}

function genericCustomItems(value: unknown, sectionId: string) {
    return array(value).map((item, index) => {
        const source = record(item);
        if (typeof item === 'string') {
            return { id: `${sectionId}-item-${index + 1}`, title: '', date: '', content: richText(item) };
        }
        return {
            ...source,
            id: identifier(source.id, `${sectionId}-item-${index + 1}`),
            title: text(source.title),
            date: text(source.date),
            content: richText(source.content ?? source.text ?? source.description)
        };
    });
}

function customSections(value: unknown) {
    return array(value).map((item, index) => {
        const source = record(item);
        const id = identifier(source.id, `custom-${index + 1}`);
        const type = CUSTOM_TYPES.has(source.type) ? source.type : 'custom';
        let items: any[];

        switch (type) {
            case 'summary': items = richStrings(source.items).slice(0, 1); break;
            case 'skills': items = skills(source.items, `${id}-skill`); break;
            case 'experience': items = experience(source.items, `${id}-experience`); break;
            case 'projects': items = projects(source.items, `${id}-project`); break;
            case 'education': items = education(source.items, `${id}-education`); break;
            case 'certifications': items = certifications(source.items, `${id}-certification`); break;
            case 'openSource': items = openSource(source.items, `${id}-open-source`); break;
            default: items = genericCustomItems(source.items, id);
        }

        return { id, title: text(source.title) || 'Custom Section', type, items };
    });
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number) {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function stringRecord(value: unknown) {
    return Object.fromEntries(
        Object.entries(record(value))
            .map(([key, entry]) => [key, text(entry)])
            .filter(([, entry]) => Boolean(entry))
    );
}

function booleanRecord(value: unknown) {
    return Object.fromEntries(
        Object.entries(record(value))
            .filter(([, entry]) => typeof entry === 'boolean')
    ) as Record<string, boolean>;
}

export function normalizeResumeData(value: unknown): ResumeSchema {
    let parsed = value;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            parsed = {};
        }
    }

    const source = record(parsed);
    const personal = record(source.personalInfo);
    const normalizedSkills = skills(source.skills);
    const normalizedExperience = experience(source.experience);
    const normalizedProjects = projects(source.projects);
    const normalizedEducation = education(source.education);
    const normalizedAchievements = bullets(source.achievements);
    const normalizedCertifications = certifications(source.certifications);
    const normalizedOpenSource = openSource(source.openSource);
    const normalizedCustomSections = customSections(source.customSections);
    const config = record(source.config);

    const defaultVisibility: Record<string, boolean> = {
        summary: Boolean(richText(source.summary)),
        skills: normalizedSkills.length > 0,
        experience: normalizedExperience.length > 0,
        projects: normalizedProjects.length > 0,
        education: normalizedEducation.length > 0,
        achievements: normalizedAchievements.length > 0,
        certifications: normalizedCertifications.length > 0,
        openSource: normalizedOpenSource.length > 0,
        ...Object.fromEntries(normalizedCustomSections.map(section => [section.id, true]))
    };
    const suppliedVisibility = booleanRecord(source.visibleSections);
    const suppliedOrder = array(source.sectionOrder).map(item => typeof item === 'string' ? item : '').filter(Boolean);
    const sectionOrder = [...new Set(suppliedOrder.length > 0 ? suppliedOrder : [
        ...STANDARD_SECTION_ORDER,
        ...normalizedCustomSections.map(section => section.id)
    ])];

    return {
        personalInfo: {
            fullName: text(personal.fullName),
            email: text(personal.email),
            phone: text(personal.phone),
            location: text(personal.location),
            title: text(personal.title),
            profiles: array(personal.profiles).map((item) => {
                const profile = record(item);
                return {
                    network: text(profile.network),
                    username: text(profile.username),
                    url: sanitizeLinkUrl(profile.url)
                };
            }).filter(profile => profile.network || profile.username || profile.url)
        },
        summary: richText(source.summary),
        skills: normalizedSkills,
        experience: normalizedExperience,
        projects: normalizedProjects,
        education: normalizedEducation,
        achievements: normalizedAchievements,
        certifications: normalizedCertifications,
        openSource: normalizedOpenSource,
        customSections: normalizedCustomSections,
        config: {
            baseFontSize: finiteNumber(config.baseFontSize, 10, 7, 18),
            fontFamily: FONTS.has(config.fontFamily) ? config.fontFamily : 'Inter',
            margins: MARGINS.has(config.margins) ? config.margins : 'standard',
            lineHeight: finiteNumber(config.lineHeight, 1.35, 1, 2),
            documentMode: config.documentMode === 'singlePage' ? 'singlePage' : 'standard',
            ...(typeof config.accentColor === 'string' ? { accentColor: config.accentColor } : {})
        },
        sectionOrder,
        visibleSections: { ...defaultVisibility, ...suppliedVisibility },
        sectionTitles: stringRecord(source.sectionTitles),
        sectionSeparators: booleanRecord(source.sectionSeparators),
        ...(typeof source.targetJD === 'string' ? { targetJD: source.targetJD } : {})
    };
}
