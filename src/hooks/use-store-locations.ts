import { useState, useEffect, useCallback, useMemo } from 'react';
import { StoreLocation } from '@fleetbase/storefront';
import useStorage from './use-storage';
import useStorefront from './use-storefront';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import { getScopedStorageKey, serializeSdkResource } from '../utils/marketplace-runtime';

const useStoreLocations = () => {
    const { storefront } = useStorefront();
    const adapter = storefront?.getAdapter();
    const { ownerInfo, currentStore: store, selectStoreLocation, getSelectedStoreLocation } = useStorefrontRuntime();
    const storeId = store?.id || 'none';
    const scope = ownerInfo?.id || 'unconfigured';
    const [storedLocations, setStoredLocations] = useStorage<any[]>(getScopedStorageKey(scope, 'locations', storeId), []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const storeLocations = useMemo(() => (adapter ? (storedLocations || []).map((location) => new StoreLocation(location, adapter)) : []), [adapter, storedLocations]);
    const currentStoreLocation = getSelectedStoreLocation(store?.id);

    const updateCurrentStoreLocation = useCallback(
        (storeLocation: any) => {
            if (store?.id && storeLocation) selectStoreLocation(store.id, storeLocation);
        },
        [selectStoreLocation, store?.id]
    );

    const loadStoreLocations = useCallback(async () => {
        if (!store) return [];
        setLoading(true);
        setError(null);
        try {
            const locations = await store.getLocations();
            const serialized = Array.from(locations || []).map(serializeSdkResource);
            setStoredLocations(serialized);
            const selected = getSelectedStoreLocation(store.id);
            const selectedStillExists = selected && locations.some((location: any) => location.id === selected.id);
            if (!selectedStillExists && locations.length > 0) selectStoreLocation(store.id, locations[0]);
            return locations;
        } catch (loadError: any) {
            setError(loadError);
            return [];
        } finally {
            setLoading(false);
        }
    }, [getSelectedStoreLocation, selectStoreLocation, setStoredLocations, store]);

    useEffect(() => {
        if (store) loadStoreLocations();
    }, [loadStoreLocations, store]);

    return useMemo(
        () => ({
            currentStoreLocation,
            storeLocations,
            store,
            updateCurrentStoreLocation,
            reloadStoreLocations: loadStoreLocations,
            isLoadingStoreLocations: loading,
            storeLocationsError: error,
        }),
        [currentStoreLocation, error, loadStoreLocations, loading, store, storeLocations, updateCurrentStoreLocation]
    );
};

export default useStoreLocations;
