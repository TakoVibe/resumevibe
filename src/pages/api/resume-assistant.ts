import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI({
    apiKey: import.meta.env.OPENAI_API_KEY,
});

const RequestSchema = z.object({
    message: z.string().trim().min(1).max(2000),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
    })).max(10).default([]),
    resume: z.record(z.string(), z.unknown()),
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
});

type RawSuggestion = z.infer<typeof AssistantResponseSchema>['suggestions'][number];

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
        if (!import.meta.env.OPENAI_API_KEY) {
            return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const parsedRequest = RequestSchema.safeParse(await request.json());
        if (!parsedRequest.success) {
            return new Response(JSON.stringify({ error: 'Invalid assistant request' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { message, history, resume } = parsedRequest.data;
        const resumeContext = compactResume(resume);

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
                    content: `${message}\n\nCURRENT RESUME JSON:\n${JSON.stringify(resumeContext)}`,
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

        return new Response(JSON.stringify({
            success: true,
            reply: parsed.reply,
            questions,
            suggestions,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Resume assistant error:', error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : 'The assistant could not respond.',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
