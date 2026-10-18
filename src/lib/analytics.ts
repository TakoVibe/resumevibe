// Only public product pages and non-content event fields go to the optional
// analytics provider. Resume data, application IDs, and URL queries stay out.
const PUBLIC_PATHS = new Set(['/', '/job-fit', '/application-copilot', '/ai-tools', '/ats-resume-guide', '/why-resumevibe', '/buy-tokens']);
const EVENT_FIELDS = new Set([
    'page', 'action', 'destination', 'source', 'stage', 'resume_source',
    'decision', 'coverage', 'requirement_count', 'free_first_check',
    'resume_change_count', 'accepted_change_count', 'has_cover_letter',
    'token_pack', 'value', 'currency',
]);

export function isAnalyticsPage(pathname: string) {
    return PUBLIC_PATHS.has(pathname.replace(/\/$/, '') || '/');
}

export function analyticsEventParameters(details: Record<string, unknown>) {
    return Object.fromEntries(Object.entries(details).filter(([key, value]) => (
        EVENT_FIELDS.has(key)
        && (typeof value === 'boolean'
            || (typeof value === 'number' && Number.isFinite(value))
            || (typeof value === 'string' && value.length <= 80 && !/[@?=]|https?:\/\//i.test(value)))
    )));
}
