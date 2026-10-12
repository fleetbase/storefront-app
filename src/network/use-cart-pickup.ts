import { useEffect, useMemo, useState } from 'react';
import useStorefront from '../hooks/use-storefront';

/** Each store's own pickup setting, kept for the session. */
const pickupByStore = new Map<string, boolean>();

/**
 * Whether a network cart can be collected: pickup is the one setting each store decides,
 * and a cart is collected from one place, so it must come from a single store that allows
 * pickup. Null while that store's setting is being looked up.
 */
export default function useCartPickup(storeIds: string[]): boolean | null {
    const { adapter } = useStorefront();
    const ids = useMemo(() => [...new Set(storeIds.filter(Boolean))], [storeIds.join('|')]);
    const known = (id: string) => (pickupByStore.has(id) ? (pickupByStore.get(id) as boolean) : null);
    const [, setVersion] = useState(0);

    useEffect(() => {
        if (ids.length !== 1 || pickupByStore.has(ids[0]) || !adapter) return;
        let active = true;
        adapter
            .get(`lookup/${ids[0]}`)
            .then((store: any) => {
                pickupByStore.set(ids[0], store?.options?.pickup_enabled === true);
                if (active) setVersion((version) => version + 1);
            })
            .catch(() => {
                pickupByStore.set(ids[0], false);
                if (active) setVersion((version) => version + 1);
            });
        return () => {
            active = false;
        };
    }, [adapter, ids]);

    if (ids.length !== 1) return false;
    return known(ids[0]);
}
