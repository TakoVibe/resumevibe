import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { AI_MODEL, AI_REASONING_EFFORT } from '../../lib/aiModel';
import { MAX_OPTIMIZE_TEXT_CHARS, OPTIMIZE_TEXT_TOKEN_COST, buildOptimizeTextPrompt } from '../../lib/optimizeText';
import { chargeTokens, jsonFailure, requireTokens } from '../../lib/tokenGate';

const openai = new OpenAI({
    apiKey: import.meta.env.OPENAI_API_KEY,
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const gate = await requireTokens(request, OPTIMIZE_TEXT_TOKEN_COST, 'AI rewrite');
        if (gate instanceof Response) return gate;

        const { text, context, type } = await request.json();
        if (typeof text === 'string' && text.length > MAX_OPTIMIZE_TEXT_CHARS) {
            return jsonFailure(413, 'This text is too long to rewrite.', 'request_too_large');
        }

        if (!import.meta.env.OPENAI_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'OpenAI API key not configured' }),
                { status: 500 }
            );
        }

        if (!text || !type) {
            return new Response(
                JSON.stringify({ error: 'Text and type are required' }),
                { status: 400 }
            );
        }

        const prompt = buildOptimizeTextPrompt(text, type, context);
        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });
        }
        const systemPrompt = prompt.system;
        const userPrompt = prompt.user;

        const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            reasoning_effort: AI_REASONING_EFFORT,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            // max_tokens: 1000,
        });

        const optimizedText = completion.choices[0]?.message?.content?.trim();

        if (!optimizedText) {
            throw new Error('No response from AI');
        }

        const chargeFailure = await chargeTokens(gate.token, { actionType: 'inline_edit', cost: OPTIMIZE_TEXT_TOKEN_COST, description: 'Inline AI rewrite' });
        if (chargeFailure) return chargeFailure;

        return new Response(
            JSON.stringify({
                success: true,
                original: text,
                optimized: optimizedText,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Inline optimization error:', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to optimize text',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
