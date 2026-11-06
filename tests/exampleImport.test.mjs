import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareExampleForProfile } from '../src/lib/exampleImport.ts';

const account = { email: 'student@example.org', first_name: 'Account', last_name: 'Holder' };
const example = {
    personalInfo: {
        fullName: 'Johnathan Doe',
        email: 'johnathan.doe@example.com',
        phone: '+1 (555) 010-0100',
        location: 'City, State',
    },
    experience: [{ role: 'Backend Developer' }],
};

test('profile copy replaces untouched fictional contact details without changing the source', () => {
    const copy = prepareExampleForProfile(example, account);
    assert.equal(copy.personalInfo.fullName, 'Account Holder');
    assert.equal(copy.personalInfo.email, 'student@example.org');
    assert.equal(copy.personalInfo.phone, '');
    assert.equal(copy.personalInfo.location, '');
    assert.equal(copy.experience, example.experience);
    assert.equal(example.personalInfo.email, 'johnathan.doe@example.com');
});

test('profile copy preserves contact details already edited by the visitor', () => {
    const edited = {
        ...example,
        personalInfo: {
            ...example.personalInfo,
            fullName: 'A. N. Other',
            email: 'career@example.org',
            phone: '555-0100',
            location: 'Another City',
        },
    };
    assert.deepEqual(prepareExampleForProfile(edited, account).personalInfo, edited.personalInfo);
});

test('drafts made from the older examples are still recognised as untouched', () => {
    const older = { ...example, personalInfo: { ...example.personalInfo, phone: '+1 (555) 123-4567', location: 'Austin, TX' } };
    const copy = prepareExampleForProfile(older, account);
    assert.equal(copy.personalInfo.phone, '');
    assert.equal(copy.personalInfo.location, '');
});
