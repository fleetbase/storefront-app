/**
 * A small in-memory directory of store names and logos, filled as discovery screens
 * load stores. Cart items only carry a `store_id`, so this lets the cart pill and
 * cart groups name the store without an extra request.
 */
type StoreName = { name: string; logoUrl: string | null };

const names = new Map<string, StoreName>();
const listeners = new Set<() => void>();

export function rememberStores(stores: Array<{ id: string | null; name: string; logoUrl: string | null }>): void {
    let changed = false;
    for (const store of stores) {
        if (!store.id || !store.name) continue;
        const previous = names.get(store.id);
        if (previous?.name !== store.name || previous?.logoUrl !== store.logoUrl) {
            names.set(store.id, { name: store.name, logoUrl: store.logoUrl });
            changed = true;
        }
    }
    if (changed) listeners.forEach((listener) => listener());
}

export function storeName(id: string | null | undefined): StoreName | null {
    return id ? (names.get(id) ?? null) : null;
}

export function subscribeStoreNames(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** For tests. */
export function resetStoreNames(): void {
    names.clear();
}

export type CartSummary = { count: number; subtotal: number; currency: string | null; storeIds: string[] };

/** Item count, subtotal and the stores a cart's items come from, in first-added order. */
export function summarizeCart(items: Array<{ quantity?: unknown; subtotal?: unknown; store_id?: unknown; currency?: unknown }>, currency: string | null = null): CartSummary {
    const storeIds: string[] = [];
    let count = 0;
    let subtotal = 0;
    for (const item of items) {
        count += Math.max(0, Number(item?.quantity) || 0);
        subtotal += Number(item?.subtotal) || 0;
        const storeId = typeof item?.store_id === 'string' ? item.store_id : null;
        if (storeId && !storeIds.includes(storeId)) storeIds.push(storeId);
    }
    const itemCurrency = items.map((item) => item?.currency).find((value): value is string => typeof value === 'string');
    return { count, subtotal, currency: currency ?? itemCurrency ?? null, storeIds };
}
