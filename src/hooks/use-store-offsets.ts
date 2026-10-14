import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import useStorefront from './use-storefront';
import { attr, storeOffset } from '../ui/store-display';

/** Each store's offset from UTC in minutes (null when the server doesn't say), kept for the session. */
const offsetByStore = new Map<string, number | null>();
const pending = new Set<string>();

/** Keeps a store's offset already loaded elsewhere, so it isn't looked up again. */
export function rememberStoreOffset(store: unknown): void {
    const id = attr<string | null>(store, 'id', null);
    const offset = storeOffset(store);
    if (id && offset !== null) offsetByStore.set(id, offset);
}

/**
 * The offset from UTC of each given store, for showing booked times on the store's clock
 * where only a store id is at hand (cart lines, orders). A single store's app already has
 * its store; others are looked up once each. Null while loading or when unknown, which
 * shows the device clock.
 */
export default function useStoreOffsets(storeIds: Array<string | null | undefined>): (storeId: string | null | undefined) => number | null {
    const { adapter } = useStorefront();
    const { ownerInfo } = useStorefrontRuntime();
    const ownerId = attr<string | null>(ownerInfo, 'id', null);
    // Keyed by the ids' content, so a new array with the same stores doesn't refetch.
    const idsKey = storeIds.filter(Boolean).join('|');
    const ids = useMemo(() => (idsKey ? [...new Set(idsKey.split('|'))] : []), [idsKey]);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const missing = ids.filter((id) => id !== ownerId && !offsetByStore.has(id) && !pending.has(id));
        if (missing.length === 0 || !adapter) return;
        let active = true;
        missing.forEach((id) => pending.add(id));
        Promise.all(
            missing.map((id) =>
                adapter
                    .get(`lookup/${id}`)
                    .then((store: any) => offsetByStore.set(id, storeOffset(store)))
                    .catch(() => offsetByStore.set(id, null))
                    .finally(() => pending.delete(id))
            )
        ).then(() => active && setVersion((current) => current + 1));
        return () => {
            active = false;
        };
    }, [adapter, ids, ownerId]);

    return useCallback(
        (storeId: string | null | undefined) => {
            if (!storeId) return null;
            if (storeId === ownerId) return storeOffset(ownerInfo);
            return offsetByStore.get(storeId) ?? null;
        },
        // `version` changes when lookups land.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [ownerId, ownerInfo, version]
    );
}
