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

export async function apiRequest(
    target: ApiTarget,
    path: string,
    {
        method = 'GET',
        query = {},
        body,
        headers = {},
    }: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; query?: Record<string, any>; body?: Record<string, any>; headers?: Record<string, string> } = {}
): Promise<any> {
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

/**
 * Host, namespace and headers (the storefront key among them) of an SDK adapter. The
 * browser adapter keeps its headers on `headers`; the adapter used on iOS and Android
 * (axios) keeps them on its instance's defaults, so reading only `headers` would send
 * requests without the storefront key there.
 */
export function adapterTarget(adapter: any): ApiTarget {
    const headers: Record<string, string> = {};
    const collect = (source: any) => {
        if (!source || typeof source !== 'object') return;
        for (const [key, value] of Object.entries(source)) {
            if (typeof value === 'string') headers[key] = value;
        }
    };
    const defaults = adapter?.axiosInstance?.defaults?.headers;
    collect(defaults?.common);
    collect(defaults);
    collect(adapter?.headers);
    return { host: adapter?.host, namespace: adapter?.namespace, headers };
}

/**
 * The adapter with these headers merged in. Fleetbase adapters have `setHeaders`, but the
 * SDKs type adapters by their request methods only, so this keeps call sites typed.
 */
export function withHeaders<T>(adapter: T, headers: Record<string, string>): T {
    const target = adapter as unknown as { setHeaders?: (headers: Record<string, string>) => T };
    return typeof target?.setHeaders === 'function' ? target.setHeaders(headers) : adapter;
}
