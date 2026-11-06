import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { RESUME_ASSISTANT_ACTION_TYPE, RESUME_ASSISTANT_TOKEN_COST, canonicalizeAssistantSuggestions } from '../../lib/resumeAssistant';
import { AI_MODEL, AI_REASONING_EFFORT } from '../../lib/aiModel';
import { AssistantResponseSchema, RESUME_ASSISTANT_SYSTEM_PROMPT, buildAssistantUserMessage } from '../../lib/resumeAssistantPrompt';

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

        const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.parse({
            model: AI_MODEL,
            reasoning_effort: AI_REASONING_EFFORT,
            messages: [
                {
                    role: 'system',
                    content: RESUME_ASSISTANT_SYSTEM_PROMPT,
                },
                ...history,
                {
                    role: 'user',
                    content: buildAssistantUserMessage(message, memory, resume),
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

        const { suggestions, dropped } = canonicalizeAssistantSuggestions(parsed.suggestions, resume);
        if (dropped.length > 0) {
            console.warn('Resume assistant dropped suggestions', { proposed: parsed.suggestions.length, kept: suggestions.length, dropped });
        }
        // The model's reply described edits that could not be matched to the resume; do not promise them.
        const reply = parsed.suggestions.length > 0 && suggestions.length === 0
            ? "I couldn't match that change to a specific part of your resume, so nothing changed and no tokens were used. Tell me which section or bullet you mean, for example by quoting its first few words."
            : parsed.reply;

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
            reply,
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
