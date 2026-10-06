/**
 * Cart promotions: the discounts the server applies to a cart (automatic promotions and
 * promo codes), applying and removing codes, and "spend X more" hints for automatic
 * promotions the cart hasn't reached yet.
 *
 * Endpoints (storefront/v1):
 * - GET    carts/{id}/promotions?pickup&service_quote
 * - POST   carts/{id}/promo-code            { code }
 * - DELETE carts/{id}/promo-code/{code}
 * - GET    promotions                        (public promotions, for hints)
 */

type Adapter = {
    get: (path: string, query?: Record<string, any>) => Promise<any>;
    post: (path: string, data?: Record<string, any>) => Promise<any>;
    delete: (path: string, data?: Record<string, any>) => Promise<any>;
    host?: string;
    namespace?: string;
    headers?: Record<string, string>;
};

export type AppliedPromotion = { promotionId: string | null; name: string | null; type: string | null; code: string | null; amount: number; deliveryAmount: number };

export type CartPromotions = {
    /** Total discount in minor units (items plus delivery). */
    discount: number;
    discountSubtotal: number;
    discountDelivery: number;
    applied: AppliedPromotion[];
    rejected: { code: string; reason: string }[];
};

export const NO_PROMOTIONS: CartPromotions = { discount: 0, discountSubtotal: 0, discountDelivery: 0, applied: [], rejected: [] };

/** Rejection reasons the server can return for a promo code. */
export const PROMO_REASONS = [
    'invalid_code',
    'not_active',
    'not_applicable',
    'currency_mismatch',
    'first_order_only',
    'usage_limit_reached',
    'customer_usage_limit_reached',
    'budget_exhausted',
    'not_combinable',
    'no_eligible_items',
    'min_subtotal',
    'min_items',
    'pickup_order',
    'no_discount',
] as const;
export type PromoReason = (typeof PROMO_REASONS)[number] | 'unknown';

export class PromoCodeError extends Error {
    reason: PromoReason;

    constructor(message: string, reason: PromoReason) {
        super(message);
        this.name = 'PromoCodeError';
        this.reason = reason;
    }
}

function toInt(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : 0;
}

export function parseCartPromotions(json: any): CartPromotions {
    if (!json || typeof json !== 'object') return NO_PROMOTIONS;
    return {
        discount: toInt(json.discount),
        discountSubtotal: toInt(json.discount_subtotal),
        discountDelivery: toInt(json.discount_delivery),
        applied: (Array.isArray(json.applied) ? json.applied : []).map((item: any) => ({
            promotionId: item?.promotion ?? null,
            name: item?.name ?? null,
            type: item?.type ?? null,
            code: item?.code ?? null,
            amount: toInt(item?.amount),
            deliveryAmount: toInt(item?.delivery_amount),
        })),
        rejected: (Array.isArray(json.rejected) ? json.rejected : []).filter((item: any) => item?.code && item?.reason).map((item: any) => ({ code: String(item.code), reason: String(item.reason) })),
    };
}

/** Codes are stored upper-case without spaces on the server; match that before sending. */
export function normalizePromoCode(code: string): string {
    return String(code ?? '')
        .replace(/\s+/g, '')
        .toUpperCase();
}

/** The SDK adapter only keeps the error message: `… cannot be applied (invalid_code).` */
export function promoReasonFromMessage(message: unknown): PromoReason {
    const match = typeof message === 'string' ? message.match(/\(([a-z_]+)\)\.?\s*$/) : null;
    const reason = match?.[1];
    return reason && (PROMO_REASONS as readonly string[]).includes(reason) ? (reason as PromoReason) : 'unknown';
}

export async function fetchCartPromotions(adapter: Adapter, cartId: string, { pickup = false, serviceQuoteId = null }: { pickup?: boolean; serviceQuoteId?: string | null } = {}): Promise<CartPromotions> {
    const query: Record<string, any> = {};
    if (pickup) query.pickup = 1;
    if (serviceQuoteId && !pickup) query.service_quote = serviceQuoteId;
    return parseCartPromotions(await adapter.get(`carts/${cartId}/promotions`, query));
}

