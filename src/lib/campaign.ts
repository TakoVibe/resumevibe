import { analyticsEventParameters, isAnalyticsPage } from './analytics.ts';

const ATTRIBUTION_STORAGE_KEY = 'resumevibe:campaign-attribution:v1';
const SESSION_STORAGE_KEY = 'resumevibe:campaign-session:v1';
let fallbackSessionId = '';

function readStorage(key: string) {
    try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: string) {
    try { window.localStorage.setItem(key, value); } catch { /* Optional attribution must not block the application. */ }
}

export interface CampaignAttribution {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    gclid?: string;
    fbclid?: string;
    landing_path?: string;
    captured_at?: string;
}

function cleanValue(value: string | null, maxLength = 240) {
    return value?.trim().slice(0, maxLength) || undefined;
}

export function getCampaignSessionId() {
    if (typeof window === 'undefined') return '';

    const existing = readStorage(SESSION_STORAGE_KEY) || fallbackSessionId;
    if (existing) return existing;

    const sessionId = typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    fallbackSessionId = sessionId;
    writeStorage(SESSION_STORAGE_KEY, sessionId);
    return sessionId;
}

export function captureCampaignAttribution(): CampaignAttribution {
    if (typeof window === 'undefined') return {};

    const params = new URLSearchParams(window.location.search);
    const existing = getCampaignAttribution();
    const incoming: CampaignAttribution = {
        utm_source: cleanValue(params.get('utm_source')),
        utm_medium: cleanValue(params.get('utm_medium')),
        utm_campaign: cleanValue(params.get('utm_campaign')),
        utm_content: cleanValue(params.get('utm_content')),
        utm_term: cleanValue(params.get('utm_term')),
        gclid: cleanValue(params.get('gclid'), 300),
        fbclid: cleanValue(params.get('fbclid'), 300),
        landing_path: window.location.pathname.slice(0, 500),
        captured_at: new Date().toISOString(),
    };

    const hasIncomingAttribution = Object.entries(incoming)
        .some(([key, value]) => key !== 'landing_path' && key !== 'captured_at' && Boolean(value));
    const attribution = hasIncomingAttribution || !existing.landing_path ? incoming : existing;

    if (hasIncomingAttribution || !existing.landing_path) {
        writeStorage(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
    }

    return attribution;
}

export function getCampaignAttribution(): CampaignAttribution {
    if (typeof window === 'undefined') return {};

    try {
        const parsed = JSON.parse(readStorage(ATTRIBUTION_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export function trackCampaignEvent(name: string, details: Record<string, unknown> = {}) {
    if (typeof window === 'undefined' || !/^[a-z][a-z0-9_]{0,39}$/.test(name)) return;

    const payload = {
        event: name,
        event_source: 'resumevibe_campaign',
        campaign_session_id: getCampaignSessionId(),
        ...getCampaignAttribution(),
        ...details,
    };

    const analyticsWindow = window as typeof window & {
        dataLayer?: Array<Record<string, unknown>>;
        gtag?: (...args: unknown[]) => void;
        fbq?: (...args: unknown[]) => void;
    };
    analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
    analyticsWindow.dataLayer.push(payload);
    window.dispatchEvent(new CustomEvent('resumevibe:analytics', { detail: payload }));

    if (typeof analyticsWindow.gtag === 'function' && isAnalyticsPage(window.location.pathname) && navigator.doNotTrack !== '1') {
        const attribution = getCampaignAttribution();
        const campaign = Object.fromEntries([
            ['campaign_source', attribution.utm_source],
            ['campaign_medium', attribution.utm_medium],
            ['campaign_name', attribution.utm_campaign],
            ['campaign_content', attribution.utm_content],
        ].filter(([, value]) => typeof value === 'string' && /^[a-z0-9_. -]{1,80}$/i.test(value)));
        analyticsWindow.gtag('event', name, {
            ...analyticsEventParameters(details),
            ...campaign,
            page_location: window.location.origin + window.location.pathname,
            page_referrer: document.referrer ? new URL(document.referrer).origin : '',
        });
    }
}

// Google Ads receives only the conversion target, its configured value, and a
// query-free page URL. The click is matched through the ID stored on landing.
export function trackAdsConversion(sendTo: string) {
    if (typeof window === 'undefined' || !/^AW-\d+\/[A-Za-z0-9_-]+$/.test(sendTo)) return;

    const analyticsWindow = window as typeof window & { gtag?: (...args: unknown[]) => void };
    if (typeof analyticsWindow.gtag !== 'function' || !isAnalyticsPage(window.location.pathname) || navigator.doNotTrack === '1') return;

    analyticsWindow.gtag('event', 'conversion', {
        send_to: sendTo,
        value: 1.0,
        currency: 'INR',
        page_location: window.location.origin + window.location.pathname,
        page_referrer: document.referrer ? new URL(document.referrer).origin : '',
    });
}

