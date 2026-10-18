import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { analyticsEventParameters, isAnalyticsPage } from '../src/lib/analytics.ts';
import { captureCampaignAttribution, getCampaignAttribution, getCampaignSessionId, trackAdsConversion, trackCampaignEvent } from '../src/lib/campaign.ts';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
let values;
let sent;

beforeEach(() => {
    values = new Map();
    sent = [];
    globalThis.window = {
        location: { pathname: '/', origin: 'https://resumevibe.takovibe.com', search: '' },
        localStorage: { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
        crypto: { randomUUID: () => 'test-session' },
        dataLayer: [],
        gtag: (...args) => sent.push(args),
        dispatchEvent: () => {},
    };
    globalThis.document = { referrer: '' };
    Object.defineProperty(globalThis, 'navigator', { value: { doNotTrack: '0' }, configurable: true });
});

afterEach(() => {
    delete globalThis.window;
    delete globalThis.document;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
});

test('a tagged visit survives navigation to another page', () => {
    window.location.search = '?utm_source=linkedin&utm_medium=personal&utm_campaign=first_five';
    captureCampaignAttribution();
    window.location = { ...window.location, pathname: '/job-fit', search: '' };
    captureCampaignAttribution();
    assert.equal(getCampaignAttribution().utm_source, 'linkedin');
    assert.equal(getCampaignAttribution().landing_path, '/');
});

test('a new campaign does not inherit fields from an older campaign', () => {
    window.location.search = '?utm_source=linkedin&utm_campaign=old';
    captureCampaignAttribution();
    window.location.search = '?utm_source=community';
    captureCampaignAttribution();
    assert.equal(getCampaignAttribution().utm_source, 'community');
    assert.equal(getCampaignAttribution().utm_campaign, undefined);
});

test('URL queries are excluded from stored landing paths and provider events', () => {
    window.location.search = '?email=private@example.com&utm_source=linkedin';
    captureCampaignAttribution();
    trackCampaignEvent('landing_view', { page: 'home' });
    assert.equal(getCampaignAttribution().landing_path, '/');
    assert.equal(sent[0][2].page_location, 'https://resumevibe.takovibe.com/');
    assert.doesNotMatch(JSON.stringify(sent), /private@example/);
});

test('resume content and identifiers are never forwarded to the provider', () => {
    trackCampaignEvent('resume_export_completed', { source: 'editor', resume_slug: 'private-name', application_id: 'private-id', resume_text: 'private resume contents', email: 'private@example.com' });
    assert.equal(sent[0][2].source, 'editor');
    assert.doesNotMatch(JSON.stringify(sent), /private/);
});

test('public resumes and profile pages do not send provider events', () => {
    for (const pathname of ['/resume/alice/backend', '/profile', '/api/jobs']) {
        window.location.pathname = pathname;
        trackCampaignEvent('page_view');
        assert.equal(isAnalyticsPage(pathname), false);
    }
    assert.equal(sent.length, 0);
});

test('Do Not Track suppresses provider events', () => {
    navigator.doNotTrack = '1';
    trackCampaignEvent('landing_view');
    assert.equal(sent.length, 0);
});

test('denied browser storage cannot interrupt the funnel', () => {
    window.localStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    assert.doesNotThrow(() => captureCampaignAttribution());
    assert.ok(getCampaignSessionId());
    assert.doesNotThrow(() => trackCampaignEvent('landing_view'));
});

test('event values are restricted to bounded safe primitives', () => {
    assert.deepEqual(analyticsEventParameters({ coverage: Infinity, value: 85, resume_source: 'pdf', source: 'email@example.com', destination: '/job-fit?email=x', page: 'x'.repeat(200), resume: { name: 'private' } }), { value: 85, resume_source: 'pdf' });
});

test('a Google Ads conversion carries only its target and a query-free page URL', () => {
    window.location.search = '?gclid=abc&email=private@example.com';
    trackAdsConversion('AW-123456789/AbC-D_efG');
    assert.deepEqual(sent, [['event', 'conversion', { send_to: 'AW-123456789/AbC-D_efG', page_location: 'https://resumevibe.takovibe.com/', page_referrer: '' }]]);
});

test('Google Ads conversions stay off when unconfigured, private, or opted out', () => {
    for (const sendTo of ['/', 'AW-123456789/', '/AbC-D_efG', 'G-ABC/label']) trackAdsConversion(sendTo);
    window.location.pathname = '/profile';
    trackAdsConversion('AW-123456789/AbC-D_efG');
    window.location.pathname = '/';
    navigator.doNotTrack = '1';
    trackAdsConversion('AW-123456789/AbC-D_efG');
    assert.equal(sent.length, 0);
});

test('invalid event names cannot be emitted', () => {
    trackCampaignEvent('email@example.com');
    assert.equal(window.dataLayer.length, 0);
    assert.equal(sent.length, 0);
});
