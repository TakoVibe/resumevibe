import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import {
    TAILORED_RESUME_RESPONSE_FORMAT,
    TAILORING_SYSTEM_PROMPT,
    buildTailoringPayload,
    mergeTailoredResume,
    normalizeChangeReviews,
    normalizeMissingSkills,
    normalizeRequirements,
    normalizeSectionFeedback,
} from '../../lib/resumeTailoring';

const MAX_JOB_DESCRIPTION_CHARS = 16_000;
const APPLICATION_PACKAGE_TOKEN_COST = 30;
const BACKEND_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

function failureResponse(
    status: number,
    error: string,
    failureCode: string,
    retryable: boolean,
    extra: Record<string, unknown> = {},
) {
    return new Response(JSON.stringify({
        success: false,
        error,
        failure_code: failureCode,
        retryable,
        tokens_charged: false,
        ...extra,
    }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function generationFailureMessage(error: unknown) {
    const status = Number((error as { status?: unknown } | null)?.status || 0);
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : '';

    if (status === 429) {
        return {
            message: 'The application service is busy right now. Please wait a moment and try again.',
            code: 'generation_rate_limited',
        };
    }
    if ([408, 500, 502, 503, 504].includes(status) || name === 'AbortError') {
        return {
            message: 'The application service did not finish in time. Please try again.',
            code: 'generation_service_unavailable',
        };
    }
    if (error instanceof SyntaxError || message === 'No response from AI' || message.includes('did not include a cover letter')) {
        return {
            message: 'The generated package was incomplete and did not pass our review checks. Please try again.',
            code: 'invalid_generated_package',
        };
    }
    return {
        message: 'We could not complete the application review. Please try again.',
        code: 'generation_failed',
    };
}

export const POST: APIRoute = async ({ request }) => {
    const startedAt = Date.now();
    let phase: 'session' | 'generation' | 'charge' = 'session';

    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '')?.replace('Token ', '');
        if (!token) {
            return failureResponse(401, 'Sign in to create an application package.', 'authentication_required', false);
        }

        const tokenStatusResponse = await fetch(`${BACKEND_URL}/api/users/tokens/`, {
            headers: { Authorization: `Token ${token}` },
        });
        if (!tokenStatusResponse.ok) {
            return failureResponse(401, 'Your session could not be verified. Please sign in again.', 'session_invalid', false);
        }
        const tokenStatus = await tokenStatusResponse.json();
        const tokenBalance = Number(tokenStatus.token_balance || 0);
        if (tokenBalance < APPLICATION_PACKAGE_TOKEN_COST) {
            return failureResponse(
                402,
                `This application package requires ${APPLICATION_PACKAGE_TOKEN_COST} tokens.`,
                'insufficient_tokens',
                false,
                {
                    requires_tokens: true,
                    tokens_required: APPLICATION_PACKAGE_TOKEN_COST,
                    token_balance: tokenBalance,
                },
            );
        }

        let requestBody: Record<string, any>;
        try {
            requestBody = await request.json();
        } catch {
            return failureResponse(400, 'The application request could not be read. Please try again.', 'invalid_request', true);
        }
        const { resume, jobDescription, auditResult } = requestBody;
        const trimmedJobDescription = typeof jobDescription === 'string' ? jobDescription.trim() : '';

        if (!resume || trimmedJobDescription.length < 100) {
            return failureResponse(400, 'A resume and complete job description are required.', 'incomplete_application_input', false);
        }

        const apiKey = import.meta.env.OPENAI_API_KEY;
        if (!apiKey) {
            return failureResponse(503, 'The application service is temporarily unavailable. Please try again later.', 'generation_not_configured', true);
        }

        phase = 'generation';

        const auditGaps = Array.isArray(auditResult?.insights)
            ? auditResult.insights
                .filter((insight: any) => insight?.type === 'gap' && insight?.text)
                .map((insight: any) => String(insight.text))
                .slice(0, 10)
            : [];
        const promptPayload = buildTailoringPayload(
            resume,
            trimmedJobDescription.slice(0, MAX_JOB_DESCRIPTION_CHARS),
            auditGaps,
        );

        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
            model: import.meta.env.OPENAI_TAILOR_MODEL || 'gpt-5-mini',
            reasoning_effort: 'low',
            // The pass now rewrites every written section, scores requirements,
            // and returns advisory feedback, so it needs a wider output budget.
            max_completion_tokens: 20_000,
            response_format: TAILORED_RESUME_RESPONSE_FORMAT,
            messages: [
                { role: 'system', content: TAILORING_SYSTEM_PROMPT },
                { role: 'user', content: JSON.stringify(promptPayload) },
            ],
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) throw new Error('No response from AI');

        const parsed = JSON.parse(responseText);
        const { optimizedResume, changedSections, proposals, guardNotes } = mergeTailoredResume(resume, parsed);
        const coverLetter = typeof parsed.coverLetter === 'string' ? parsed.coverLetter.trim() : '';
        if (!coverLetter) throw new Error('The application package did not include a cover letter.');

        const issues = [
            ...(Array.isArray(parsed.issues) ? parsed.issues.map(String) : []),
            ...guardNotes,
        ].slice(0, 16);

        const requestId = request.headers.get('x-request-id') || `application-package-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        phase = 'charge';
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
                description: 'Full-resume tailoring, review feedback and cover letter package',
                operation_succeeded: true,
            }),
        });
        if (!useTokenResponse.ok) {
            await useTokenResponse.json().catch(() => ({}));
            const hasInsufficientTokens = useTokenResponse.status === 402;
            return failureResponse(
                hasInsufficientTokens ? 402 : 503,
                hasInsufficientTokens
                    ? `Your token balance changed. This application package requires ${APPLICATION_PACKAGE_TOKEN_COST} tokens.`
                    : 'The review was built, but the token charge could not be completed. Please try again.',
                hasInsufficientTokens ? 'insufficient_tokens' : 'token_charge_failed',
                !hasInsufficientTokens,
                {
                    requires_tokens: hasInsufficientTokens,
                    tokens_required: APPLICATION_PACKAGE_TOKEN_COST,
                },
            );
        }
        const tokenResult = await useTokenResponse.json().catch(() => ({}));

        return new Response(JSON.stringify({
            success: true,
            optimizedResume,
            changedSections,
            proposals,
            coverLetter,
            issues,
            changeReviews: normalizeChangeReviews(parsed.changeReviews),
            requirements: normalizeRequirements(parsed.requirements),
            missingSkills: normalizeMissingSkills(parsed.missingSkills),
            sectionFeedback: normalizeSectionFeedback(parsed.sectionFeedback),
            usage: completion.usage,
            timingMs: Date.now() - startedAt,
            tokens_used: APPLICATION_PACKAGE_TOKEN_COST,
            token_balance: tokenResult.token_balance,
            tokens_charged: true,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error tailoring application:', error);
        if (phase === 'charge') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Your application was built, but we could not confirm the token charge. Your balance is being refreshed.',
                failure_code: 'token_charge_unconfirmed',
                retryable: true,
                token_charge_status: 'unknown',
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        if (phase === 'session') {
            return failureResponse(
                503,
                'We could not verify your account right now. Please try again.',
                'account_service_unavailable',
                true,
            );
        }
        const failure = generationFailureMessage(error);
        return failureResponse(503, failure.message, failure.code, true);
    }
};
