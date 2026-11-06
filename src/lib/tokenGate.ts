// Server-only: guards paid AI routes so they cannot be called without a signed-in session,
// and charges tokens on the server after the AI call succeeds.
const BACKEND_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
const BACKEND_TIMEOUT_MS = 10_000;

export function jsonFailure(status: number, error: string, failureCode: string, extra: Record<string, unknown> = {}) {
    return new Response(JSON.stringify({ error, failure_code: failureCode, tokens_charged: false, ...extra }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/** Verifies the session and that the balance covers `cost`. Returns the session token, or a response to send back. */
export async function requireTokens(request: Request, cost: number, featureName: string): Promise<{ token: string } | Response> {
    const token = request.headers.get('authorization')?.replace(/^(Token|Bearer)\s+/i, '').trim();
    if (!token) return jsonFailure(401, `Sign in to use ${featureName}.`, 'authentication_required');

    const statusResponse = await fetch(`${BACKEND_URL}/api/users/tokens/`, {
        headers: { Authorization: `Token ${token}` },
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
    if (!statusResponse.ok) return jsonFailure(401, 'Your session could not be verified. Please sign in again.', 'session_invalid');

    const balance = Number((await statusResponse.json()).token_balance || 0);
    if (balance < cost) {
        return jsonFailure(402, `${featureName} requires ${cost} tokens.`, 'insufficient_tokens', {
            requires_tokens: true,
            tokens_required: cost,
            token_balance: balance,
        });
    }
    return { token };
}

/** Charges tokens after a successful AI call. Returns a response to send back when the charge fails, otherwise null. */
export async function chargeTokens(token: string, charge: { actionType: string; cost: number; description: string }) {
    const response = await fetch(`${BACKEND_URL}/api/users/tokens/use/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action_type: charge.actionType,
            tokens: charge.cost,
            product: 'resumevibe',
            request_id: `${charge.actionType}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            description: charge.description,
            operation_succeeded: true,
        }),
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
    if (response.ok) return null;
    return response.status === 402
        ? jsonFailure(402, `Your balance changed. This requires ${charge.cost} tokens.`, 'insufficient_tokens', { requires_tokens: true, tokens_required: charge.cost })
        : jsonFailure(503, 'The result was ready, but the token charge could not be completed. Please try again.', 'token_charge_failed');
}
