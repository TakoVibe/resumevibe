import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { z } from 'zod';

// Zod schema matching ResumeSchema
const BulletItemSchema = z.union([
    z.string(),
    z.object({
        text: z.string(),
        hasBullet: z.boolean().optional()
    })
]);

const PersonalInfoSchema = z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    profiles: z.array(z.object({
        network: z.string(),
        username: z.string(),
        url: z.string()
    })),
    title: z.string().optional()
});

const ResumeSchemaZod = z.object({
    personalInfo: PersonalInfoSchema,
    summary: z.string(),
    skills: z.array(z.object({
        id: z.string(),
        name: z.string().default(''),
        items: z.array(z.string()).default([])
    })).default([]),
    experience: z.array(z.object({
        id: z.string(),
        company: z.string().default(''),
        role: z.string().default(''),
        duration: z.string().default(''),
        location: z.string().optional(),
        metrics: z.array(BulletItemSchema).default([]),
        techStack: z.array(z.string()).optional(),
        techStackLabel: z.string().optional()
    })).default([]),
    projects: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().default(''),
        techStack: z.array(z.string()).optional(),
        techStackLabel: z.string().optional(),
        link: z.string().optional(),
        date: z.string().optional(),
        metrics: z.array(BulletItemSchema).default([])
    })).default([]),
    openSource: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        link: z.string().optional(),
        metrics: z.array(BulletItemSchema).optional()
    })).optional(),
    education: z.array(z.object({
        id: z.string(),
        institution: z.string(),
        degree: z.string(),
        duration: z.string(),
        location: z.string(),
        score: z.string().optional(),
        details: z.array(BulletItemSchema).optional()
    })),
    achievements: z.array(BulletItemSchema),
    certifications: z.array(z.object({
        id: z.string(),
        name: z.string(),
        issuer: z.string(),
        date: z.string().optional()
    })),
    customSections: z.array(z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum(['custom', 'summary', 'experience', 'projects', 'education', 'skills', 'certifications']).optional(),
        items: z.array(z.any())
    })).optional(),
    config: z.object({
        baseFontSize: z.number().optional(),
        accentColor: z.string().optional(),
        fontFamily: z.string().optional(),
        margins: z.enum(['compact', 'standard', 'relaxed', 'narrow']).optional(),
        lineHeight: z.number().optional()
    }).optional(),
    sectionOrder: z.array(z.string()),
    visibleSections: z.record(z.boolean()),
    sectionTitles: z.record(z.string()).optional(),
    sectionSeparators: z.record(z.boolean()).optional()
});

