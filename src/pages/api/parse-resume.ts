import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { normalizeResumeData } from '../../lib/normalizeResume';

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Resume text is required' }),
        { status: 400 }
      );
    }

    if (!import.meta.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500 }
      );
    }

    const prompt = `You are an expert resume parser. Parse the following resume text and extract structured information into a clean JSON format.

Return a JSON object with this exact structure:
{
  "personalInfo": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "title": "string (optional job title)",
    "profiles": [{"network": "string", "username": "string", "url": "string"}]
  },
  "summary": "string (professional summary/objective)",
  "experience": [
    {
      "id": "string (generate unique id: exp-1, exp-2...)",
      "company": "string",
      "role": "string",
      "duration": "string",
      "location": "string",
      "metrics": ["bullet point 1", "bullet point 2"],
      "techStack": ["tech1", "tech2"],
      "techStackLabel": "string (e.g., 'Technologies Used:', 'Stack:')"
    }
  ],
  "education": [
    {
      "id": "string (generate unique id: edu-1, edu-2...)",
      "institution": "string",
      "degree": "string",
      "duration": "string",
      "location": "string",
      "score": "string (optional GPA/percentage)",
      "details": ["detail 1", "detail 2"]
    }
  ],
  "skills": [
    {
      "id": "string (generate unique id: skill-1, skill-2...)",
      "name": "Category Name (e.g., Languages, Frameworks)",
      "items": ["skill1", "skill2", "skill3"]
    }
  ],
  "projects": [
    {
      "id": "string (generate unique id: proj-1, proj-2...)",
      "name": "string (Project Name)",
      "techStack": ["tech1", "tech2", "tech3"],
      "techStackLabel": "string (e.g., 'Technologies:', 'Backend/Frontend Stack:')",
      "link": "string (URL if any)",
      "date": "string (Period/Date)",
      "metrics": ["Full descriptive paragraph as the first bullet point", "Specific achievement or feature 2"]
    }
  ],
  "certifications": [
    {
      "id": "string (generate unique id: cert-1, cert-2...)",
      "name": "string",
      "issuer": "string",
      "date": "string (optional)"
    }
  ],
  "openSource": [
    {
      "id": "string (generate unique id: os-1, os-2...)",
      "name": "string (Project/Contribution Name)",
      "description": "string (Brief description of contribution)",
      "link": "string (URL to repo/PR)",
      "date": "string (optional)"
    }
  ]
}

Important Rules:
- Generate unique IDs for each item.
- Extract ALL information available. Do not skip any details.
- DO NOT MERGE separate work experience entries or projects even if they have the same job title or similar dates. Each distinct heading must be a separate entry.
- Ensure chronological order matches the source.
- DATE FORMATTING: Normalize all dates to 'MMM YYYY' (e.g., 'Aug 2018') or 'Aug 2018 - Present' or 'Aug 2018 - Aug 2022'. Never use numeric months or full month names.
- PROJECTS: Look for sections titled "Projects", "Relevant Projects", "Personal Projects", "Academic Projects".
- ANY project description or paragraph following the title should be added as the FIRST bullet point in the 'metrics' array. DO NOT use a separate 'description' field.
- Extract technology names, tools, version control (e.g., Git, Bitbucket), and infrastructure (e.g., AWS, Docker) into techStack arrays.
- Preserve the exact achievements, descriptions, and bullet points. Do not rewrite them into a summary unless they are very messy; keep the original tone and details.
- OPEN SOURCE: Look for sections titled "Open Source", "Contributions", "Community Work". Extract repo links and specific PRs/contributions.
- If a section is missing, return an empty array [].
- Return ONLY the JSON object, do not include markdown blocks or any other text.

Resume Text:
${text}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a professional resume parsing service. Output only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
    });

    const generatedText = completion.choices[0]?.message?.content;

    if (!generatedText) {
      throw new Error('No response from AI');
    }

    const parsedResume = JSON.parse(generatedText);

    // Add default config and visibility settings
    const completeResume = {
      ...parsedResume,
      achievements: parsedResume.achievements || [],
      openSource: parsedResume.openSource || [],
      customSections: parsedResume.customSections || [],
      config: {
        baseFontSize: 10,
        fontFamily: 'Inter',
        margins: 'standard',
        lineHeight: 1.35
      },
      sectionOrder: [
        'summary',
        'experience',
        'projects',
        'openSource',
        'skills',
        'education',
        'certifications'
      ],
      visibleSections: {
        summary: !!parsedResume.summary,
        experience: (parsedResume.experience?.length || 0) > 0,
        education: (parsedResume.education?.length || 0) > 0,
        skills: (parsedResume.skills?.length || 0) > 0,
        projects: (parsedResume.projects?.length || 0) > 0,
        openSource: (parsedResume.openSource?.length || 0) > 0,
        certifications: (parsedResume.certifications?.length || 0) > 0
      }
    };

    return new Response(JSON.stringify(normalizeResumeData(completeResume)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error parsing resume:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to parse resume',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
