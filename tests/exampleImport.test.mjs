import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareExampleForProfile } from '../src/lib/exampleImport.ts';

const account = { email: 'alex@example.org', first_name: 'Alex', last_name: 'Rivera' };
const example = {
    personalInfo: {
        fullName: 'Johnathan Doe',
        email: 'johnathan.doe@example.com',
        phone: '+1 (555) 123-4567',
        location: 'Austin, TX',
    },
    experience: [{ role: 'Backend Developer' }],
};

test('profile copy replaces untouched fictional contact details without changing the source', () => {
    const copy = prepareExampleForProfile(example, account);
    assert.equal(copy.personalInfo.fullName, 'Alex Rivera');
    assert.equal(copy.personalInfo.email, 'alex@example.org');
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
            fullName: 'A. Rivera',
            email: 'career@example.org',
            phone: '555-0100',
            location: 'Denver, CO',
        },
    };
    assert.deepEqual(prepareExampleForProfile(edited, account).personalInfo, edited.personalInfo);
});
