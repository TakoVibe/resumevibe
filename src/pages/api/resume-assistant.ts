import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { RESUME_ASSISTANT_ACTION_TYPE, RESUME_ASSISTANT_TOKEN_COST } from '../../lib/resumeAssistant';

const BACKEND_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
const MAX_REQUEST_BYTES = 250_000;

const RequestSchema = z.object({
    message: z.string().trim().min(1).max(2000),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
    })).max(10).default([]),
    resume: z.record(z.string(), z.unknown()),
    memory: z.array(z.object({
        category: z.enum(['technology', 'work_context', 'achievement', 'target_role', 'preference']),
        fact: z.string().trim().min(1).max(240),
    })).max(30).default([]),
});

const AssistantResponseSchema = z.object({
    reply: z.string(),
    questions: z.array(z.object({
        id: z.string(),
        prompt: z.string(),
        inputType: z.enum(['single_choice', 'multi_choice', 'text']),
        options: z.array(z.string()),
        required: z.boolean(),
    })),
    suggestions: z.array(z.object({
        section: z.enum(['summary', 'experience', 'projects', 'skills', 'achievements']),
        targetId: z.string(),
        targetIndex: z.number().int(),
        after: z.string(),
        reason: z.string(),
        evidence: z.enum(['resume', 'user', 'confirmation']),
    })),
    confirmedFacts: z.array(z.object({
        category: z.enum(['technology', 'work_context', 'achievement', 'target_role', 'preference']),
        fact: z.string(),
    })),
});

type RawSuggestion = z.infer<typeof AssistantResponseSchema>['suggestions'][number];

