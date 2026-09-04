const INLINE_TAGS = new Set(['strong', 'em', 'u', 'a', 'code', 'br']);
const BLOCK_TAGS = new Set([
    'address', 'article', 'aside', 'blockquote', 'dd', 'div', 'dl', 'dt',
    'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4',
    'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre',
    'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
]);

function escapeAttribute(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function decodeUrlEntities(value: string) {
    return value
        .replace(/&#x([0-9a-f]+);?/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&#([0-9]+);?/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
        .replace(/&colon;/gi, ':')
        .replace(/&tab;|&newline;/gi, '')
        .replace(/&amp;/gi, '&');
}

export function sanitizeLinkUrl(value: unknown): string {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return '';

    const decoded = decodeUrlEntities(raw);
    const compact = decoded.replace(/[\u0000-\u0020\u007f]+/g, '');
    const lower = compact.toLowerCase();
    const hasExplicitScheme = /^[a-z][a-z0-9+.-]*:/i.test(compact);

    if (
        lower.startsWith('https://')
        || lower.startsWith('http://')
        || lower.startsWith('mailto:')
        || lower.startsWith('tel:')
        || compact.startsWith('/')
        || compact.startsWith('#')
        || !hasExplicitScheme
    ) {
        return raw;
    }

    return '';
}

/**
 * Detect markup that can change the resume's document structure when Chromium
 * serializes it for PDF generation. Normal inline emphasis is intentionally
 * excluded because it does not change the PDF text order.
 */
export function hasUnsafeResumeFormatting(value: unknown): boolean {
    if (typeof value !== 'string' || !value.includes('<')) return false;
    if (/<!--|<!doctype/i.test(value)) return true;

    const tags = value.match(/<\/?\s*[a-z0-9-]+(?:\s[^>]*)?>/gi) || [];
    return tags.some((tag) => {
        const match = tag.match(/^<\s*\/?\s*([a-z0-9-]+)/i);
        if (!match) return true;

        let name = match[1].toLowerCase();
        if (name === 'b') name = 'strong';
        if (name === 'i') name = 'em';
        return BLOCK_TAGS.has(name) || !INLINE_TAGS.has(name);
    });
}

/**
 * Resume rich text is deliberately limited to inline formatting. Removing
 * structural tags keeps the DOM valid when a rendered resume is serialized
 * and parsed again by Chromium during PDF generation.
 */
export function sanitizeInlineHtml(value: unknown): string {
    if (value === null || value === undefined) return '';

    let html = typeof value === 'string' ? value : String(value);
    html = html
        .replace(/\u0000/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<(script|style|iframe|object|embed|template|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
        .replace(/<!doctype[^>]*>/gi, '');

    html = html.replace(/<\/?[^>]+>/g, (tag) => {
        const match = tag.match(/^<\s*(\/?)\s*([a-z0-9-]+)/i);
        if (!match) return '';

        const closing = match[1] === '/';
        let name = match[2].toLowerCase();
        if (name === 'b') name = 'strong';
        if (name === 'i') name = 'em';

        if (BLOCK_TAGS.has(name)) return closing ? ' ' : '';
        if (!INLINE_TAGS.has(name)) return '';
        if (name === 'br') return closing ? '' : '<br>';
        if (closing) return `</${name}>`;

        if (name === 'a') {
            const hrefMatch = tag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
            const href = sanitizeLinkUrl(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '');
            return href ? `<a href="${escapeAttribute(href)}" rel="noreferrer">` : '<a>';
        }

        return `<${name}>`;
    });

    return html
        .replace(/[\t\r\n]+/g, ' ')
        .replace(/ {2,}/g, ' ')
        .trim();
}
