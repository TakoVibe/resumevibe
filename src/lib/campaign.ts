const ATTRIBUTION_STORAGE_KEY = 'resumevibe:campaign-attribution:v1';
const SESSION_STORAGE_KEY = 'resumevibe:campaign-session:v1';

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

    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const sessionId = typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
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
        landing_path: `${window.location.pathname}${window.location.search}`.slice(0, 500),
        captured_at: new Date().toISOString(),
    };

    const hasIncomingAttribution = Object.entries(incoming)
        .some(([key, value]) => key !== 'landing_path' && key !== 'captured_at' && Boolean(value));
    const attribution = hasIncomingAttribution ? { ...existing, ...incoming } : existing;

    if (hasIncomingAttribution) {
        window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
    }

    return attribution;
}

export function getCampaignAttribution(): CampaignAttribution {
    if (typeof window === 'undefined') return {};

    try {
        const parsed = JSON.parse(window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

export function trackCampaignEvent(name: string, details: Record<string, unknown> = {}) {
    if (typeof window === 'undefined') return;

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
}

