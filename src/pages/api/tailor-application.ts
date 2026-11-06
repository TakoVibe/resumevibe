import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { AI_MODEL, AI_REASONING_EFFORT } from '../../lib/aiModel';
import { buildCoverLetterPrompt } from '../../lib/coverLetter';
import {
    TAILORING_REVIEW_PROMPT,
    TAILORING_REVIEW_RESPONSE_FORMAT,
    TAILORING_REWRITE_PROMPT,
    TAILORING_REWRITE_RESPONSE_FORMAT,
    buildTailoringPayload,
    mergeTailoredResume,
    normalizeChangeReviews,
    normalizeMissingSkills,
    normalizeRequirements,
    normalizeSectionFeedback,
} from '../../lib/resumeTailoring';

const MAX_JOB_DESCRIPTION_CHARS = 16_000;
const APPLICATION_PACKAGE_TOKEN_COST = 30;
const GENERATION_TIMEOUT_MS = 90_000;
const MAX_JSON_OUTPUT_TOKENS = 20_000;
const MAX_COVER_LETTER_OUTPUT_TOKENS = 1_000;
const STREAM_CONTENT_TYPE = 'application/x-ndjson';
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

        const buildPackage = (onPart: PartListener = () => {}) => generatePackage({
            request, token, resume, trimmedJobDescription, auditResult, apiKey, startedAt, onPart,
        });
        if (!request.headers.get('accept')?.includes(STREAM_CONTENT_TYPE)) return await buildPackage();
        return streamPackage(buildPackage);
    } catch (error) {
        console.error('Error verifying the application request:', error);
        return failureResponse(
            503,
            'We could not verify your account right now. Please try again.',
            'account_service_unavailable',
            true,
        );
    }
};

type PartListener = (event: Record<string, unknown>) => void;

/**
 * Sends the cover letter and the review as JSON lines the moment each is ready, then a
 * final `done` line carrying the status and body the plain JSON response would have had.
 */
function streamPackage(buildPackage: (onPart: PartListener) => Promise<Response>) {
    const encoder = new TextEncoder();
    let open = true;
    return new Response(new ReadableStream({
        async start(controller) {
            const send: PartListener = (event) => {
                if (open) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            };
            const result = await buildPackage(send);
            send({ type: 'done', status: result.status, ...(await result.json()) });
            if (open) controller.close();
        },
        // If the browser goes away, generation and the charge still finish, as with the JSON response.
        cancel() {
            open = false;
        },
    }), {
        headers: { 'Content-Type': STREAM_CONTENT_TYPE, 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    });
}

async function generatePackage({ request, token, resume, trimmedJobDescription, auditResult, apiKey, startedAt, onPart }: {
    request: Request;
    token: string;
    resume: any;
    trimmedJobDescription: string;
    auditResult: any;
    apiKey: string;
    startedAt: number;
    onPart: PartListener;
}): Promise<Response> {
    let phase: 'generation' | 'charge' = 'generation';
    try {
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

        const openai = new OpenAI({ apiKey, timeout: GENERATION_TIMEOUT_MS });
        const userContent = JSON.stringify(promptPayload);
        const generateJson = async (systemPrompt: string, responseFormat: typeof TAILORING_REVIEW_RESPONSE_FORMAT) => {
            const completion = await openai.chat.completions.create({
                model: AI_MODEL,
                reasoning_effort: AI_REASONING_EFFORT,
                max_completion_tokens: MAX_JSON_OUTPUT_TOKENS,
                response_format: responseFormat,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent },
                ],
            });
            const text = completion.choices[0]?.message?.content;
            if (!text) throw new Error('No response from AI');
            return JSON.parse(text);
        };
        // Same letter the standalone Cover letter feature writes, generated alongside the resume work.
        const coverLetterPrompt = buildCoverLetterPrompt(resume, trimmedJobDescription);
        const coverLetterTask = openai.chat.completions.create({
            model: AI_MODEL,
            reasoning_effort: AI_REASONING_EFFORT,
            max_completion_tokens: MAX_COVER_LETTER_OUTPUT_TOKENS,
            messages: [
                { role: 'system', content: coverLetterPrompt.system },
                { role: 'user', content: coverLetterPrompt.user },
            ],
        }).then((completion) => {
            const coverLetter = completion.choices[0]?.message?.content?.trim() || '';
            if (!coverLetter) throw new Error('The application package did not include a cover letter.');
            onPart({ type: 'coverLetter', coverLetter });
            return coverLetter;
        });
        const reviewTask = generateJson(TAILORING_REVIEW_PROMPT, TAILORING_REVIEW_RESPONSE_FORMAT).then((review) => {
            onPart({
                type: 'review',
                requirements: normalizeRequirements(review.requirements),
                missingSkills: normalizeMissingSkills(review.missingSkills),
                sectionFeedback: normalizeSectionFeedback(review.sectionFeedback),
            });
            return review;
        });
        const [rewrite, review, coverLetter] = await Promise.all([
            generateJson(TAILORING_REWRITE_PROMPT, TAILORING_REWRITE_RESPONSE_FORMAT),
            reviewTask,
            coverLetterTask,
        ]);

        const parsed = { ...rewrite, ...review };
        const { optimizedResume, changedSections, proposals, guardNotes } = mergeTailoredResume(resume, parsed);

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
        const failure = generationFailureMessage(error);
        return failureResponse(503, failure.message, failure.code, true);
    }
}
