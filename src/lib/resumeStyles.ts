// The resume stylesheets are served from public/ under fixed URLs, which Cloudflare and browsers
// cache for hours. Each link carries a hash of the files' contents (set in astro.config.mjs), so a
// URL changes exactly when the styles change and a deploy reaches every visitor at once.
const version = import.meta.env.PUBLIC_RESUME_STYLES_VERSION || 'dev';

export const versionedStylesheet = (path: string) => `${path}?v=${version}`;

/** In cascade order: print and one-page rules first, as resume.css used to @import them. */
export const RESUME_STYLESHEETS = ['/print.css', '/single-page-resume.css', '/resume.css'].map(versionedStylesheet);