function failureResponse(
    status: number,
    error: string,
    failureCode: string,
    extra: Record<string, unknown> = {},
) {
    return new Response(JSON.stringify({
        success: false,
        error,
        failure_code: failureCode,
        tokens_charged: false,
        ...extra,
    }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function itemText(item: unknown) {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'text' in item) return String((item as { text?: unknown }).text || '');
    return '';
}

function compactResume(resume: Record<string, unknown>) {
    const personalInfo = resume.personalInfo && typeof resume.personalInfo === 'object'
        ? resume.personalInfo as Record<string, unknown>
        : {};

    return {
        targetRole: String(personalInfo.title || ''),
        summary: String(resume.summary || ''),
        experience: Array.isArray(resume.experience) ? resume.experience : [],
        projects: Array.isArray(resume.projects) ? resume.projects : [],
        skills: Array.isArray(resume.skills) ? resume.skills : [],
        achievements: Array.isArray(resume.achievements) ? resume.achievements : [],
        education: Array.isArray(resume.education) ? resume.education : [],
        targetJobDescription: String(resume.targetJD || ''),
    };
}

function canonicalizeSuggestion(suggestion: RawSuggestion, resume: Record<string, unknown>, index: number) {
    const after = suggestion.after.trim();
    if (!after) return null;

    let before = '';
    let targetId = suggestion.targetId;
    let targetIndex = suggestion.targetIndex;

    if (suggestion.section === 'summary') {
        before = String(resume.summary || '');
        targetId = '';
        targetIndex = -1;
    } else if (suggestion.section === 'experience') {
        const experience = Array.isArray(resume.experience) ? resume.experience as Array<any> : [];
        const entry = experience.find((item) => String(item?.id) === targetId);
        if (!entry || !Array.isArray(entry.metrics) || targetIndex < 0 || targetIndex >= entry.metrics.length) return null;
        before = itemText(entry.metrics[targetIndex]);
    } else if (suggestion.section === 'projects') {
        const projects = Array.isArray(resume.projects) ? resume.projects as Array<any> : [];
        const entry = projects.find((item) => String(item?.id) === targetId);
        if (!entry) return null;
        before = String(entry.description || '');
        targetIndex = -1;
    } else if (suggestion.section === 'skills') {
        const skills = Array.isArray(resume.skills) ? resume.skills as Array<any> : [];
        const entry = skills.find((item) => String(item?.id) === targetId);
        if (!entry || !Array.isArray(entry.items)) return null;
        before = entry.items.map(String).join(', ');
        targetIndex = -1;
    } else {
        const achievements = Array.isArray(resume.achievements) ? resume.achievements : [];
        if (targetIndex < 0 || targetIndex >= achievements.length) return null;
        before = itemText(achievements[targetIndex]);
        targetId = '';
    }

    if (before.trim() === after) return null;

    return {
        id: `assistant-${Date.now()}-${index}`,
        section: suggestion.section,
        targetId,
        targetIndex,
        before,
        after,
        reason: suggestion.reason.trim() || 'Makes this part of the resume clearer and more relevant.',
        evidence: suggestion.evidence,
    };
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '')?.replace('Token ', '')?.trim();
        if (!token) {
            return failureResponse(401, 'Sign in to use Resume Copilot.', 'authentication_required');
        }

        const declaredLength = Number(request.headers.get('content-length') || 0);
        if (declaredLength > MAX_REQUEST_BYTES) {
            return failureResponse(413, 'The assistant request is too large.', 'request_too_large');
        }

        const tokenStatusResponse = await fetch(`${BACKEND_URL}/api/users/tokens/`, {
            headers: { Authorization: `Token ${token}` },
        });
        if (!tokenStatusResponse.ok) {
            return failureResponse(401, 'Your session could not be verified. Please sign in again.', 'session_invalid');
        }
        const tokenStatus = await tokenStatusResponse.json();
        const tokenBalance = Number(tokenStatus.token_balance || 0);
        if (tokenBalance < RESUME_ASSISTANT_TOKEN_COST) {
            return failureResponse(
                402,
                `Resume Copilot suggestions require ${RESUME_ASSISTANT_TOKEN_COST} tokens.`,
                'insufficient_tokens',
                {
                    requires_tokens: true,
                    tokens_required: RESUME_ASSISTANT_TOKEN_COST,
                    token_balance: tokenBalance,
                },
            );
        }

        if (!import.meta.env.OPENAI_API_KEY) {
            return failureResponse(503, 'Resume Copilot is temporarily unavailable.', 'generation_not_configured');
        }

        let requestBody: unknown;
        try {
            requestBody = await request.json();
        } catch {
            return failureResponse(400, 'The assistant request could not be read.', 'invalid_request');
        }

        if (JSON.stringify(requestBody).length > MAX_REQUEST_BYTES) {
            return failureResponse(413, 'The assistant request is too large.', 'request_too_large');
        }

        const parsedRequest = RequestSchema.safeParse(requestBody);
        if (!parsedRequest.success) {
            return failureResponse(400, 'Invalid assistant request.', 'invalid_request');
        }

        const { message, history, resume, memory } = parsedRequest.data;
        const resumeContext = compactResume(resume);

        const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.parse({
            model: 'gpt-5-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are ResumeVibe Copilot, a concise and honest resume collaborator.

Help the user discuss, review, and improve the supplied resume. You may answer without suggesting an edit. When an edit is useful, return one to three precise suggestions that target the supplied IDs and indexes.

Rules:
- Never invent employers, responsibilities, technologies, dates, metrics, qualifications, or achievements.
- You may use a new fact only when the user explicitly supplied it in this conversation.
- Mark every suggestion with exactly one evidence source:
  - evidence=resume when every factual claim is already present in CURRENT RESUME JSON.
  - evidence=user when the suggestion uses a fact the user supplied in this conversation that is not yet in the resume.
  - evidence=confirmation only when existing resume wording is ambiguous and your interpretation should be verified. Never use this as permission to invent a fact.
- Default to one concise, recruiter-readable, ATS-aware resume. Do not ask whether the user wants ATS optimization, recruiter readability, both, or multiple versions unless they explicitly request alternatives.
- Do not ask whether you may change the target title. Recommend a grounded title change as a suggestion only when the requested role makes it useful.
- Ask clarification questions only for factual evidence needed to make a safe edit, never for preferences that have a sensible product default.
- If a useful rewrite requires a missing fact, ask a short follow-up question and return no suggestion for that claim.
- Put follow-up questions in the structured questions array, not as a numbered list in reply.
- Ask no more than four questions at once. Group related technologies into one multi_choice question.
- Use single_choice when exactly one answer is expected, multi_choice when several may apply, and text only when choices would be misleading.
- Provide two to six short options for choice questions. Include "None" or "Not sure" when useful. For text questions, return an empty options array.
- Keep reply short when questions are present; the UI will render the questions as interactive controls.
- Keep the user's tone and meaning. Do not keyword-stuff.
- Technologies explicitly selected by the user may be added to an existing skills group or accurately reflected in the summary. Do not attach them to an employer, project, or achievement until the user identifies where they were used and what they did.
- After the user answers clarification questions, prepare grounded suggestions immediately when possible. If experience still cannot be changed safely, say which concrete work context is missing.
- CONFIRMED PER-RESUME MEMORY contains durable facts the user previously supplied. Treat those facts as user evidence.
- Return confirmedFacts only for new durable facts explicitly stated by the user in their latest message. Never infer a fact. Do not store requests, questions, temporary instructions, or facts that only appear in the resume.
- Useful memory categories are: technology used, work context, achievement, target role, and durable writing preference. Return an empty confirmedFacts array when nothing new should be remembered.
- When the user says "replace X with..." and X exactly or closely matches existing resume text, locate that text and return a suggestion immediately. Improve clarity and recruiter appeal using only the facts already present; do not ask follow-up questions unless the requested rewrite requires a new factual claim.
- For summary, use section=summary, targetId="", targetIndex=-1.
- For an experience bullet, use its experience id and exact zero-based metrics index.
- For a project description, use its project id and targetIndex=-1.
- For skills, target one existing skill-group id and return the full comma-separated replacement list.
- For an achievement, use targetId="" and its exact zero-based index.
- Keep replies conversational and under 100 words. The UI will separately display before/after changes.`,
                },
                ...history,
                {
                    role: 'user',
                    content: `${message}\n\nCONFIRMED PER-RESUME MEMORY:\n${JSON.stringify(memory)}\n\nCURRENT RESUME JSON:\n${JSON.stringify(resumeContext)}`,
                },
            ],
            response_format: zodResponseFormat(AssistantResponseSchema, 'resume_assistant_response'),
        });

        const parsed = completion.choices[0]?.message.parsed;
        if (!parsed) {
            return new Response(JSON.stringify({ error: 'The assistant could not prepare a response.' }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const suggestions = parsed.suggestions
            .map((suggestion, index) => canonicalizeSuggestion(suggestion, resume, index))
            .filter((suggestion): suggestion is NonNullable<typeof suggestion> => Boolean(suggestion))
            .slice(0, 3);

        const questions = parsed.questions
            .map((question, index) => {
                const prompt = question.prompt.trim();
                if (!prompt) return null;
                const options = [...new Set(question.options.map((option) => option.trim()).filter(Boolean))].slice(0, 6);
                const inputType = question.inputType !== 'text' && options.length < 2 ? 'text' : question.inputType;
                return {
                    id: question.id.trim() || `question-${index + 1}`,
                    prompt,
                    inputType,
                    options: inputType === 'text' ? [] : options,
                    required: question.required,
                };
            })
            .filter((question): question is NonNullable<typeof question> => Boolean(question))
            .slice(0, 4);

        const seenFacts = new Set<string>();
        const confirmedFacts = parsed.confirmedFacts
            .map((item, index) => {
                const fact = item.fact.trim().replace(/\s+/g, ' ').slice(0, 240);
                const normalized = fact.toLocaleLowerCase();
                if (!fact || seenFacts.has(normalized)) return null;
                seenFacts.add(normalized);
                return {
                    id: `fact-${Date.now()}-${index}`,
                    category: item.category,
                    fact,
                    createdAt: Date.now(),
                };
            })
            .filter((fact): fact is NonNullable<typeof fact> => Boolean(fact))
            .slice(0, 8);

        let chargedTokenBalance = tokenBalance;
        if (suggestions.length > 0) {
            const requestId = request.headers.get('x-request-id')?.trim().slice(0, 200)
                || `resume-assistant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            const useTokenResponse = await fetch(`${BACKEND_URL}/api/users/tokens/use/`, {
                method: 'POST',
                headers: {
                    Authorization: `Token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action_type: RESUME_ASSISTANT_ACTION_TYPE,
                    tokens: RESUME_ASSISTANT_TOKEN_COST,
                    product: 'resumevibe',
                    request_id: requestId,
                    description: 'Resume Copilot change set',
                    operation_succeeded: true,
                }),
            });
            if (!useTokenResponse.ok) {
                const insufficientTokens = useTokenResponse.status === 402;
                return failureResponse(
                    insufficientTokens ? 402 : 503,
                    insufficientTokens
                        ? `Your balance changed. Resume Copilot suggestions require ${RESUME_ASSISTANT_TOKEN_COST} tokens.`
                        : 'The suggestion was prepared, but its token charge could not be completed. Please try again.',
                    insufficientTokens ? 'insufficient_tokens' : 'token_charge_failed',
                    {
                        requires_tokens: insufficientTokens,
                        tokens_required: RESUME_ASSISTANT_TOKEN_COST,
                    },
                );
            }
            const tokenResult = await useTokenResponse.json().catch(() => ({}));
            chargedTokenBalance = Number(tokenResult.token_balance ?? tokenBalance - RESUME_ASSISTANT_TOKEN_COST);
        }

        return new Response(JSON.stringify({
            success: true,
            reply: parsed.reply,
            questions,
            suggestions,
            confirmedFacts,
            tokens_used: suggestions.length > 0 ? RESUME_ASSISTANT_TOKEN_COST : 0,
            token_balance: chargedTokenBalance,
            tokens_charged: suggestions.length > 0,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Resume assistant error:', error);
        const status = Number((error as { status?: unknown } | null)?.status || 0);
        if (status === 429) {
            return failureResponse(503, 'Resume Copilot is busy right now. Please wait a moment and try again.', 'generation_rate_limited');
        }
        return failureResponse(503, 'The assistant could not complete this request. Please try again.', 'generation_failed');
    }
};
