import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// Exercise the real pre-paint script, not a duplicate of the theme policy.
const layout = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
const bootstrap = layout.match(/<script is:inline>\s*(\/\/ Immediate theme application[\s\S]*?)<\/script>/)?.[1];
assert.ok(bootstrap, 'the theme bootstrap must run inline before the body');

function renderHomepage({ pathname = '/', values = {}, storageDenied = false, prefersDark = true } = {}) {
    const classes = new Set();
    runInNewContext(bootstrap, {
        window: { location: { pathname }, matchMedia: () => ({ matches: prefersDark }) },
        localStorage: { getItem(key) {
            if (storageDenied) throw new Error('Storage unavailable');
            return values[key] ?? null;
        } },
        document: { documentElement: { classList: {
            add: value => classes.add(value),
            remove: value => classes.delete(value),
        } } },
    });
    return { theme: classes.has('dark') ? 'dark' : 'light', editor: classes.has('resume-editor-home') };
}

const renderTheme = options => renderHomepage(options).theme;
const signedIn = () => ({ auth_token: 'test-token', user: JSON.stringify({ email: 'test@example.test', first_name: 'Test' }), login_time: String(Date.now()) });

test('guest homepage defaults to light regardless of system preference', () => {
    for (const prefersDark of [true, false]) assert.equal(renderTheme({ prefersDark }), 'light');
});

test('explicit theme choices are preserved for guests and signed-in visitors', () => {
    for (const session of [{}, signedIn()]) {
        for (const theme of ['light', 'dark']) assert.equal(renderTheme({ values: { ...session, theme } }), theme);
    }
});

test('signed-in homepage keeps its existing default without a saved theme', () => {
    assert.equal(renderTheme({ values: signedIn() }), 'dark');
});

test('expired sessions use the guest homepage default', () => {
    assert.equal(renderTheme({ values: { ...signedIn(), login_time: String(Date.now() - 4 * 24 * 60 * 60 * 1000) } }), 'light');
});

test('missing or malformed session data uses the guest homepage default', () => {
    for (const values of [{ auth_token: 'test-token' }, { ...signedIn(), user: '{invalid' }, { ...signedIn(), login_time: 'invalid' }]) {
        assert.equal(renderTheme({ values }), 'light');
    }
});

test('invalid saved themes do not override the default', () => {
    assert.equal(renderTheme({ values: { theme: 'invalid' } }), 'light');
    assert.equal(renderTheme({ values: { ...signedIn(), theme: 'invalid' } }), 'dark');
});

test('unavailable storage does not stop the homepage rendering in light mode', () => {
    assert.equal(renderTheme({ storageDenied: true }), 'light');
});

test('other pages retain their existing default and saved preferences', () => {
    assert.equal(renderTheme({ pathname: '/job-fit' }), 'dark');
    assert.equal(renderTheme({ pathname: '/job-fit', values: { theme: 'light' } }), 'light');
});

test('signed-in homepage selects the editor before paint with either theme', () => {
    for (const theme of ['light', 'dark']) assert.equal(renderHomepage({ values: { ...signedIn(), theme } }).editor, true);
});

test('signed-out, expired, malformed and inaccessible sessions keep the landing page', () => {
    const sessions = [
        {},
        { ...signedIn(), login_time: String(Date.now() - 4 * 24 * 60 * 60 * 1000) },
        { ...signedIn(), login_time: 'not-a-number' },
        { ...signedIn(), user: '{invalid' },
        { ...signedIn(), user: JSON.stringify({ first_name: 'No email' }) },
    ];
    for (const values of sessions) assert.equal(renderHomepage({ values }).editor, false);
    assert.equal(renderHomepage({ storageDenied: true }).editor, false);
});

test('signed-in visitors do not select a homepage view on another route', () => {
    assert.equal(renderHomepage({ pathname: '/job-fit', values: signedIn() }).editor, false);
});
