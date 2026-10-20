import type { ResumeSchema } from '../types/resume';

interface AccountContact {
    email: string;
    first_name: string;
    last_name: string;
}

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
            phone: personalInfo.phone === '+1 (555) 123-4567' ? '' : personalInfo.phone,
            location: ['Austin, TX', 'Seattle, WA'].includes(personalInfo.location) ? '' : personalInfo.location,
        },
    };
}
