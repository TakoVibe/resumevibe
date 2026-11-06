import type { ResumeSchema } from '../types/resume';

interface AccountContact {
    email: string;
    first_name: string;
    last_name: string;
}

// Placeholder contact details from the examples, current and older drafts' values.
const PLACEHOLDER_PHONES = new Set(['+1 (555) 010-0100', '+1 (555) 123-4567']);
const PLACEHOLDER_LOCATIONS = new Set(['City, State', 'Austin, TX', 'Seattle, WA']);

// Keep the visitor's edits, but do not copy untouched fictional contact details
// into their saved profile resume.
export function prepareExampleForProfile(resume: ResumeSchema, user: AccountContact): ResumeSchema {
    const personalInfo = resume.personalInfo;
    const accountName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return {
        ...resume,
        personalInfo: {
            ...personalInfo,
            fullName: personalInfo.fullName === 'Johnathan Doe' ? accountName : personalInfo.fullName,
            email: personalInfo.email === 'johnathan.doe@example.com' ? user.email : personalInfo.email,
            phone: PLACEHOLDER_PHONES.has(personalInfo.phone) ? '' : personalInfo.phone,
            location: PLACEHOLDER_LOCATIONS.has(personalInfo.location) ? '' : personalInfo.location,
        },
    };
}
