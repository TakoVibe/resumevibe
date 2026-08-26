import type { APIRoute } from 'astro';
import OpenAI from 'openai';

const MAX_JOB_DESCRIPTION_CHARS = 16_000;
const APPLICATION_PACKAGE_TOKEN_COST = 30;
const BACKEND_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

const APPLICATION_RESPONSE_FORMAT = {
    type: 'json_schema' as const,
    json_schema: {
        name: 'tailored_application_package',
        strict: true,
        schema: {
            type: 'object',
            additionalProperties: false,
            required: ['optimizedSummary', 'optimizedSkills', 'optimizedExperience', 'requirements', 'issues', 'changeReviews', 'coverLetter'],
            properties: {
                optimizedSummary: { type: 'string' },
                optimizedSkills: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['id', 'name', 'items'],
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            items: { type: 'array', items: { type: 'string' } },
                        },
                    },
                },
                optimizedExperience: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['id', 'metrics', 'techStack'],
                        properties: {
                            id: { type: 'string' },
                            metrics: { type: 'array', items: { type: 'string' } },
                            techStack: { type: 'array', items: { type: 'string' } },
                        },
                    },
                },
                requirements: {
                    type: 'array',
                    minItems: 3,
                    maxItems: 6,
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['requirement', 'status', 'evidence'],
                        properties: {
                            requirement: { type: 'string' },
                            status: { type: 'string', enum: ['matched', 'partial', 'gap'] },
                            evidence: { type: 'string' },
                        },
                    },
                },
                issues: { type: 'array', maxItems: 12, items: { type: 'string' } },
                changeReviews: {
                    type: 'array',
                    maxItems: 3,
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['section', 'whatChanged', 'why', 'jobRequirement', 'riskLevel', 'risk'],
                        properties: {
                            section: { type: 'string', enum: ['summary', 'skills', 'experience'] },
                            whatChanged: { type: 'string' },
                            why: { type: 'string' },
                            jobRequirement: { type: 'string' },
                            riskLevel: { type: 'string', enum: ['none', 'low', 'high'] },
                            risk: { type: 'string' },
                        },
                    },
                },
                coverLetter: { type: 'string' },
            },
        },
    },
};

const SYSTEM_PROMPT = `You create a complete, ATS-friendly job application package from a source resume and job description.

Complete these tasks together:
1. Rewrite the professional summary for the target role.
2. Reorder or rewrite skills using only skills already present in the source resume.
3. Rewrite experience bullets to emphasize relevant, existing evidence.
4. Explain each changed section for human review.
5. Draft a concise, three-paragraph cover letter from the same evidence.

Factual integrity rules:
- Never invent or infer metrics, tools, employers, responsibilities, seniority, dates, or outcomes.
- Preserve the number and order of skill groups, skills, experience entries, and bullets.
- Preserve every id exactly.
- Preserve company, role, duration, and location exactly.
- Use <strong> tags sparingly in resume content only, never in the cover letter.
- If a requirement is not supported, report it in issues instead of adding it.
- Assess 3-6 important job requirements as matched, partial, or gap. Cite concise source-resume evidence; for a gap, say "No supporting evidence found."
- Each changed section needs one review record with what changed, why it helps, the job requirement addressed, and any risk.

Return only compact valid JSON with this shape. Experience output contains only editable fields to reduce repetition:
{
  "optimizedSummary":"string",
  "optimizedSkills":[{"id":"string","name":"string","items":["string"]}],
  "optimizedExperience":[{"id":"string","metrics":["string"],"techStack":["string"]}],
  "requirements":[{"requirement":"string","status":"matched|partial|gap","evidence":"string"}],
  "issues":["unsupported requirement or factual risk"],
  "changeReviews":[{"section":"summary|skills|experience","whatChanged":"string","why":"string","jobRequirement":"string","riskLevel":"none|low|high","risk":"string"}],
  "coverLetter":"Dear Hiring Manager,\\n\\nThree concise paragraphs, 180-220 words total"
}`;

type ReviewSection = 'summary' | 'skills' | 'experience';

function normalizeSummary(value: unknown, fallback: string) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) return value.map(String).join('\n\n').trim() || fallback;
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const candidate = record.text ?? record.summary;
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    return fallback;
}

