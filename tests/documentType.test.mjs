import assert from 'node:assert/strict';
import { test } from 'node:test';
import { documentTypeOf } from '../src/lib/documentType.ts';

test('a document with an academic section is a CV; anything else is a resume', () => {
    assert.equal(documentTypeOf({ customSections: [] }), 'resume');
    assert.equal(documentTypeOf({}), 'resume');
    assert.equal(documentTypeOf({ customSections: [{ title: 'Volunteering' }, { title: 'Languages' }] }), 'resume');
    assert.equal(documentTypeOf({ customSections: [{ title: 'Research Experience' }] }), 'cv');
    assert.equal(documentTypeOf({ customSections: [{ title: 'Languages' }, { title: 'Publications' }] }), 'cv');
    assert.equal(documentTypeOf({ customSections: [{ title: 'Invited Talks' }] }), 'cv');
    for (const title of ['Papers', 'Selected Paper', 'Conference Presentations', 'Thesis', 'Doctoral Dissertation']) {
        assert.equal(documentTypeOf({ customSections: [{ title }] }), 'cv', title);
    }
    assert.equal(documentTypeOf({ customSections: [{ title: 'Whitepapers' }] }), 'resume', 'a product whitepaper list is not academic');
});
