import { api } from './api';

export interface ResumeNavigationTarget {
    slug: string;
    updated_at?: string;
}

export function resumeEditorUrl(slug: string, extraParams?: Record<string, string>) {
    const params = new URLSearchParams({ edit: slug, ...extraParams });
    return `/?${params.toString()}`;
}

export async function fetchLatestResume(): Promise<ResumeNavigationTarget | null> {
    const response = await api.get('/api/resumes/');
    if (!response.ok) return null;

    const payload = await response.json();
    const resumes = (Array.isArray(payload) ? payload : (payload.results || [])) as ResumeNavigationTarget[];
    const validResumes = resumes.filter((resume) => Boolean(resume?.slug));
    if (validResumes.length === 0) return null;

    return [...validResumes].sort((left, right) => {
        const leftUpdatedAt = left.updated_at ? new Date(left.updated_at).getTime() : 0;
        const rightUpdatedAt = right.updated_at ? new Date(right.updated_at).getTime() : 0;
        return rightUpdatedAt - leftUpdatedAt;
    })[0];
}
