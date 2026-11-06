import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { AI_MODEL, AI_REASONING_EFFORT } from '../../lib/aiModel';
import { buildCoverLetterPrompt } from '../../lib/coverLetter';

const COVER_LETTER_TOKEN_COST = 30;
const BACKEND_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

export const POST: APIRoute = async ({ request }) => {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '')?.replace('Token ', '');
        if (!token) {
            return new Response(
                JSON.stringify({ error: 'Sign in to generate a cover letter.' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const { resume, jobDescription } = await request.json();
        const trimmedJobDescription = typeof jobDescription === 'string' ? jobDescription.trim() : '';
        if (!resume || trimmedJobDescription.length < 100) {
            return new Response(
                JSON.stringify({ error: 'Resume and Job Description are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check affordability before spending model capacity. This does not
        // deduct anything; the debit happens only after a valid letter exists.
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
        if (tokenBalance < COVER_LETTER_TOKEN_COST) {
            return new Response(
                JSON.stringify({
                    error: `Generating a cover letter requires ${COVER_LETTER_TOKEN_COST} tokens.`,
                    requires_tokens: true,
                    tokens_required: COVER_LETTER_TOKEN_COST,
                    token_balance: tokenBalance,
                }),
                { status: 402, headers: { 'Content-Type': 'application/json' } },
            );
        }

        if (!import.meta.env.OPENAI_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'OpenAI API key not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const openai = new OpenAI({
            apiKey: import.meta.env.OPENAI_API_KEY,
        });

        const { system: systemPrompt, user: userPrompt } = buildCoverLetterPrompt(resume, trimmedJobDescription);

        const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            reasoning_effort: AI_REASONING_EFFORT,
            max_completion_tokens: 1_000,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        });

        const coverLetter = completion.choices[0]?.message?.content?.trim();

        if (!coverLetter) {
            throw new Error('No response from AI');
        }

        // The model succeeded and returned a usable letter. Only now ask the
        // backend ledger to perform the atomic, idempotent 30-token debit.
        const requestId = request.headers.get('x-request-id')?.trim().slice(0, 200)
            || `cover-letter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const useTokenResponse = await fetch(`${BACKEND_URL}/api/users/tokens/use/`, {
            method: 'POST',
            headers: {
                Authorization: `Token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action_type: 'cover_letter',
                tokens: COVER_LETTER_TOKEN_COST,
                product: 'resumevibe',
                request_id: requestId,
                description: 'AI-generated cover letter',
                operation_succeeded: true,
            }),
        });
        if (!useTokenResponse.ok) {
            const tokenError = await useTokenResponse.json().catch(() => ({}));
            return new Response(
                JSON.stringify({
                    error: tokenError.error || 'Tokens could not be charged for this cover letter.',
                    requires_tokens: useTokenResponse.status === 402,
                    tokens_required: COVER_LETTER_TOKEN_COST,
                }),
                { status: useTokenResponse.status === 402 ? 402 : 400, headers: { 'Content-Type': 'application/json' } },
            );
        }
        const tokenResult = await useTokenResponse.json();

        return new Response(
            JSON.stringify({
                success: true,
                coverLetter,
                tokens_used: COVER_LETTER_TOKEN_COST,
                token_balance: tokenResult.token_balance,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error generating cover letter:', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to generate cover letter'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
