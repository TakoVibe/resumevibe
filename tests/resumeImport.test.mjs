import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildImportedResume, importActionType, summarizeImport } from '../src/lib/resumeImport.ts';

const academicCv = {
    personalInfo: { fullName: 'Asha Rao' },
    summary: 'Researcher in distributed systems.',
    experience: [],
    education: [{ id: 'edu-1', institution: 'Example University', degree: 'PhD' }],
    skills: [],
    achievements: ['Best paper award'],
    customSections: [
        { id: 'custom-1', title: 'Publications', type: 'custom', items: [{ title: 'Paper A', date: '2025' }, { title: 'Paper B', date: '2023' }] },
        { id: 'custom-2', title: 'Research Experience', type: 'experience', items: [{ company: 'Systems Lab', role: 'Research Assistant', metrics: [] }] },
        { id: 'custom-3', title: 'Talks', type: 'custom', items: [] },
    ],
    sectionOrder: ['summary', 'custom-2', 'education', 'custom-1', 'achievements', 'experience'],
};

test('academic sections survive import in document order', () => {
    const resume = buildImportedResume(academicCv);
    assert.deepEqual(resume.customSections.map((s) => [s.id, s.title, s.type]), [
        ['imported-1', 'Publications', 'custom'],
        ['imported-2', 'Research Experience', 'experience'],
    ]);
    assert.deepEqual(resume.sectionOrder, ['summary', 'imported-2', 'education', 'imported-1', 'achievements']);
    assert.equal(resume.visibleSections.experience, false);
    assert.equal(resume.visibleSections['imported-1'], true);
});

test('sections the model forgot to order are still shown', () => {
    const resume = buildImportedResume({ ...academicCv, sectionOrder: ['education'] });
    assert.deepEqual(resume.sectionOrder, ['education', 'summary', 'achievements', 'imported-1', 'imported-2']);
});

test('import summary lists visible sections with counts', () => {
    const resume = buildImportedResume(academicCv);
    assert.deepEqual(summarizeImport(resume), [
        { title: 'Summary', count: null },
        { title: 'Research Experience', count: 1 },
        { title: 'Education', count: 1 },
        { title: 'Publications', count: 2 },
        { title: 'Achievements', count: 1 },
    ]);
});

test('billing keys match the existing import and job-fit actions', () => {
    assert.equal(importActionType('import', 'pdf'), 'import_resume_pdf');
    assert.equal(importActionType('job_fit', 'text'), 'job_fit_import_text');
});
