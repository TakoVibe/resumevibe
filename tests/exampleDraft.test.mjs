import assert from 'node:assert/strict';
import test from 'node:test';
import { addOpenSourceToOlderExampleDraft } from '../src/lib/exampleDraft.ts';

test('older example drafts gain the new section without losing edits', () => {
    const contribution = { id: 'os-1', name: 'Example contribution' };
    const template = { openSource: [contribution] };
    const stored = {
        personalInfo: { fullName: 'Edited Name' },
        openSource: [],
        sectionOrder: ['summary', 'projects', 'education'],
        visibleSections: { openSource: false },
    };
    const upgraded = addOpenSourceToOlderExampleDraft(stored, template);
    assert.equal(upgraded.personalInfo, stored.personalInfo);
    assert.deepEqual(upgraded.sectionOrder, ['summary', 'projects', 'openSource', 'education']);
    assert.deepEqual(upgraded.openSource, [contribution]);
    assert.equal(upgraded.visibleSections.openSource, true);
});

test('a section already present or deliberately removed stays as the visitor left it', () => {
    const template = { openSource: [{ id: 'os-1', name: 'Example contribution' }] };
    const removed = { openSource: [], sectionOrder: ['summary', 'openSource', 'education'], visibleSections: { openSource: false } };
    assert.equal(addOpenSourceToOlderExampleDraft(removed, template), removed);
});
