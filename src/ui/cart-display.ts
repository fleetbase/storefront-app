import { usableImageUrl } from './store-display';

/**
 * What the cart screen shows, derived from the server cart: lines grouped by the store
 * that sells them, each store's subtotal and minimum-order progress, and the first
 * reason (if any) the cart can't go to checkout yet.
 */

export type CartLine = {
    id: string;
    productId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    imageUrl: string | null;
    /** "Large · Gift wrap", or null when nothing was chosen. */
    options: string | null;
    storeId: string | null;
    storeLocationId: string | null;
    scheduledAt: string | null;
};

/** What the cart knows about a store beyond the cart items (looked up separately). */
export type CartStoreInfo = {
    name?: string | null;
    logoUrl?: string | null;
    /** Minimum order in minor units, 0 when the store has none. */
    minimum?: number;
    /** False when the store isn't taking orders right now. */
    open?: boolean;
};

export type CartGroup = {
    storeId: string;
    name: string | null;
    logoUrl: string | null;
    lines: CartLine[];
    itemCount: number;
    subtotal: number;
    minimum: number;
    /** Amount still needed to reach the minimum (0 when reached or none). */
    remaining: number;
    /** 0–100, how far the subtotal is toward the minimum. */
    progress: number;
    belowMinimum: boolean;
    open: boolean;
    /** Some lines have no store location, so the store can't fulfil them. */
    missingLocation: boolean;
};

export type CheckoutBlock = { reason: 'minimum' | 'closed' | 'location'; storeId: string; storeName: string | null; remaining?: number } | null;

const UNKNOWN_STORE = 'store';

function toNumber(value: unknown): number {
    const number = typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : Number(value);
    return Number.isFinite(number) ? number : 0;
}

function optionNames(list: unknown): string[] {
    return (Array.isArray(list) ? list : []).map((option: any) => (typeof option === 'string' ? option : option?.name)).filter((name): name is string => typeof name === 'string' && name.trim() !== '');
}

/** "Large · Gift wrap" from a cart item's chosen variants and add-ons. */
export function describeLineOptions(item: any): string | null {
    const names = [...optionNames(item?.variants), ...optionNames(item?.addons)];
    return names.length > 0 ? names.join(' · ') : null;
}

export function cartLine(item: any): CartLine {
    const quantity = Math.max(0, Math.round(toNumber(item?.quantity)));
    const lineTotal = toNumber(item?.subtotal ?? toNumber(item?.price) * quantity);
    return {
        id: String(item?.id ?? ''),
        productId: item?.product_id ?? null,
        name: String(item?.name ?? ''),
        quantity,
        unitPrice: quantity > 0 ? Math.round(lineTotal / quantity) : toNumber(item?.price),
        lineTotal,
        imageUrl: usableImageUrl(item?.product_image_url),
        options: describeLineOptions(item),
        storeId: item?.store_id ?? item?.store?.id ?? null,
        storeLocationId: item?.store_location_id ?? null,
        scheduledAt: item?.scheduled_at ?? null,
    };
}

/** Lines grouped by store, in the order stores were first added to the cart. */
export function cartGroups(items: any[] | null | undefined, stores: Record<string, CartStoreInfo> = {}): CartGroup[] {
    const groups = new Map<string, { lines: CartLine[]; item: any }>();
    for (const item of Array.isArray(items) ? items : []) {
        const line = cartLine(item);
        if (!line.id || line.quantity === 0) continue;
        const key = line.storeId ?? UNKNOWN_STORE;
        const group = groups.get(key) ?? { lines: [], item };
        group.lines.push(line);
        groups.set(key, group);
    }

    return [...groups.entries()].map(([storeId, { lines, item }]) => {
        const info = stores[storeId] ?? {};
        const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
        const minimum = Math.max(0, toNumber(info.minimum));
        const remaining = Math.max(0, minimum - subtotal);
        return {
            storeId,
            name: info.name ?? item?.store?.name ?? null,
            logoUrl: usableImageUrl(info.logoUrl ?? item?.store?.logo_url),
            lines,
            itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
            subtotal,
            minimum,
            remaining,
            progress: minimum > 0 ? Math.round(Math.min(1, subtotal / minimum) * 100) : 100,
            belowMinimum: remaining > 0,
            open: info.open ?? item?.store?.online !== false,
            missingLocation: lines.some((line) => !line.storeLocationId),
        };
    });
}

/**
 * The first thing stopping checkout, in the order a customer should fix them: a closed
 * store, a store that can't fulfil a line, then a store minimum not yet reached.
 */
export function checkoutBlock(groups: CartGroup[], { requireLocation = true }: { requireLocation?: boolean } = {}): CheckoutBlock {
    const closed = groups.find((group) => !group.open);
    if (closed) return { reason: 'closed', storeId: closed.storeId, storeName: closed.name };
    const missing = requireLocation ? groups.find((group) => group.missingLocation) : undefined;
    if (missing) return { reason: 'location', storeId: missing.storeId, storeName: missing.name };
    const below = groups.find((group) => group.belowMinimum);
    if (below) return { reason: 'minimum', storeId: below.storeId, storeName: below.name, remaining: below.remaining };
    return null;
}

export function cartTotals(groups: CartGroup[]): { itemCount: number; storeCount: number; subtotal: number } {
    return {
        itemCount: groups.reduce((sum, group) => sum + group.itemCount, 0),
        storeCount: groups.filter((group) => group.storeId !== UNKNOWN_STORE).length,
        subtotal: groups.reduce((sum, group) => sum + group.subtotal, 0),
    };
}
