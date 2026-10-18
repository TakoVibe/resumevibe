import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guestDraftEditorUrl } from '../src/lib/guestDraft.ts';

test('saving a guest draft cannot overwrite the private resume in an edit link', () => {
    assert.equal(guestDraftEditorUrl('http://localhost:4322/?edit=another-account-resume#builder'), '/?new=1#builder');
});

test('guest handoff preserves campaign tags but removes old document and AI actions', () => {
    const target = new URL(guestDraftEditorUrl('http://localhost:4322/?utm_source=google&edit=old&application=old-job&from=job-fit&view=public&ai=import#about'), 'http://localhost:4322');
    assert.equal(target.searchParams.get('utm_source'), 'google');
    assert.equal(target.searchParams.get('new'), '1');
    for (const key of ['edit', 'application', 'from', 'view', 'ai']) assert.equal(target.searchParams.has(key), false);
    assert.equal(target.hash, '#builder');
});

test('guest handoff stays on the same origin and is idempotent', () => {
    const target = guestDraftEditorUrl('http://localhost:4322/?new=1#builder');
    assert.equal(target, '/?new=1#builder');
    assert.equal(guestDraftEditorUrl('http://localhost:4322' + target), target);
});
