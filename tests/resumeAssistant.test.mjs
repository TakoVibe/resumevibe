import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyAssistantSuggestion, assistantHighlightKey, canonicalizeAssistantSuggestions, restoreInlineFormatting } from '../src/lib/resumeAssistant.ts';

const cv = {
    summary: 'Researcher.',
    experience: [{ id: 'exp-1', metrics: ['Managed patch rollouts.'] }],
    projects: [], skills: [], achievements: [],
    customSections: [
        { id: 'cv-research', title: 'Research Experience', type: 'experience', items: [{ id: 'r1', metrics: ['Built a fault-injection framework.'] }] },
        { id: 'cv-pubs', title: 'Publications', type: 'custom', items: [{ id: 'p1', title: 'Paper A', date: '2025', content: 'A. Rao. workshop.' }] },
    ],
};
const raw = (overrides) => ({ action: 'replace', section: 'custom', targetId: '', itemId: '', targetIndex: -1, after: 'New text.', reason: 'Clearer.', evidence: 'resume', ...overrides });

test('suggestions can target custom-section bullets and entries, labelled by section title', () => {
    const { suggestions, dropped } = canonicalizeAssistantSuggestions([
        raw({ targetId: 'cv-research', itemId: 'r1', targetIndex: 0, after: 'Built a fault-injection framework that exposed 3 recovery bugs.' }),
        raw({ targetId: 'cv-pubs', itemId: 'p1', after: 'A. Rao. Proceedings of the Example Workshop, pp. 12–19.' }),
    ], cv, 1);
    assert.deepEqual(dropped, []);
    assert.deepEqual(suggestions.map((s) => [s.label, s.before]), [
        ['Research Experience', 'Built a fault-injection framework.'],
        ['Publications', 'A. Rao. workshop.'],
    ]);

    const updated = suggestions.reduce(applyAssistantSuggestion, cv);
    assert.equal(updated.customSections[0].items[0].metrics[0], 'Built a fault-injection framework that exposed 3 recovery bugs.');
    assert.equal(updated.customSections[1].items[0].content, 'A. Rao. Proceedings of the Example Workshop, pp. 12–19.');
    assert.equal(assistantHighlightKey(suggestions[0]), 'cv-research');
});

test('alternative versions of one bullet collapse to a single suggestion', () => {
    const { suggestions, dropped } = canonicalizeAssistantSuggestions([
        raw({ section: 'experience', targetId: 'exp-1', targetIndex: 0, after: 'Version one.' }),
        raw({ section: 'experience', targetId: 'exp-1', targetIndex: 0, after: 'Version two.' }),
        raw({ section: 'experience', targetId: 'exp-1', targetIndex: 0, after: 'Version three.' }),
    ], cv);
    assert.deepEqual(suggestions.map((s) => s.after), ['Version one.']);
    assert.deepEqual(dropped.map((d) => d.reason), ['duplicate', 'duplicate']);
});

test('suggestions pointing at missing or unchanged text are dropped with a reason', () => {
    const { suggestions, dropped } = canonicalizeAssistantSuggestions([
        raw({ targetId: 'cv-research', itemId: 'missing', targetIndex: 0 }),
        raw({ section: 'experience', targetId: 'exp-1', targetIndex: 5 }),
        raw({ section: 'summary', after: 'Researcher.' }),
    ], cv);
    assert.equal(suggestions.length, 0);
    assert.deepEqual(dropped.map((d) => d.reason), ['unmatched', 'unmatched', 'unchanged']);
});

test('standard experience bullets still apply as before', () => {
    const { suggestions } = canonicalizeAssistantSuggestions([raw({ section: 'experience', targetId: 'exp-1', targetIndex: 0, after: 'Led patch rollouts for 2,000 servers.' })], cv);
    const updated = applyAssistantSuggestion(cv, suggestions[0]);
    assert.equal(updated.experience[0].metrics[0], 'Led patch rollouts for 2,000 servers.');
    assert.equal(assistantHighlightKey(suggestions[0]), 'experience');
});

test('rewrites keep the user\'s bold and italic on phrases that survived', () => {
    const before = 'Moved the gateway to a <strong>Go microservice</strong>, reaching <em>99.999% availability</em> and <strong>40% more throughput</strong>.';
    assert.equal(
        restoreInlineFormatting(before, 'Modernised the gateway into a Go microservice with 99.999% availability and higher throughput.'),
        'Modernised the gateway into a <strong>Go microservice</strong> with <em>99.999% availability</em> and higher throughput.',
    );
    assert.equal(restoreInlineFormatting(before, 'Already <strong>formatted</strong> text.'), 'Already <strong>formatted</strong> text.');
});

test('removals: custom sections are deleted, standard sections hidden, entries and bullets taken out', () => {
    const doc = {
        ...cv,
        experience: [{ id: 'exp-1', role: 'Engineer', company: 'Acme', metrics: ['Managed patch rollouts.', 'Wrote runbooks.'] }, { id: 'exp-2', role: 'Intern', company: 'Beta', metrics: ['Fixed bugs.'] }],
        openSource: [{ id: 'os-1', name: 'Example helper' }],
        sectionOrder: ['summary', 'experience', 'openSource', 'cv-research', 'cv-pubs'],
        visibleSections: { summary: true, experience: true, openSource: true, 'cv-research': true, 'cv-pubs': true },
    };
    const remove = (overrides) => raw({ action: 'remove', after: '', ...overrides });
    const { suggestions, dropped } = canonicalizeAssistantSuggestions([
        remove({ targetId: 'cv-research' }),
        remove({ section: 'openSource', targetId: '' }),
        remove({ section: 'experience', targetId: 'exp-1', targetIndex: 1 }),
    ], doc);
    assert.deepEqual(dropped, []);
    assert.deepEqual(suggestions.map((s) => [s.action, s.label, s.before]), [
        ['remove', 'Research Experience', 'Research Experience: Built a fault-injection framework.'],
        ['remove', 'Open source', 'Open source: Example helper'],
        ['remove', 'Experience', 'Wrote runbooks.'],
    ]);

    const updated = suggestions.reduce(applyAssistantSuggestion, doc);
    assert.deepEqual(updated.customSections.map((s) => s.id), ['cv-pubs']);
    assert.ok(!updated.sectionOrder.includes('cv-research') && !('cv-research' in updated.visibleSections));
    assert.equal(updated.visibleSections.openSource, false);
    assert.equal(updated.openSource.length, 1, 'hidden, not deleted, so Show section brings it back');
    assert.deepEqual(updated.experience[0].metrics, ['Managed patch rollouts.']);

    const entries = canonicalizeAssistantSuggestions([
        remove({ section: 'experience', targetId: 'exp-2' }),
        remove({ targetId: 'cv-pubs', itemId: 'p1' }),
    ], updated).suggestions.reduce(applyAssistantSuggestion, updated);
    assert.deepEqual(entries.experience.map((e) => e.id), ['exp-1']);
    assert.deepEqual(entries.customSections[0].items, []);

    assert.deepEqual(canonicalizeAssistantSuggestions([
        remove({ section: 'openSource', targetId: '' }),
        remove({ targetId: 'cv-missing' }),
    ], updated).dropped.map((d) => d.reason), ['unchanged', 'unmatched']);
});
