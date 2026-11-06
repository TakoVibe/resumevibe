import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { AI_MODEL, AI_REASONING_EFFORT } from '../../lib/aiModel';
import { z } from 'zod';
import { chargeTokens, requireTokens } from '../../lib/tokenGate';

const DEEP_AUDIT_TOKEN_COST = 30;

const AuditInsightSchema = z.object({
    type: z.enum(['strength', 'gap', 'recommendation']),
    category: z.string(),
    text: z.string(),
    impact: z.enum(['high', 'medium', 'low'])
});

const DeepAuditResponseSchema = z.object({
    aiScore: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    narrativeAnalysis: z.string(),
    insights: z.array(AuditInsightSchema),
    jdAlignment: z.object({
        score: z.number(),
        missingCriticalSkills: z.array(z.string()),
        strengths: z.array(z.string())
    })
});

const SYSTEM_PROMPT = `You are an Elite Executive Recruiter and Resume Auditor.
Your task is to perform a high-fidelity "Deep Audit" of a resume against a job description.

Unlike a simple keyword matcher, you look for:
1. **Career Narrative**: Does the resume tell a cohesive story of growth?
2. **Quantitative Power**: Is the impact measured in revenue, scale, or users?
3. **Tone & Authority**: Does the language sound like a leader or an order-taker?
4. **Structural Gaps**: What is missing that this SPECIFIC JD demands (e.g., obscure tech, soft skills)?

**OUTPUT REQUIREMENTS:**
- Respond with ONLY a valid JSON object.
- **Required Fields**:
    - \`aiScore\`: (number 0-100) Overall strength
    - \`confidence\`: (number 0-100) How well you matched the JD
    - \`narrativeAnalysis\`: (string) 2-3 sentence "vibe" check
    - \`insights\`: (array of objects with {type: 'strength'|'gap'|'recommendation', category: string, text: string, impact: 'high'|'medium'|'low'})
    - \`jdAlignment\`: (object with {score: number, missingCriticalSkills: string[], strengths: string[]})
- Be brutally honest but constructive.
- 'insights' should contain at least 4-6 high-quality observations.
- **Formatting**: Use <strong> tags within the 'text' field to highlight "weighty" words (revenue, specific tech, major gaps). Be strategic—only bold 1-2 most impactful terms per insight to maintain professional clarity.
- **Date Standardization**: When recommending date-related changes, always use the 'MM/YYYY - MM/YYYY' format (e.g., '08/2018 - 08/2022'). Ensure 'Present' is used for current roles.`;

export const POST: APIRoute = async ({ request }) => {
    try {
        const gate = await requireTokens(request, DEEP_AUDIT_TOKEN_COST, 'Deep audit');
        if (gate instanceof Response) return gate;

        const { resume, jobDescription, actionType } = await request.json();

        if (!resume) {
            return new Response(
                JSON.stringify({ error: 'Missing resume data' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = import.meta.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('OPENAI_API_KEY is missing');
            return new Response(
                JSON.stringify({ error: 'Deep Audit requires an OpenAI API Key. Please add it to your environment.' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const openai = new OpenAI({ apiKey });

        const userPrompt = `**Job Description:**
${jobDescription || 'Not provided. Analyze for general senior-level professional standards.'}

**Resume JSON:**
${JSON.stringify(resume, null, 2)}

Perform a Deep Audit. Return the results in the specified JSON format.`;

        const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            reasoning_effort: AI_REASONING_EFFORT,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
        });

        const responseText = completion.choices[0].message.content;

        if (!responseText) throw new Error('AI returned empty response');

        // Resilience: Clean JSON if AI wrapped it in backticks
        const cleanJson = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

        let auditData;
        try {
            const parsed = JSON.parse(cleanJson);
            auditData = DeepAuditResponseSchema.parse(parsed);
        } catch (err) {
            console.error('Audit Schema Validation Failed:', err);
            console.log('Raw Response:', responseText);
            throw new Error('AI response did not match the required schema.');
        }

        const chargeFailure = await chargeTokens(gate.token, {
            actionType: actionType === 'pilot_mode' ? 'pilot_mode' : 'deep_audit',
            cost: DEEP_AUDIT_TOKEN_COST,
            description: 'Deep audit',
        });
        if (chargeFailure) return chargeFailure;

        return new Response(
            JSON.stringify({
                success: true,
                audit: auditData,
                usage: completion.usage
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Deep Audit Execution Error:', error);
        return new Response(
            JSON.stringify({
                error: 'Deep Audit Failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
