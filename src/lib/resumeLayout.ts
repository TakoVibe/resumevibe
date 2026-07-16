export const RESUME_MARGIN_PADDING = {
    compact: '30pt',
    narrow: '40pt',
    standard: '50pt',
    wide: '60pt',
    relaxed: '72pt',
} as const;

export const MOBILE_RESUME_PADDING = {
    compact: '12px',
    narrow: '16px',
    standard: '20px',
    wide: '28px',
    relaxed: '32px',
} as const;

export const SINGLE_PAGE_PADDING = {
    compact: {
        sidebar: '26pt 18pt 24pt 20pt',
        main: '30pt 30pt 26pt 30pt',
        continuationTop: '30pt',
        firstPageBottom: '26pt',
    },
    narrow: {
        sidebar: '29pt 20pt 26pt 22pt',
        main: '33pt 34pt 28pt 34pt',
        continuationTop: '33pt',
        firstPageBottom: '28pt',
    },
    standard: {
        sidebar: '32pt 23pt 28pt 24pt',
        main: '36pt 38pt 30pt 36pt',
        continuationTop: '36pt',
        firstPageBottom: '30pt',
    },
    wide: {
        sidebar: '36pt 26pt 32pt 28pt',
        main: '42pt 44pt 36pt 42pt',
        continuationTop: '42pt',
        firstPageBottom: '36pt',
    },
    relaxed: {
        sidebar: '40pt 30pt 36pt 32pt',
        main: '48pt 50pt 42pt 48pt',
        continuationTop: '48pt',
        firstPageBottom: '42pt',
    },
} as const;

export type ResumeMarginKey = keyof typeof RESUME_MARGIN_PADDING;

export function resolveResumeMarginKey(value: string | undefined, isSinglePage: boolean): ResumeMarginKey {
    if (value && value in RESUME_MARGIN_PADDING) return value as ResumeMarginKey;
    return isSinglePage ? 'compact' : 'standard';
}
