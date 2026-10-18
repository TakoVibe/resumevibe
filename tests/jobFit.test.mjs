import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeJobFit } from '../src/lib/jobFit.ts';

function resume(summary, skills = []) {
    return { summary, skills, experience: [], projects: [], education: [] };
}

function compare(summary, requirement) {
    return analyzeJobFit(resume(summary), requirement).requirements[0];
}

test('one year cannot satisfy an eight-year requirement', () => {
    const evidence = compare('1 year of Python development experience.', 'Must have 8 years of Python development experience.');
    assert.equal(evidence.status, 'partial');
    assert.match(evidence.recommendation, /does not establish that duration/);
    assert.ok(evidence.score < 42);
});

test('a matching explicit duration can support the requirement', () => {
    const evidence = compare('8 years of Python development experience.', 'Must have 8 years of Python development experience.');
    assert.equal(evidence.status, 'matched');
});

test('unquantified experience stays available for clarification', () => {
    const evidence = compare('Python development experience.', 'Must have 8 years of Python development experience.');
    assert.equal(evidence.status, 'partial');
    assert.match(evidence.evidence, /Python development/);
});

test('experience ranges and plus notation keep numeric qualification meaningful', () => {
    assert.equal(compare('1–2 years of Python development experience.', 'Minimum 8+ years of Python development experience.').status, 'partial');
    assert.equal(compare('8+ years of Python development experience.', 'Minimum 8 years of Python development experience.').status, 'matched');
});

test('a skills list alone cannot verify years with a technology', () => {
    const report = analyzeJobFit(resume('', [{ name: 'Languages', items: ['Python', 'development', 'experience'] }]), 'Must have 8 years of Python development experience.');
    assert.notEqual(report.requirements[0].status, 'matched');
});

for (const technology of ['Go', 'AI', 'C#', 'R']) {
    test(`short technology names preserve evidence for ${technology}`, () => {
        const requirement = `Must have experience with ${technology}.`;
        const supported = compare(`Experience with ${technology}.`, requirement);
        const unrelated = compare('Experience with Rust.', requirement);
        assert.equal(supported.status, 'matched');
        assert.ok(supported.score > unrelated.score);
    });
}

test('missing evidence is described as absent from the document', () => {
    const evidence = compare('Python APIs.', 'Required expertise operating Kubernetes infrastructure.');
    assert.equal(evidence.status, 'gap');
    assert.match(evidence.recommendation, /not evidenced in the current resume/);
});
