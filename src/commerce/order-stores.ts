/**
 * A multi-store (network) order is one delivery that brings together the orders each store
 * prepares. Its breakdown by store: each store, how far along it is, its items and subtotal.
 */

export type OrderStoreItem = { id: string; name: string; quantity: number; subtotal: number; variants: any[]; addons: any[]; imageUrl: string | null };

export type OrderStoreSection = {
    order: string;
    status: string | null;
    label: string | null;
    store: { id: string | null; name: string | null; logoUrl: string | null; phone: string | null; address: string | null };
    items: OrderStoreItem[];
    subtotal: number;
    discount: number;
    tip: number;
    currency: string | null;
};

type Request = (path: string) => Promise<any>;

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);
const amount = (value: unknown): number => (Number.isFinite(Number(value)) ? Number(value) : 0);

export function parseOrderStores(payload: any): OrderStoreSection[] {
    const stores = Array.isArray(payload?.stores) ? payload.stores : [];
    return stores
        .filter((section: any) => section && typeof section === 'object')
        .map((section: any) => ({
            order: String(section.order ?? ''),
            status: text(section.status),
            label: text(section.label),
            store: {
                id: text(section.store?.id),
                name: text(section.store?.name),
                logoUrl: text(section.store?.logo_url),
                phone: text(section.store?.phone),
                address: text(section.store?.address),
            },
            items: (Array.isArray(section.items) ? section.items : []).map((item: any, index: number) => ({
                id: String(item?.id ?? index),
                name: String(item?.name ?? ''),
                quantity: Math.max(1, amount(item?.quantity) || 1),
                subtotal: amount(item?.subtotal),
                variants: Array.isArray(item?.variants) ? item.variants : [],
                addons: Array.isArray(item?.addons) ? item.addons : [],
                imageUrl: text(item?.image_url),
            })),
            subtotal: amount(section.subtotal),
            discount: amount(section.discount),
            tip: amount(section.tip),
            currency: text(section.currency),
        }));
}

export async function fetchOrderStores(request: Request, orderId: string): Promise<OrderStoreSection[]> {
    return parseOrderStores(await request(`orders/${encodeURIComponent(orderId)}/stores`));
}

/** "Orchard Grocers & Rochor Noodle House", or "A, B & C". */
export function joinStoreNames(names: string[], and = '&'): string {
    const clean = names.filter(Boolean);
    if (clean.length <= 1) return clean[0] ?? '';
    return `${clean.slice(0, -1).join(', ')} ${and} ${clean[clean.length - 1]}`;
}
