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
