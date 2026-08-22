import type { BulletItem, ResumeSchema } from '../types/resume';
import type { EvidenceReport, FitDecision, RequirementEvidence } from '../types/application';

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it',
    'of', 'on', 'or', 'our', 'that', 'the', 'their', 'this', 'to', 'we', 'will', 'with', 'you', 'your',
    'ability', 'candidate', 'role', 'team', 'work', 'working', 'strong', 'excellent', 'good', 'including',
    'required', 'requirement', 'requirements', 'preferred', 'responsibilities', 'responsibility', 'skills',
]);

const REQUIREMENT_CUES = /\b(must|required|requirements?|minimum|preferred|experience|proficien|expertise|knowledge|familiar|hands[- ]on|years?|degree|ability to|understanding of|skilled|background in)\b/i;
const MUST_HAVE_CUES = /\b(must|required|minimum|at least|\d+\+?\s+years?|bachelor|master|degree)\b/i;
const NOISE_CUES = /\b(equal opportunity|salary|compensation|benefits?|health insurance|about us|who we are|our mission|privacy|accommodation|diversity|401k|holiday|vacation)\b/i;

function stripHtml(value: string) {
    return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function bulletText(value: BulletItem) {
    return stripHtml(typeof value === 'string' ? value : value.text);
}

function meaningfulTokens(value: string) {
    return Array.from(new Set(
        value
            .toLowerCase()
            .replace(/[^a-z0-9+#.\-/\s]/g, ' ')
            .split(/\s+/)
            .map((token) => token.replace(/^[./-]+|[./-]+$/g, ''))
            .filter((token) => token.length > 2 && !STOP_WORDS.has(token) && !/^\d+$/.test(token))
    ));
}

function resumeEvidenceChunks(resume: ResumeSchema) {
    const chunks: Array<{ text: string; source: string }> = [];
    if (resume.summary) chunks.push({ text: stripHtml(resume.summary), source: 'Professional summary' });

    resume.skills.forEach((group) => {
        chunks.push({ text: `${group.name}: ${group.items.join(', ')}`, source: `Skills · ${group.name}` });
    });

    resume.experience.forEach((role) => {
        chunks.push({
            text: `${role.role} at ${role.company}. ${(role.techStack || []).join(', ')}`,
            source: `Experience · ${role.role}`,
        });
        role.metrics.forEach((metric) => chunks.push({
            text: bulletText(metric),
            source: `Experience · ${role.role} at ${role.company}`,
        }));
    });

    resume.projects.forEach((project) => {
        chunks.push({
            text: `${project.name}. ${project.description || ''} ${(project.techStack || []).join(', ')}`,
            source: `Project · ${project.name}`,
        });
        (project.metrics || []).forEach((metric) => chunks.push({ text: bulletText(metric), source: `Project · ${project.name}` }));
    });

    resume.education.forEach((education) => chunks.push({
        text: `${education.degree} at ${education.institution}. ${education.score || ''}`,
        source: `Education · ${education.institution}`,
    }));

    return chunks.filter((chunk) => chunk.text.length > 2);
}

function splitJobDescription(jobDescription: string) {
    const normalized = jobDescription
        .replace(/\r/g, '')
        .replace(/[•●▪◦]/g, '\n- ')
        .replace(/\t/g, ' ');

    const lines = normalized
        .split(/\n+/)
        .flatMap((line) => line.length > 260 ? line.split(/(?<=[.!?])\s+/) : [line])
        .map((line) => line.replace(/^(?:[-*]\s+|\d+[.)]\s+)/, '').replace(/\s+/g, ' ').trim())
        .filter((line) => line.length >= 24 && line.length <= 320)
        .filter((line) => !NOISE_CUES.test(line));

    const requirementLines = lines.filter((line) => REQUIREMENT_CUES.test(line));
    const candidates = requirementLines.length >= 4 ? requirementLines : lines;
    const selected: string[] = [];

    for (const candidate of candidates) {
        const tokens = meaningfulTokens(candidate);
        if (tokens.length < 2) continue;
        const duplicate = selected.some((existing) => {
            const existingTokens = meaningfulTokens(existing);
            const overlap = tokens.filter((token) => existingTokens.includes(token)).length;
            return overlap / Math.min(tokens.length, existingTokens.length) >= 0.72;
        });
        if (!duplicate) selected.push(candidate);
        if (selected.length === 10) break;
    }

    return selected;
}

function scoreEvidence(requirement: string, chunks: Array<{ text: string; source: string }>) {
    const requirementTokens = meaningfulTokens(requirement);
    let best = { score: 0, text: '', source: '' };

    for (const chunk of chunks) {
        const chunkTokens = meaningfulTokens(chunk.text);
        const matched = requirementTokens.filter((token) => chunkTokens.some((candidate) => (
            candidate === token ||
            (candidate.length >= 5 && token.length >= 5 && (candidate.includes(token) || token.includes(candidate)))
        )));
        const coverage = requirementTokens.length ? matched.length / requirementTokens.length : 0;
        const strength = matched.length >= 3 ? 0.12 : matched.length === 2 ? 0.06 : 0;
        const score = Math.min(1, coverage + strength);
        if (score > best.score) best = { score, text: chunk.text, source: chunk.source };
    }

    return best;
}

function cleanRequirement(value: string) {
    const cleaned = value
        .replace(/^(qualifications?|requirements?|what you(?:'|’)ll need|you have|we(?:'|’)re looking for)\s*:?\s*/i, '')
        .trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function analyzeJobFit(resume: ResumeSchema, jobDescription: string): EvidenceReport {
    const chunks = resumeEvidenceChunks(resume);
    const requirements = splitJobDescription(jobDescription);

    const evidence: RequirementEvidence[] = requirements.map((rawRequirement, index) => {
        const requirement = cleanRequirement(rawRequirement);
        const priority = MUST_HAVE_CUES.test(requirement) ? 'must-have' : 'preferred';
        const match = scoreEvidence(requirement, chunks);
        const status = match.score >= 0.42 ? 'matched' : match.score >= 0.18 ? 'partial' : 'gap';

        return {
            id: `requirement-${index + 1}`,
            requirement,
            priority,
            status,
            score: Math.round(match.score * 100),
            evidence: status === 'gap'
                ? 'No clear supporting evidence was found in the current resume.'
                : match.text,
            evidenceSource: status === 'gap' ? undefined : match.source,
            recommendation: status === 'matched'
                ? 'Keep this evidence prominent and use the employer’s wording only when it remains accurate.'
                : status === 'partial'
                    ? 'Clarify the related experience, but do not imply deeper experience than the resume supports.'
                    : 'Treat this as a real gap. Do not add the requirement unless you can provide truthful evidence.',
        };
    });

    const matchedCount = evidence.filter((item) => item.status === 'matched').length;
    const partialCount = evidence.filter((item) => item.status === 'partial').length;
    const gapCount = evidence.filter((item) => item.status === 'gap').length;
    const mustHaveGapCount = evidence.filter((item) => item.priority === 'must-have' && item.status === 'gap').length;
    const weightedMatched = matchedCount + partialCount * 0.5;
    const coverage = evidence.length ? Math.round((weightedMatched / evidence.length) * 100) : 0;

    let decision: FitDecision = 'apply';
    if (mustHaveGapCount >= 2 || coverage < 35) decision = 'skip';
    else if (mustHaveGapCount > 0 || coverage < 65) decision = 'stretch';

    const strengths = evidence
        .filter((item) => item.status === 'matched')
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((item) => item.requirement);
    const risks = evidence
        .filter((item) => item.status !== 'matched')
        .sort((a, b) => (a.priority === b.priority ? a.score - b.score : a.priority === 'must-have' ? -1 : 1))
        .slice(0, 3)
        .map((item) => item.requirement);

    return {
        decision,
        coverage,
        matchedCount,
        partialCount,
        gapCount,
        mustHaveGapCount,
        requirements: evidence,
        strengths,
        risks,
        analyzedAt: new Date().toISOString(),
    };
}

export function createRecruiterMessage(resume: ResumeSchema, role: string, company: string, report: EvidenceReport) {
    const strongestEvidence = report.requirements.find((item) => item.status === 'matched')?.evidence;
    const proof = strongestEvidence
        ? strongestEvidence.replace(/\s+/g, ' ').slice(0, 180)
        : resume.summary.replace(/<[^>]*>/g, '').slice(0, 180);
    return `Hi, I’m interested in the ${role || 'open role'}${company ? ` at ${company}` : ''}. My background includes ${proof.charAt(0).toLowerCase()}${proof.slice(1)}. I’d be glad to share how that experience could support your team.`;
}

export function createInterviewQuestions(report: EvidenceReport) {
    const gaps = report.requirements.filter((item) => item.status !== 'matched').slice(0, 3);
    const strengths = report.requirements.filter((item) => item.status === 'matched').slice(0, 2);
    return [
        ...strengths.map((item) => `Tell me about a time you demonstrated: ${item.requirement}`),
        ...gaps.map((item) => `How would you address your limited or indirect experience with: ${item.requirement}`),
    ].slice(0, 5);
}
