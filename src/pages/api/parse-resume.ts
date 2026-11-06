import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import { normalizeResumeData } from '../../lib/normalizeResume';
import { AI_MODEL, AI_REASONING_EFFORT } from '../../lib/aiModel';
import {
    MAX_IMPORT_PDF_BYTES,
    MAX_IMPORT_TEXT_CHARS,
    RESUME_IMPORT_TOKEN_COST,
    buildImportedResume,
    buildResumeImportPrompt,
    importActionType,
    type ImportPurpose,
    type ImportSource,
} from '../../lib/resumeImport';

const BACKEND_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
const BACKEND_TIMEOUT_MS = 10_000;
const PARSE_TIMEOUT_MS = 120_000;
const MULTIPART_OVERHEAD_BYTES = 64_000;

const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY, timeout: PARSE_TIMEOUT_MS });

function failure(status: number, error: string, failureCode: string, extra: Record<string, unknown> = {}) {
    return new Response(JSON.stringify({ error, failure_code: failureCode, tokens_charged: false, ...extra }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

async function readDocument(request: Request): Promise<{ source: ImportSource; text: string } | Response> {
    if ((request.headers.get('content-type') || '').includes('multipart/form-data')) {
        const file = (await request.formData()).get('pdf');
        if (!file || typeof file === 'string') return failure(400, 'Choose a PDF to import.', 'missing_file');
        if (file.size > MAX_IMPORT_PDF_BYTES) return failure(413, 'Choose a PDF smaller than 5 MB.', 'file_too_large');
        const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
        const { text } = await parser.getText();
        return { source: 'pdf', text: text || '' };
    }
    const body = await request.json().catch(() => ({}));
    return { source: 'text', text: typeof body?.text === 'string' ? body.text : '' };
}

// Serves both /api/parse-resume (pasted text) and /api/parse-resume-pdf (multipart upload).
// Signed-in only; tokens are checked before and charged after a successful parse, on the server.
export const POST: APIRoute = async ({ request, url }) => {
    const token = request.headers.get('authorization')?.replace(/^(Token|Bearer)\s+/i, '').trim();
    if (!token) return failure(401, 'Sign in to import a resume.', 'authentication_required');
    if (Number(request.headers.get('content-length') || 0) > MAX_IMPORT_PDF_BYTES + MULTIPART_OVERHEAD_BYTES) {
        return failure(413, 'This file is too large to import.', 'request_too_large');
    }
    if (!import.meta.env.OPENAI_API_KEY) return failure(503, 'Import is temporarily unavailable.', 'generation_not_configured');

    const purpose: ImportPurpose = url.searchParams.get('purpose') === 'job_fit' ? 'job_fit' : 'import';

    try {
        const statusResponse = await fetch(`${BACKEND_URL}/api/users/tokens/`, {
            headers: { Authorization: `Token ${token}` },
            signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        });
        if (!statusResponse.ok) return failure(401, 'Your session could not be verified. Please sign in again.', 'session_invalid');
        const tokenStatus = await statusResponse.json();
        const tokenBalance = Number(tokenStatus.token_balance || 0);
        const isFreeJobFit = purpose === 'job_fit' && tokenStatus.free_job_fit_available !== false;
        if (!isFreeJobFit && tokenBalance < RESUME_IMPORT_TOKEN_COST) {
            return failure(402, `Importing requires ${RESUME_IMPORT_TOKEN_COST} tokens.`, 'insufficient_tokens', {
                requires_tokens: true,
                tokens_required: RESUME_IMPORT_TOKEN_COST,
                token_balance: tokenBalance,
            });
        }

        const document = await readDocument(request);
        if (document instanceof Response) return document;
        const text = document.text.trim();
        if (!text) {
            return failure(400, document.source === 'pdf'
                ? 'We could not find any text in this PDF. Scanned, image-only PDFs are not supported.'
                : 'Paste your resume text to import it.', 'empty_document');
        }
        if (text.length > MAX_IMPORT_TEXT_CHARS) {
            return failure(413, 'This document is too long to import. Remove anything that is not part of your resume or CV.', 'document_too_long');
        }

        const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            reasoning_effort: AI_REASONING_EFFORT,
            messages: [
                { role: 'system', content: 'You are a professional resume and CV parsing service. Output only valid JSON.' },
                { role: 'user', content: buildResumeImportPrompt(text) },
            ],
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) return failure(502, 'We could not read this document. Please try again.', 'parse_failed');
        const resume = normalizeResumeData(buildImportedResume(JSON.parse(content)));

        const actionType = importActionType(purpose, document.source);
        const chargeResponse = await fetch(`${BACKEND_URL}/api/users/tokens/use/`, {
            method: 'POST',
            headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action_type: actionType,
                tokens: RESUME_IMPORT_TOKEN_COST,
                product: 'resumevibe',
                request_id: `${actionType}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                description: purpose === 'job_fit' ? 'Job fit resume import' : 'Resume import',
                operation_succeeded: true,
            }),
            signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        });
        if (!chargeResponse.ok) {
            const insufficient = chargeResponse.status === 402;
            return failure(
                insufficient ? 402 : 503,
                insufficient
                    ? `Your balance changed. Importing requires ${RESUME_IMPORT_TOKEN_COST} tokens.`
                    : 'Your document was read, but the token charge could not be completed. Please try again.',
                insufficient ? 'insufficient_tokens' : 'token_charge_failed',
            );
        }

        return new Response(JSON.stringify(resume), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Resume import failed:', error);
        return failure(500, 'We could not import this document. Please try again.', 'import_failed');
    }
};
