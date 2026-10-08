/**
 * Whether the server still accepts the customer session saved on the device.
 *
 * The app restores "signed in" from storage, so a token the server no longer knows (signed
 * out elsewhere, a re-seeded or different instance) would otherwise fail every customer
 * request. One token-authenticated request decides; only a clear refusal counts, so being
 * offline or a server error never signs anyone out.
 */

export type SessionCheck = 'valid' | 'rejected' | 'unknown';

export type CustomerRequest = (path: string, options?: { query?: Record<string, any> }) => Promise<any>;

/** The storefront refuses an unknown Customer-Token with 401, or 400/403 "Not authorized …". */
export function isSessionRejected(error: unknown): boolean {
    const status = Number((error as any)?.status ?? 0);
    const message = String((error as any)?.message ?? '');
    if (status === 401) return true;
    return (status === 400 || status === 403) && /not authori[sz]ed/i.test(message);
}

export async function checkCustomerSession(request: CustomerRequest): Promise<SessionCheck> {
    try {
        await request('customers/places', { query: { limit: 1 } });
        return 'valid';
    } catch (error) {
        return isSessionRejected(error) ? 'rejected' : 'unknown';
    }
}
