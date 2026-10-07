/**
 * Storefront API requests that keep the error body. The SDK adapter rejects with only
 * `errors[0]` or the status text, but some endpoints explain refusals as
 * `{ error, reason }` with a meaningful status (409, 423, …) the app needs to show.
 */

export type ApiTarget = { host?: string; namespace?: string; headers?: Record<string, string> };

export class ApiError extends Error {
    status: number;
    reason: string | null;

    constructor(message: string, status: number, reason: string | null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.reason = reason;
    }
}

function queryString(query: Record<string, any>): string {
    const params = Object.entries(query)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    return params.length ? `?${params.join('&')}` : '';
}

export async function apiRequest(target: ApiTarget, path: string, { method = 'GET', query = {}, body, headers = {} }: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; query?: Record<string, any>; body?: Record<string, any>; headers?: Record<string, string> } = {}): Promise<any> {
    if (!target.host || !target.namespace) throw new ApiError('Storefront is not ready', 0, null);
    let response: Response;
    try {
        response = await fetch(`${target.host}/${target.namespace}/${path}${queryString(query)}`, {
            method,
            headers: { ...(target.headers ?? {}), ...headers, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
    } catch (error: any) {
        throw new ApiError(error?.message ?? 'Network request failed', 0, 'network');
    }
    const json = await response.json().catch(() => null);
    if (response.ok) return json;
    const message = json?.error ?? json?.errors?.[0] ?? response.statusText ?? 'Request failed';
    throw new ApiError(String(message), response.status, typeof json?.reason === 'string' ? json.reason : null);
}