function isPromoReason(value: unknown): value is PromoReason {
    return typeof value === 'string' && (PROMO_REASONS as readonly string[]).includes(value);
}

/**
 * POSTs through the adapter's host and headers but keeps the error body: refusals come
 * back as `{ error, reason }`, and the SDK adapter only keeps `errors[0]` or the status.
 */
async function postKeepingErrors(adapter: Adapter, path: string, data: Record<string, any>): Promise<any> {
    if (typeof fetch !== 'function' || !adapter.host || !adapter.namespace) return adapter.post(path, data);
    const response = await fetch(`${adapter.host}/${adapter.namespace}/${path}`, {
        method: 'POST',
        headers: { ...(adapter.headers ?? {}), 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const json = await response.json().catch(() => null);
    if (response.ok) return json;
    const message = json?.error ?? json?.errors?.[0] ?? response.statusText ?? 'Request failed';
    throw new PromoCodeError(message, isPromoReason(json?.reason) ? json.reason : promoReasonFromMessage(message));
}

/** Applies a code. Resolves with the updated cart JSON and promotions, or throws a PromoCodeError. */
export async function applyPromoCode(adapter: Adapter, cartId: string, code: string): Promise<{ cart: any; promotions: CartPromotions }> {
    const normalized = normalizePromoCode(code);
    if (!normalized) throw new PromoCodeError('A promotion code is required.', 'invalid_code');
    try {
        const json = await postKeepingErrors(adapter, `carts/${cartId}/promo-code`, { code: normalized });
        return { cart: json?.cart ?? null, promotions: parseCartPromotions(json?.promotions) };
    } catch (error: any) {
        if (error instanceof PromoCodeError) throw error;
        throw new PromoCodeError(error?.message ?? 'Promotion code cannot be applied.', promoReasonFromMessage(error?.message));
    }
}

export async function removePromoCode(adapter: Adapter, cartId: string, code: string): Promise<{ cart: any; promotions: CartPromotions }> {
    const json = await adapter.delete(`carts/${cartId}/promo-code/${encodeURIComponent(normalizePromoCode(code))}`);
    return { cart: json?.cart ?? null, promotions: parseCartPromotions(json?.promotions) };
}

export type PromotionHint = { id: string; name: string; minSubtotal: number; remaining: number; ownerId: string | null };

/**
 * Automatic promotions (no code) that are live and that the cart would unlock by
 * spending more, nearest first. A promotion owned by a store only counts that store's
 * subtotal; one owned by the network or with no owner counts the whole cart.
 */
export function promotionHints(promotions: any[] | null | undefined, { subtotal, storeSubtotals = {}, appliedIds = [], currency = null }: { subtotal: number; storeSubtotals?: Record<string, number>; appliedIds?: (string | null)[]; currency?: string | null }): PromotionHint[] {
    const applied = new Set(appliedIds.filter(Boolean));
    return (Array.isArray(promotions) ? promotions : [])
        .filter((promotion: any) => promotion?.id && !applied.has(promotion.id))
        .filter((promotion: any) => !promotion.code && (promotion.trigger ?? 'automatic') === 'automatic')
        .filter((promotion: any) => (promotion.availability ?? 'live') === 'live')
        .filter((promotion: any) => !currency || !promotion.currency || promotion.currency === currency)
        .map((promotion: any): PromotionHint | null => {
            const minSubtotal = toInt(promotion.min_subtotal);
            if (minSubtotal <= 0) return null;
            const ownerId = promotion.owner?.type === 'store' ? (promotion.owner?.id ?? null) : null;
            const spent = ownerId ? (storeSubtotals[ownerId] ?? 0) : subtotal;
            // Only hint at stores already in the cart.
            if (ownerId && !(ownerId in storeSubtotals)) return null;
            const remaining = minSubtotal - spent;
            return remaining > 0 ? { id: String(promotion.id), name: String(promotion.name ?? ''), minSubtotal, remaining, ownerId } : null;
        })
        .filter((hint): hint is PromotionHint => hint !== null)
        .sort((a, b) => a.remaining - b.remaining);
}