const SYSTEM_PROMPT = `You are a Senior Technical Recruiter and ATS (Applicant Tracking System) Optimization Expert.

Your task is to rewrite the user's resume to align perfectly with the target job description.

**CRITICAL RULES:**
1. **Preserve ALL IDs**: Never change any 'id' fields - they must remain exactly as provided
2. **Preserve Personal Info**: Keep all personal information (name, email, phone, location, profiles) exactly as provided
3. **Preserve Structure**: Maintain the same number of items in each section unless explicitly removing weak entries
4. **Formatting**: Use standard headings. No tables, columns, or complex graphics
5. **Keyword Integration**: Identify top 10 high-priority keywords from JD and naturally integrate them
6. **Action-Oriented**: Start every bullet point with strong action verbs (e.g., "Architected," "Optimized," "Spearheaded")
7. **Quantifiable Impact**: Use the Google "XYZ Formula" only when the source resume already contains the metric. Never invent numbers, tools, responsibilities, employers, seniority, or outcomes.
8. **Skill Re-categorization**: Group skills into relevant categories matching JD requirements
9. **Tech Stack Alignment**: Highlight technologies mentioned in the JD
10. **Professional Summary**: Rewrite to mirror the JD's key requirements and desired qualifications
11. **Date Formatting**: Use a strict 'MMM YYYY - MMM YYYY' format for all dates (e.g., 'Aug 2018 - Aug 2022' or 'Dec 2020 - Present'). Never use numeric months or full month names.
12. **Custom Sections**: Maintain the structure of custom sections. The 'items' array content varies by section type (e.g., 'summary' expects an array of one string, 'experience' expects an array of objects).
13. **Formatting (Strategic Bolding)**: Use <strong> tags to emphasize high-impact, "weighty" terms that prove your value. This includes:
    - Major quantifiable results (e.g., <strong>99.9% uptime</strong>, <strong>$2M savings</strong>, <strong>10x scale</strong>).
    - High-impact technologies or niche skills (e.g., <strong>Kubernetes</strong>, <strong>Rust</strong>, <strong>Distributed Systems</strong>).
    - Leadership or strategic actions (e.g., <strong>Architected</strong>, <strong>Spearheaded</strong>).
    - **Balance**: Limit bolding to 2-3 truly important instances per section or bullet point. Do not bold entire sentences.
    - Ensure tags are properly closed.
14. **Factual Integrity**: Reframe and prioritize existing evidence only. If the job requires something the candidate has not demonstrated, do not add it to the resume. Report it as an issue and flag any adjacent rewrite as a risk.
15. **Reviewability**: Every changed section must have a concise review record explaining what changed, why it helps, the exact job requirement it addresses, and whether the change could overstate the candidate's evidence.

**OUTPUT REQUIREMENTS:**
- You MUST respond with ONLY a valid JSON object, no additional text or explanation
- Return a JSON object with this exact structure:
{
    "optimizedSummary": "Your rewritten professional summary",
    "optimizedSkills": [ ... ], // Array of updated skill objects (keep original IDs)
    "optimizedExperience": [ ... ], // Array of updated experience objects (keep original IDs)
    "issues": [ "List of critical alignment issues if the Job Description is drastically different from the user's actual skills/experience. Leave empty if reasonable match." ],
    "odds": {
        "selectionChance": 85,
        "rejectionReasoning": "Brief explanation of what factors might cause rejection despite optimization."
    },
    "changeReviews": [
        {
            "section": "summary|skills|experience",
            "whatChanged": "Plain-language summary of the proposed edit",
            "why": "Why this improves relevance or clarity",
            "jobRequirement": "The requirement or phrase from the job description this addresses",
            "riskLevel": "none|low|high",
            "risk": "No unsupported claim detected, or a precise warning about possible overstatement"
        }
    ]
}
- Do NOT include any other parts of the resume.`;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { resume, jobDescription, auditResult } = await request.json();

        if (!resume || !jobDescription) {
            return new Response(
                JSON.stringify({ error: 'Missing resume or job description' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Initialize OpenAI
        const apiKey = import.meta.env.OPENAI_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'OpenAI API key not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const openai = new OpenAI({ apiKey });

        // Build context from Audit Result if available
        let auditContext = '';
        if (auditResult && auditResult.insights) {
            const gaps = auditResult.insights.filter((i: any) => i.type === 'gap').map((i: any) => `- ${i.text}`).join('\n');
            if (gaps) {
                auditContext = `\n\n**CRITICAL GAPS TO FIX (From Deep Audit):**\nThe following issues were identified in a deep diagnostic. YOU MUST ADDRESS THESE IN THE OPTIMIZATION:\n${gaps}`;
            }
        }

        // Only send the parts of the resume we want the AI to optimize
        const targetedResumeElements = {
            summary: resume.summary,
            skills: resume.skills,
            experience: resume.experience
        };

        // Create the user prompt
        const userPrompt = `** Job Description:**
    ${jobDescription}

** Current Resume (Only Relevant Sections):**
    ${JSON.stringify(targetedResumeElements, null, 2)}${auditContext}

Please optimize these sections for the job description above. Return the data adhering to the required JSON structure including any 'issues' if they exist.
If critical gaps are listed above, only surface a skill or competency when it is already evidenced in the source resume. Otherwise, report the gap as an issue instead of fabricating experience.`;

        // Call OpenAI with structured output
        const completion = await openai.chat.completions.create({
            model: 'gpt-5-mini', // Assuming this is set up correctly in the environment
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
        });

        const responseText = completion.choices[0].message.content;
        if (!responseText) {
            return new Response(
                JSON.stringify({ error: 'No response from AI' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Parse and validate the JSON response
        let optimizedResume;
        let issues: string[] = [];
        let odds: any = null;
        let changeReviews: any[] = [];

        try {
            const parsed = JSON.parse(responseText);
            issues = Array.isArray(parsed.issues) ? parsed.issues : [];
            odds = parsed.odds || null;
            changeReviews = Array.isArray(parsed.changeReviews)
                ? parsed.changeReviews
                    .filter((review: any) => review && ['summary', 'skills', 'experience'].includes(review.section))
                    .map((review: any) => ({
                        section: review.section,
                        whatChanged: String(review.whatChanged || 'Content was rewritten for the target role.'),
                        why: String(review.why || 'Improves alignment with the job description.'),
                        jobRequirement: String(review.jobRequirement || 'Relevant role requirements'),
                        riskLevel: ['none', 'low', 'high'].includes(review.riskLevel) ? review.riskLevel : 'low',
                        risk: String(review.risk || 'Review this change against your experience before applying.')
                    }))
                : [];

            // Normalize summary if it's an array or object (AI quirk)
            let newSummary = parsed.optimizedSummary || resume.summary;
            if (Array.isArray(newSummary)) {
                newSummary = newSummary.join('\n\n');
            } else if (typeof newSummary === 'object' && newSummary !== null) {
                newSummary = newSummary.text || newSummary.summary || Object.values(newSummary).join(' ');
            }
            if (typeof newSummary !== 'string') {
                newSummary = String(newSummary || '');
            }

            // Fallback for arrays if AI failed to return them
            const newSkills = Array.isArray(parsed.optimizedSkills) ? parsed.optimizedSkills.map((s: any) => ({ ...s, id: s.id || `skill-${Math.random().toString(36).substr(2, 9)}` })) : resume.skills;
            const newExperience = Array.isArray(parsed.optimizedExperience) ? parsed.optimizedExperience.map((e: any) => ({ ...e, id: e.id || `exp-${Math.random().toString(36).substr(2, 9)}` })) : resume.experience;

            // Reconstruct the full resume
            const fullResume = {
                ...resume,
                summary: newSummary,
                skills: newSkills,
                experience: newExperience
            };

            // Validate the reconstructed resume gracefully
            const parseResult = ResumeSchemaZod.safeParse(fullResume);
            if (parseResult.success) {
                optimizedResume = parseResult.data;
            } else {
                console.warn('Zod validation failed, using unvalidated payload fallback. Errors:', parseResult.error.issues);
                optimizedResume = fullResume; // Pass through anyway to avoid crashing the user's flow
                issues.push("There were minor validation warnings on the AI's format, but we attempted to recover the data.");
            }

        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            console.error('Raw response text:', responseText);
            return new Response(
                JSON.stringify({
                    error: 'Invalid response format from AI',
                    details: parseError instanceof Error ? parseError.message : 'Unknown error'
                }),
                { status: 422, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Return the optimized resume
        return new Response(
            JSON.stringify({
                success: true,
                optimizedResume,
                issues,
                odds,
                changeReviews,
                usage: completion.usage
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Error optimizing resume:', error);
        return new Response(
            JSON.stringify({
                error: 'Failed to optimize resume',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
