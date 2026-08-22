import type { APIRoute } from 'astro';
import OpenAI from 'openai';

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

        // Only send the parts of the resume we want the AI to base the cover letter on
        const targetedResumeElements = {
            personalInfo: {
                fullName: resume.personalInfo?.fullName,
                title: resume.personalInfo?.title,
                location: resume.personalInfo?.location,
            },
            summary: resume.summary,
            skills: resume.skills,
            experience: resume.experience
        };

        const systemPrompt = `You are an expert career coach and professional writer.
Your task is to write a compelling, tailored cover letter based on the candidate's resume and the target job description.

RULES:
1. Write in a professional, confident, and engaging tone.
2. The letter should contain a greeting followed by exactly 3 paragraphs:
   - Paragraph 1: A direct introduction stating the target role and the candidate's strongest supported fit.
   - Paragraph 2: Highlight 1-2 specific, quantifiable achievements from the resume that directly align with the core needs of the job description.
   - Paragraph 3: A strong closing statement reiterating excitement for the role and a call to action for an interview.
3. Do NOT include placeholder addresses or dates at the top. Just return the core body of the letter.
4. Keep it concise (180-220 words).
5. Address the hiring manager directly if a name is inferable, otherwise use "Dear Hiring Manager,".
6. Never invent metrics, tools, responsibilities, employers, seniority, or outcomes. Use only evidence present in the supplied resume.
7. Do not describe the candidate as a "perfect fit" and do not overstate partial evidence.
8. Return ONLY the cover letter text, no explanations.`;

        const userPrompt = `** Job Description:**
${trimmedJobDescription.slice(0, 16000)}

** Candidate Resume:**
${JSON.stringify(targetedResumeElements, null, 2)}

Write the cover letter now.`;

        const completion = await openai.chat.completions.create({
            model: import.meta.env.OPENAI_COVER_LETTER_MODEL || 'gpt-4o-mini',
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