function preserveSkills(source: any[], proposed: unknown) {
    if (!Array.isArray(proposed)) return source;

    const proposedById = new Map(
        proposed
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && typeof item.id === 'string')
            .map((item) => [item.id as string, item]),
    );
    const supportedSkills = new Set(
        source.flatMap((group) => Array.isArray(group.items) ? group.items : [])
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim().toLocaleLowerCase()),
    );

    return source.map((original) => {
        const candidate = proposedById.get(original.id);
        if (!candidate || typeof candidate !== 'object') return original;
        const record = candidate as Record<string, unknown>;
        const proposedItems = Array.isArray(record.items)
            ? record.items.filter((item): item is string =>
                typeof item === 'string' && supportedSkills.has(item.trim().toLocaleLowerCase()))
            : [];
        return {
            ...original,
            id: original.id,
            name: typeof record.name === 'string' ? record.name : original.name,
            items: proposedItems.length === original.items.length ? proposedItems : original.items,
        };
    });
}

function preserveExperience(source: any[], proposed: unknown) {
    if (!Array.isArray(proposed)) return source;

    const proposedById = new Map(
        proposed
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && typeof item.id === 'string')
            .map((item) => [item.id as string, item]),
    );

    return source.map((original) => {
        const candidate = proposedById.get(original.id);
        if (!candidate || typeof candidate !== 'object') return original;
        const record = candidate as Record<string, unknown>;
        const proposedMetrics = Array.isArray(record.metrics)
            ? record.metrics.filter((item): item is string => typeof item === 'string')
            : [];
        const metrics = Array.isArray(original.metrics)
            ? original.metrics.map((metric: any, index: number) => {
                const rewrite = proposedMetrics[index];
                if (!rewrite) return metric;
                return typeof metric === 'object' && metric ? { ...metric, text: rewrite } : rewrite;
            })
            : original.metrics;
        const supportedTech = new Set(
            (Array.isArray(original.techStack) ? original.techStack : [])
                .filter((item: unknown): item is string => typeof item === 'string')
                .map((item: string) => item.trim().toLocaleLowerCase()),
        );
        const proposedTech = Array.isArray(record.techStack)
            ? record.techStack.filter((item): item is string =>
                typeof item === 'string' && supportedTech.has(item.trim().toLocaleLowerCase()))
            : [];
        const techStack = proposedTech.length ? proposedTech : original.techStack;

        return {
            ...original,
            id: original.id,
            company: original.company,
            role: original.role,
            duration: original.duration,
            ...(original.location === undefined ? {} : { location: original.location }),
            metrics,
            ...(techStack === undefined ? {} : { techStack }),
            ...(original.techStackLabel === undefined ? {} : { techStackLabel: original.techStackLabel }),
        };
    });
}

function normalizeReviews(value: unknown) {
    if (!Array.isArray(value)) return [];

    return value.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const review = item as Record<string, unknown>;
        if (!['summary', 'skills', 'experience'].includes(String(review.section))) return [];

        return [{
            section: review.section as ReviewSection,
            whatChanged: String(review.whatChanged || 'Content was rewritten for the target role.'),
            why: String(review.why || 'Improves relevance and makes supporting evidence easier to find.'),
            jobRequirement: String(review.jobRequirement || 'Relevant responsibilities in the job description'),
            riskLevel: ['none', 'low', 'high'].includes(String(review.riskLevel)) ? review.riskLevel : 'low',
            risk: String(review.risk || 'Confirm the wording accurately reflects your experience.'),
        }];
    });
}

