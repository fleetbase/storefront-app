import { useEffect, useState } from 'react';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import { getBuildBranding } from '../branding/build-branding';

/** The tag that marks a Network's main store (`navigation.network.mainStoreTag`), if the build sets one. */
export const MAIN_STORE_TAG: string | null = getBuildBranding().branding.navigation.network?.mainStoreTag ?? null;

export type MainStore = {
    /** The main store (an SDK Store), or null when no member carries the tag. */
    store: any | null;
    /** Its first location: what products added from the shop home are picked up from. */
    locationId: string | null;
    loading: boolean;
    error: Error | null;
    reload: () => void;
};

// One lookup per app session: the shop home and its category screens share it.
let cache: { networkId: string; store: any | null; locationId: string | null } | null = null;

async function firstLocationId(store: any): Promise<string | null> {
    const listed = store?.getAttribute?.('locations');
    if (Array.isArray(listed) && listed[0]?.id) return String(listed[0].id);
    try {
        const locations = Array.from((await store?.getLocations?.()) ?? []) as any[];
        return locations[0]?.id ?? null;
    } catch {
        return null;
    }
}

/**
 * The Network's main store: the member tagged with `navigation.network.mainStoreTag`. Its
 * categories are the shop home's grid; every other member is a partner shop.
 */
export default function useMainStore(): MainStore {
    const { network } = useStorefrontRuntime();
    const networkId = network?.id ?? null;
    const cached = cache && cache.networkId === networkId ? cache : null;
    const [state, setState] = useState<{ store: any | null; locationId: string | null; loading: boolean; error: Error | null }>({
        store: cached?.store ?? null,
        locationId: cached?.locationId ?? null,
        loading: !cached && !!MAIN_STORE_TAG,
        error: null,
    });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!network || !MAIN_STORE_TAG) {
            setState((current) => ({ ...current, loading: false }));
            return;
        }
        if (cache && cache.networkId === networkId && attempt === 0) return;
        let active = true;
        setState((current) => ({ ...current, loading: true, error: null }));
        network
            .getStores({ tagged: [MAIN_STORE_TAG], limit: 1, with_locations: true })
            .then(async (result: any) => {
                const store = Array.from(result ?? [])[0] ?? null;
                const locationId = store ? await firstLocationId(store) : null;
                if (!active) return;
                cache = { networkId: networkId as string, store, locationId };
                setState({ store, locationId, loading: false, error: null });
            })
            .catch((error: Error) => active && setState((current) => ({ ...current, loading: false, error })));
        return () => {
            active = false;
        };
    }, [attempt, network, networkId]);

    return { ...state, reload: () => setAttempt((value) => value + 1) };
}
