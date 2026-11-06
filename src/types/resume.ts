export interface PersonalInfo {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    profiles: Array<{
        network: string;
        username: string;
        url: string;
    }>;
    title?: string;
}

export type BulletItem = string | { text: string; hasBullet?: boolean };

/** How a single-column document is laid out: the default, or the Indian campus-placement format. */
export type ResumeLayout = 'standard' | 'campus';

export interface ResumeSchema {
    personalInfo: PersonalInfo;
    summary: string;
    skills: Array<{
        id: string;
        name: string;
        items: string[];
    }>;
    experience: Array<{
        id: string;
        company: string;
        role: string;
        duration: string;
        location?: string;
        metrics: BulletItem[];
        techStack?: string[];
        techStackLabel?: string;
    }>;
    projects: Array<{
        id: string;
        name: string;
        description?: string;
        techStack?: string[];
        techStackLabel?: string;
        link?: string;
        date?: string;
        metrics?: BulletItem[];
    }>;
    openSource?: Array<{
        id: string;
        name: string;
        description?: string;
        link?: string;
        linkText?: string;
        date?: string;
        metrics?: BulletItem[];
    }>;
    education: Array<{
        id: string;
        institution: string;
        degree: string;
        duration: string;
        location: string;
        score?: string;
        details?: BulletItem[];
    }>;
    achievements: BulletItem[];
    certifications: Array<{
        id: string;
        name: string;
        issuer: string;
        date?: string;
    }>;
    customSections?: Array<{
        id: string;
        title: string;
        type?: 'custom' | 'summary' | 'experience' | 'projects' | 'education' | 'skills' | 'certifications' | 'openSource';
        items: Array<any>;
    }>;

    // Global Configuration
    config?: {
        baseFontSize?: number; // default 10
        accentColor?: string;
        fontFamily?: string;

        margins?: 'compact' | 'narrow' | 'standard' | 'wide' | 'relaxed';
        lineHeight?: number; // 1.0 to 2.0
        documentMode?: 'standard' | 'singlePage' | 'campus';
    };

    // Layout Configuration
    sectionOrder: string[];
    visibleSections: Record<string, boolean>;
    sectionTitles?: Record<string, string>;
    sectionSeparators?: Record<string, boolean>;
    targetJD?: string;
}
