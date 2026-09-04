import type { ResumeSchema } from '../types/resume';
import { RESUME_MARGIN_PADDING, SINGLE_PAGE_PADDING, resolveResumeMarginKey } from './resumeLayout';

export interface ResumePdfPayload {
    html: string;
    css: string;
}

async function fetchStylesheet(path: string) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load export stylesheet: ${path}`);
    return response.text();
}

function removeImports(css: string) {
    return css.replace(/@import\s+(?:url\()?[^;]+;?/gi, '');
}

export async function buildResumePdfPayload(element: HTMLElement, data: ResumeSchema): Promise<ResumePdfPayload> {
    const [resumeCss, printCss, singlePageCss] = await Promise.all([
        fetchStylesheet('/resume.css'),
        fetchStylesheet('/print.css'),
        fetchStylesheet('/single-page-resume.css')
    ]);

    const isSinglePageMode = data.config?.documentMode === 'singlePage';
    const marginKey = resolveResumeMarginKey(data.config?.margins, isSinglePageMode);
    const pageRules = isSinglePageMode
        ? `
            @page { margin: ${SINGLE_PAGE_PADDING[marginKey].continuationTop} 0 0 0 !important; size: A4; }
            @page :first { margin: 0 0 ${SINGLE_PAGE_PADDING[marginKey].firstPageBottom} 0 !important; }
        `
        : `@page { margin: ${RESUME_MARGIN_PADDING[marginKey]} !important; size: A4; }`;

    const exportOverrides = `
        ${pageRules}
        html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
        #resume-preview-content, #resume-preview-for-generation {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
        }
    `;

    return {
        html: element.outerHTML,
        css: [removeImports(resumeCss), printCss, singlePageCss, exportOverrides].join('\n')
    };
}

