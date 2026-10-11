import { joinStoreNames } from './order-stores';
import { orderProgress, type OrderPhase } from './order-progress';

/**
 * Plain summaries of a storefront order (the Fleetbase order resource) for the order
 * history and the receipt. Checkout records what the customer saw in `meta`:
 * `storefront`, `storefront_id`, `subtotal`, `delivery_fee`, `tip`, `delivery_tip`,
 * `discount`, `promotions`, `total`, `currency`, `gateway` and `is_pickup`. Each line
 * is a payload entity whose `meta` holds `quantity`, `subtotal`, `variants` and `addons`.
 */

export type OrderLine = {
    id: string;
    name: string;
    quantity: number;
    subtotal: number;
    imageUrl: string | null;
    /** Chosen variant options and add-ons, e.g. ["Large", "Extra shot"]. */
    options: string[];
    scheduledAt: string | null;
};

export type OrderSummary = {
    id: string;
    reference: string;
    storeName: string;
    storeId: string | null;
    createdAt: string | null;
    status: string;
    phase: OrderPhase;
    active: boolean;
    canceled: boolean;
    isPickup: boolean;
    currency: string | null;
    lines: OrderLine[];
    itemCount: number;
    subtotal: number;
    deliveryFee: number;
    tip: number;
    deliveryTip: number;
    discount: number;
    promotions: { name: string; code: string | null; amount: number }[];
    total: number;
    gateway: string | null;
    address: string | null;
    notes: string | null;
};

const amount = (value: unknown): number => {
    const number = typeof value === 'string' ? Number(value.replace(/[^\d.-]/g, '')) : Number(value);
    return Number.isFinite(number) ? number : 0;
};

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * A tip as an amount. Checkout can store a tip as a percentage of the subtotal ("10%"),
 * which would otherwise read as 10 or not at all.
 */
export function tipAmount(value: unknown, subtotal: unknown): number {
    if (typeof value === 'string' && value.trim().endsWith('%')) {
        const percent = Number(value.trim().slice(0, -1));
        return Number.isFinite(percent) ? Math.round((amount(subtotal) * percent) / 100) : 0;
    }
    return amount(value);
}

function optionNames(meta: any): string[] {
    const names: string[] = [];
    for (const variant of Array.isArray(meta?.variants) ? meta.variants : []) {
        const name = text(variant?.name) ?? text(variant?.label);
        if (name) names.push(name);
    }
    for (const addon of Array.isArray(meta?.addons) ? meta.addons : []) {
        const name = text(addon?.name);
        if (name) names.push(name);
    }
    return names;
}

export function parseOrderLine(entity: any, index = 0): OrderLine {
    const meta = entity?.meta ?? {};
    const quantity = Math.max(1, Math.round(amount(meta.quantity)) || 1);
    return {
        id: String(entity?.id ?? entity?.public_id ?? index),
        name: text(entity?.name) ?? '',
        quantity,
        subtotal: meta.subtotal != null ? amount(meta.subtotal) : amount(entity?.price) * quantity,
        imageUrl: text(entity?.photo_url) ?? text(meta.image_url),
        options: optionNames(meta),
        scheduledAt: text(meta.scheduled_at),
    };
}

/** One line for an address: name and street, falling back to the full address. */
export function placeLine(place: any): string | null {
    if (!place) return null;
    const parts = [text(place.name), text(place.street1)].filter(Boolean) as string[];
    if (parts.length) return [...new Set(parts)].join(', ');
    return text(place.address);
}

