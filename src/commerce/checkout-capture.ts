/**
 * Creating the order after a successful payment ("capture"). The payment has already
 * been taken, so a failed capture must not lose the order: capture is safe to repeat
 * (the server returns the existing order for a checkout that has one), so it is retried,
 * and a checkout still uncaptured after that is kept so the customer can finish placing
 * the order without paying again.
 */

export const CAPTURE_RETRY_DELAYS_MS = [1000, 3000];

/** A paid checkout whose order hasn't been created yet, with why the last attempt failed. */
export type PendingCapture = { token: string; notes: string; customerId: string | null; paidAt: string; lastError?: string | null; lastTriedAt?: string | null };

/**
 * Whether a failed capture might succeed if repeated straight away: no response (offline, a
 * dropped connection) or a busy/timed-out server. Anything else is the server's answer, and
 * repeating it only keeps the customer waiting.
 */
export function isRetryableCaptureError(error: unknown): boolean {
    const status = (error as any)?.status;
    if (typeof status !== 'number') return true;
    return [408, 429, 502, 503, 504].includes(status);
}

/** The server's reason for a failed capture, when it is one a customer can read. */
export function captureErrorMessage(error: unknown): string | null {
    const message = typeof (error as any)?.message === 'string' ? (error as any).message.trim() : '';
    if (!message || message.length > 240 || /SQLSTATE|Exception|Stack trace|\bat \//i.test(message)) return null;
    return message;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Run `capture`, retrying after each delay; rejects with the last error if every attempt fails. */
export async function captureWithRetry<T>(
    capture: () => Promise<T>,
    {
        delays = CAPTURE_RETRY_DELAYS_MS,
        sleep = wait,
        shouldRetry = isRetryableCaptureError,
    }: { delays?: number[]; sleep?: (ms: number) => Promise<void>; shouldRetry?: (error: unknown) => boolean } = {}
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= delays.length; attempt += 1) {
        try {
            return await capture();
        } catch (error) {
            lastError = error;
            if (!shouldRetry(error)) break;
            if (attempt < delays.length) await sleep(delays[attempt]!);
        }
    }
    throw lastError;
}

/** The pending capture for this customer, if any; one left by someone else on this device is ignored. */
export function pendingCaptureFor(pending: PendingCapture | null | undefined, customerId: string | null | undefined): PendingCapture | null {
    if (!pending?.token) return null;
    return (pending.customerId ?? null) === (customerId ?? null) ? pending : null;
}

/** A cart line the store can't supply (deleted, its truck gone, or not enough stock). */
export type UnavailableItem = { id?: string; product_id?: string; name?: string; available?: number | null };

/**
 * The lines named by a `cart_items_unavailable` refusal (from the delivery quote, or from
 * checkout when stock ran out while reserving it), or null for any other error. The body is
 * `{ code, items: [{ id, product_id, name, available? }] }`; the SDK keeps it as `response`.
 */
export function unavailableItemsFromError(error: unknown): UnavailableItem[] | null {
    const failure = error as any;
    if (failure?.code !== 'cart_items_unavailable' && failure?.response?.code !== 'cart_items_unavailable') return null;
    const items = failure?.response?.items ?? failure?.items;
    if (!Array.isArray(items)) return [];
    return items
        .filter((item: any) => item && typeof item === 'object')
        .map((item: any) => {
            const available = Number(item.available);
            return {
                id: typeof item.id === 'string' ? item.id : undefined,
                product_id: typeof item.product_id === 'string' ? item.product_id : undefined,
                name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : undefined,
                available: item.available !== undefined && item.available !== null && Number.isFinite(available) ? Math.max(0, Math.floor(available)) : null,
            };
        });
}

/** "Iced Latte (2 left), Croissant" — the unavailable lines by name, with any stock left. */
export function unavailableItemsText(items: UnavailableItem[] | null | undefined, left: (count: number) => string): string {
    return (items ?? [])
        .filter((item) => item.name)
        .map((item) => (item.available ? `${item.name} (${left(item.available)})` : (item.name as string)))
        .join(', ');
}
