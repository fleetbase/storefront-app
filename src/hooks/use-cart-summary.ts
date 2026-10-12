import { useEffect, useMemo, useState } from 'react';
import useCart from './use-cart';
import { formatCurrency } from '../utils/format';
import { storeName, subscribeStoreNames, summarizeCart } from '../network/store-names';

/**
 * What the cart pill shows: item count, formatted subtotal and the name of the store
 * the cart belongs to (or the first store, for multi-store carts).
 */
export default function useCartSummary() {
    const [cart] = useCart();
    const [, setVersion] = useState(0);

    useEffect(() => subscribeStoreNames(() => setVersion((version) => version + 1)), []);

    const items = useMemo(() => (cart?.contents?.() ?? []).map((item: any) => item?.serialize?.() ?? item), [cart]);
    const summary = summarizeCart(items, cart?.getAttribute?.('currency') ?? null);
    const firstStore = storeName(summary.storeIds[0]);

    return {
        ...summary,
        total: formatCurrency(summary.subtotal, summary.currency ?? 'USD'),
        storeName: summary.storeIds.length > 1 ? null : (firstStore?.name ?? null),
        storeCount: summary.storeIds.length,
    };
}