export function summarizeOrder(json: any): OrderSummary {
    const meta = json?.meta ?? {};
    const payload = json?.payload ?? {};
    const isPickup = meta.is_pickup === true || meta.is_pickup === 1 || meta.is_pickup === '1';
    const status = String(json?.status ?? 'created');
    const progress = orderProgress({ status, isPickup, trackingStatuses: json?.tracking_statuses ?? [], createdAt: json?.created_at ?? null });
    const lines = (Array.isArray(payload.entities) ? payload.entities : []).map(parseOrderLine);

    return {
        id: String(json?.id ?? json?.public_id ?? ''),
        reference: text(json?.tracking_number?.tracking_number) ?? text(json?.tracking) ?? String(json?.id ?? ''),
        // A multi-store order names its stores ("Orchard Grocers & Rochor Noodle House").
        storeName: (Array.isArray(meta.store_names) && meta.store_names.length > 1 ? joinStoreNames(meta.store_names.map(String)) : null) ?? text(meta.storefront) ?? text(payload.pickup?.name) ?? '',
        storeId: text(meta.storefront_id),
        createdAt: text(json?.created_at),
        status,
        phase: progress.phase,
        active: !progress.finished && !progress.canceled,
        canceled: progress.canceled,
        isPickup,
        currency: text(meta.currency),
        lines,
        itemCount: lines.reduce((sum: number, line: OrderLine) => sum + line.quantity, 0),
        subtotal: amount(meta.subtotal),
        deliveryFee: isPickup ? 0 : amount(meta.delivery_fee),
        tip: tipAmount(meta.tip, meta.subtotal),
        deliveryTip: tipAmount(meta.delivery_tip, meta.subtotal),
        discount: amount(meta.discount),
        promotions: (Array.isArray(meta.promotions) ? meta.promotions : [])
            .map((promotion: any) => ({
                name: text(promotion?.name) ?? text(promotion?.code) ?? '',
                code: text(promotion?.code),
                amount: amount(promotion?.amount) + amount(promotion?.delivery_amount),
            }))
            .filter((promotion: { name: string }) => promotion.name),
        total: amount(meta.total),
        gateway: text(meta.gateway) ?? text(payload.payment_method),
        address: placeLine(isPickup ? payload.pickup : payload.dropoff),
        notes: text(json?.notes),
    };
}

/** "Latte, Croissant and 2 more" style preview of what was ordered. */
export function itemsPreview(lines: OrderLine[], more: (count: number) => string, shown = 2): string {
    const names = lines.map((line) => (line.quantity > 1 ? `${line.quantity}× ${line.name}` : line.name)).filter(Boolean);
    if (names.length <= shown) return names.join(', ');
    return `${names.slice(0, shown).join(', ')} ${more(names.length - shown)}`;
}

/** Orders still in progress first (newest first), then the rest newest first. */
export function groupOrders(orders: OrderSummary[]): { active: OrderSummary[]; past: OrderSummary[] } {
    const newest = (a: OrderSummary, b: OrderSummary) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0);
    const unique = [...new Map(orders.filter((order) => order.id).map((order) => [order.id, order])).values()];
    return { active: unique.filter((order) => order.active).sort(newest), past: unique.filter((order) => !order.active).sort(newest) };
}

/** Translation key for how the order was paid. */
export function paymentKey(gateway: string | null): string {
    switch ((gateway ?? '').toLowerCase()) {
        case 'stripe':
            return 'card';
        case 'qpay':
            return 'qpay';
        case 'paypal':
            return 'paypal';
        case 'cash':
        case 'cod':
            return 'cash';
        default:
            return 'other';
    }
}

/** The receipt as plain text, for sharing. */
export function receiptText(
    summary: OrderSummary,
    { t, money, date }: { t: (key: string, params?: Record<string, unknown>) => string; money: (value: number) => string; date: string | null }
): string {
    const lines = [
        summary.storeName,
        t('Receipt.orderNumber', { number: summary.reference }),
        date,
        '',
        ...summary.lines.map((line) => `${line.quantity} × ${line.name}${line.options.length ? ` (${line.options.join(', ')})` : ''}  ${money(line.subtotal)}`),
        '',
        `${t('Receipt.subtotal')}: ${money(summary.subtotal)}`,
        summary.deliveryFee ? `${t('Receipt.deliveryFee')}: ${money(summary.deliveryFee)}` : null,
        summary.tip ? `${t('Receipt.tip')}: ${money(summary.tip)}` : null,
        summary.deliveryTip ? `${t('Receipt.driverTip')}: ${money(summary.deliveryTip)}` : null,
        summary.discount ? `${t('Receipt.discount')}: −${money(summary.discount)}` : null,
        `${t('Receipt.total')}: ${money(summary.total)}`,
    ];
    return lines.filter((line) => line !== null).join('\n');
}

export const ORDER_PAGE_SIZE = 20;