export const POST: APIRoute = async ({ request }) => {
    const startedAt = Date.now();

    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '')?.replace('Token ', '');
        if (!token) {
            return new Response(
                JSON.stringify({ error: 'Sign in to create an application package.' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const tokenStatusResponse = await fetch(`${BACKEND_URL}/api/users/tokens/`, {
            headers: { Authorization: `Token ${token}` },
        });
        if (!tokenStatusResponse.ok) {
            return new Response(
                JSON.stringify({ error: 'Your session could not be verified. Please sign in again.' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } },
            );
        }
        const tokenStatus = await tokenStatusResponse.json();
        const tokenBalance = Number(tokenStatus.token_balance || 0);
        if (tokenBalance < APPLICATION_PACKAGE_TOKEN_COST) {
            return new Response(
                JSON.stringify({
                    error: `This application package requires ${APPLICATION_PACKAGE_TOKEN_COST} tokens.`,
                    requires_tokens: true,
                    tokens_required: APPLICATION_PACKAGE_TOKEN_COST,
                    token_balance: tokenBalance,
                }),
                { status: 402, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const { resume, jobDescription, auditResult } = await request.json();
        const trimmedJobDescription = typeof jobDescription === 'string' ? jobDescription.trim() : '';

        if (!resume || trimmedJobDescription.length < 100) {
            return new Response(
                JSON.stringify({ error: 'A resume and complete job description are required.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const apiKey = import.meta.env.OPENAI_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'OpenAI API key not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const source = {
            personalInfo: {
                fullName: resume.personalInfo?.fullName,
                title: resume.personalInfo?.title,
                location: resume.personalInfo?.location,
            },
            summary: resume.summary,
            skills: Array.isArray(resume.skills) ? resume.skills : [],
            experience: Array.isArray(resume.experience) ? resume.experience : [],
        };
        const auditGaps = Array.isArray(auditResult?.insights)
            ? auditResult.insights
                .filter((insight: any) => insight?.type === 'gap' && insight?.text)
                .map((insight: any) => String(insight.text))
                .slice(0, 10)
            : [];
        const promptPayload = {
            jobDescription: trimmedJobDescription.slice(0, MAX_JOB_DESCRIPTION_CHARS),
            resume: source,
            ...(auditGaps.length ? { auditGaps } : {}),
        };

        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
            model: import.meta.env.OPENAI_TAILOR_MODEL || 'gpt-5-mini',
            reasoning_effort: 'low',
            max_completion_tokens: 6_000,
            response_format: APPLICATION_RESPONSE_FORMAT,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: JSON.stringify(promptPayload) },
            ],
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) throw new Error('No response from AI');

        const parsed = JSON.parse(responseText);
        const optimizedResume = {
            ...resume,
            summary: normalizeSummary(parsed.optimizedSummary, resume.summary),
            skills: preserveSkills(source.skills, parsed.optimizedSkills),
            experience: preserveExperience(source.experience, parsed.optimizedExperience),
        };
        const coverLetter = typeof parsed.coverLetter === 'string' ? parsed.coverLetter.trim() : '';
        if (!coverLetter) throw new Error('The application package did not include a cover letter.');

        const requestId = request.headers.get('x-request-id') || `application-package-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const useTokenResponse = await fetch(`${BACKEND_URL}/api/users/tokens/use/`, {
            method: 'POST',
            headers: {
                Authorization: `Token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action_type: 'tailored_application_package',
                tokens: APPLICATION_PACKAGE_TOKEN_COST,
                product: 'resumevibe',
                request_id: requestId,
                description: 'Tailored resume and cover letter package',
                operation_succeeded: true,
            }),
        });
        if (!useTokenResponse.ok) {
            const tokenError = await useTokenResponse.json().catch(() => ({}));
            return new Response(
                JSON.stringify({
                    error: tokenError.error || 'Tokens could not be charged for this completed application package.',
                    requires_tokens: useTokenResponse.status === 402,
                    tokens_required: APPLICATION_PACKAGE_TOKEN_COST,
                }),
                { status: useTokenResponse.status === 402 ? 402 : 400, headers: { 'Content-Type': 'application/json' } },
            );
        }
        const tokenResult = await useTokenResponse.json();

        return new Response(JSON.stringify({
            success: true,
            optimizedResume,
            coverLetter,
            issues: Array.isArray(parsed.issues) ? parsed.issues.map(String).slice(0, 12) : [],
            changeReviews: normalizeReviews(parsed.changeReviews),
            requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
            usage: completion.usage,
            timingMs: Date.now() - startedAt,
            tokens_used: APPLICATION_PACKAGE_TOKEN_COST,
            token_balance: tokenResult.token_balance,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error tailoring application:', error);
        return new Response(JSON.stringify({
            error: 'Failed to create the tailored application package.',
            details: error instanceof Error ? error.message : 'Unknown error',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
