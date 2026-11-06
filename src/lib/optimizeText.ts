export const OPTIMIZE_TEXT_TOKEN_COST = 5;
export const MAX_OPTIMIZE_TEXT_CHARS = 20_000;

export interface OptimizeTextContext {
    jobDescription?: string;
    role?: string;
    company?: string;
    projectName?: string;
    techStack?: string[];
}

/** System and user prompts for the inline AI rewrite of one resume field; null for an unknown type. */
export function buildOptimizeTextPrompt(text: string, type: string, context?: OptimizeTextContext): { system: string; user: string } | null {
    switch (type) {
        case 'bullet': {
            const systemPrompt = `You are an expert resume writer specializing in achievement-oriented bullet points. 
Your task is to rewrite resume bullet points to be more impactful, quantifiable, and ATS-friendly.

RULES:
1. Start with strong action verbs (Led, Developed, Implemented, Achieved, etc.)
2. Keep every metric from the original. Never invent metrics, numbers, technologies, or results that are not in the original. A percentage is fine only when it follows directly from numbers in the original.
3. Keep it concise (1-2 lines maximum)
4. Use professional language
5. Focus on impact and results
6. Make it ATS-friendly with relevant keywords
7. Maintain similar length and detail level unless the original is very short
8. Use <strong> tags to highlight key metrics and numbers (e.g. <strong>20% revenue growth</strong>)
9. Return ONLY the optimized text, no explanations`;

            const userPrompt = `Original bullet point: "${text}"

${context?.jobDescription ? `Job context: ${context.jobDescription.substring(0, 200)}...` : ''}
${context?.role ? `Role: ${context.role}` : ''}
${context?.company ? `Company: ${context.company}` : ''}

Rewrite this bullet point to be more impactful. Return only the improved text.`;
            return { system: systemPrompt, user: userPrompt };
        }

        case 'summary': {
            const systemPrompt = `You are an expert resume writer specializing in professional summaries.
Your task is to rewrite professional summaries to be compelling, keyword-rich, and tailored to the target role.

RULES:
1. Keep it 2-3 sentences
2. Highlight key strengths and expertise
3. Include relevant keywords
4. Be specific about years of experience and specializations
5. Make it ATS-friendly
6. Verify you have not removed any hard metrics (numbers, years, percentages). Never invent metrics, numbers, technologies, or results that are not in the original. A percentage is fine only when it follows directly from numbers in the original.
7. Use <strong> tags to highlight key metrics, numbers, and hard results (e.g. <strong>30% increase</strong>)
8. Return ONLY the optimized text, no explanations`;

            const userPrompt = `Original summary: "${text}"

${context?.jobDescription ? `Target role: ${context.jobDescription.substring(0, 200)}...` : ''}

Rewrite this professional summary. Return only the improved text.`;
            return { system: systemPrompt, user: userPrompt };
        }

        case 'role': {
            const systemPrompt = `You are an expert at crafting impactful job titles for resumes.
Your task is to rewrite job titles to be more professional and industry-standard.

RULES:
1. Use standard industry terminology
2. Be specific but not overly verbose
3. Avoid jargon or internal company titles
4. Make it ATS-friendly
5. Return ONLY the optimized title, no explanations`;

            const userPrompt = `Original role: "${text}"

${context?.company ? `Company: ${context.company}` : ''}

Rewrite this role title. Return only the improved title.`;
            return { system: systemPrompt, user: userPrompt };
        }

        case 'linkedin-paragraph': {
            const systemPrompt = `You are an expert LinkedIn profile optimizer. 
Your task is to condense a user's professional experience into a SINGLE, high-impact paragraph (50-80 words).

RULES:
1. Write in the first person ("I am...", "I have...") or high-impact professional third person.
2. Focus on the core value proposition and major achievements.
3. No bullet points. Just one solid, compelling paragraph.
4. Remove all HTML tags.
5. Make it "social media" friendly yet professional.
6. Return ONLY the paragraph, no preamble or quotes.`;

            const userPrompt = `Original data to condense: "${text}"

Rewrite this into a single high-impact LinkedIn paragraph.`;
            return { system: systemPrompt, user: userPrompt };
        }

        case 'description': {
            const systemPrompt = `You are an expert resume writer specializing in project descriptions.
Your task is to rewrite project descriptions to be clear, impactful, and highlight technical skills.

RULES:
1. Keep it 1-2 sentences
2. Highlight the purpose and impact
3. Mention key technologies used
4. Be specific about outcomes. Never invent metrics, numbers, technologies, or results that are not in the original. A percentage is fine only when it follows directly from numbers in the original.
5. Make it ATS-friendly
6. Return ONLY the optimized text, no explanations`;

            const userPrompt = `Original description: "${text}"

${context?.projectName ? `Project: ${context.projectName}` : ''}
${context?.techStack ? `Tech stack: ${context.techStack.join(', ')}` : ''}

Rewrite this project description. Return only the improved text.`;
            return { system: systemPrompt, user: userPrompt };
        }

        default:
            return null;
    }
}
