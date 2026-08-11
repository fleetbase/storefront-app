import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import Config from 'react-native-config';
import { Network, Store, StoreLocation } from '@fleetbase/storefront';
import useStorage, { get as getStoredValue, remove as removeStoredValue } from '../hooks/use-storage';
import useStorefront from '../hooks/use-storefront';
import {
    DEFAULT_DISCOVERY_STATE,
    DiscoveryState,
    getScopedStorageKey,
    getStorefrontMode,
    getStorefrontStorageScope,
    serializeSdkResource,
    StorefrontMode,
} from '../utils/marketplace-runtime';

type StorefrontRuntimeValue = {
    mode: StorefrontMode;
    owner: Store | Network | null;
    ownerInfo: any;
    network: Network | null;
    currentStore: Store | null;
    currentStoreInfo: any;
    discovery: DiscoveryState;
    selectedStoreLocations: Record<string, any>;
    initializeOwner: (owner: any) => void;
    enterStore: (store: any) => void;
    leaveStore: () => void;
    selectStoreLocation: (storeId: string, location: any) => void;
    getSelectedStoreLocation: (storeId?: string) => StoreLocation | null;
    updateDiscovery: (updates: Partial<DiscoveryState>) => void;
    clearDiscovery: () => void;
};

const StorefrontRuntimeContext = createContext<StorefrontRuntimeValue | undefined>(undefined);

export const StorefrontRuntimeProvider = ({ children }: { children: ReactNode }) => {
    const { storefront } = useStorefront();
    const adapter = storefront?.getAdapter();
    const bootstrapScope = getStorefrontStorageScope(Config.STOREFRONT_KEY);
    const [ownerInfo, setOwnerInfo] = useStorage<any>(getScopedStorageKey(bootstrapScope, 'owner'), null);
    const [currentStoreInfo, setCurrentStoreInfo] = useStorage<any>(getScopedStorageKey(bootstrapScope, 'current-store'), null);
    const [selectedStoreLocations, setSelectedStoreLocations] = useStorage<Record<string, any>>(getScopedStorageKey(bootstrapScope, 'store-locations'), {});
    const [discovery, setDiscovery] = useState<DiscoveryState>(DEFAULT_DISCOVERY_STATE);
    const mode = getStorefrontMode(ownerInfo);

    const owner = useMemo(() => {
        if (!ownerInfo || !adapter) return null;
        return mode === 'marketplace' ? new Network(ownerInfo, adapter) : new Store(ownerInfo, adapter);
    }, [adapter, mode, ownerInfo]);
    const network = mode === 'marketplace' ? (owner as Network | null) : null;
    const currentStore = useMemo(() => {
        const data = mode === 'store' ? ownerInfo : currentStoreInfo;
        return data && adapter ? new Store(data, adapter) : null;
    }, [adapter, currentStoreInfo, mode, ownerInfo]);

    const initializeOwner = useCallback(
        (nextOwner: any) => {
            const serializedOwner = serializeSdkResource(nextOwner);
            const nextMode = getStorefrontMode(serializedOwner);
            setOwnerInfo(serializedOwner);
            setCurrentStoreInfo(nextMode === 'store' ? serializedOwner : null);

            // Migrate the only safe store-specific legacy selection, then remove
            // unscoped values so a different storefront profile can never reuse them.
            if (nextMode === 'store' && serializedOwner?.id && !selectedStoreLocations?.[serializedOwner.id]) {
                const legacyLocation = getStoredValue('_current_store_location');
                if (legacyLocation) {
                    setSelectedStoreLocations({
                        ...selectedStoreLocations,
                        [serializedOwner.id]: serializeSdkResource(legacyLocation),
                    });
                }
            }
            for (const legacyKey of ['info', '_current_store_location_id', '_current_store_location', '_store_locations']) {
                removeStoredValue(legacyKey);
            }
        },
        [selectedStoreLocations, setCurrentStoreInfo, setOwnerInfo, setSelectedStoreLocations]
    );

    const enterStore = useCallback(
        (store: any) => {
            if (mode !== 'marketplace') return;
            setCurrentStoreInfo(serializeSdkResource(store));
        },
        [mode, setCurrentStoreInfo]
    );

    const leaveStore = useCallback(() => {
        if (mode === 'marketplace') setCurrentStoreInfo(null);
    }, [mode, setCurrentStoreInfo]);

    const selectStoreLocation = useCallback(
        (storeId: string, location: any) => {
            if (!storeId || !location) return;
            setSelectedStoreLocations({
                ...selectedStoreLocations,
                [storeId]: serializeSdkResource(location),
            });
        },
        [selectedStoreLocations, setSelectedStoreLocations]
    );

    const getSelectedStoreLocation = useCallback(
        (storeId?: string) => {
            const resolvedStoreId = storeId || currentStore?.id;
            const location = resolvedStoreId ? selectedStoreLocations?.[resolvedStoreId] : null;
            return location && adapter ? new StoreLocation(location, adapter) : null;
        },
        [adapter, currentStore?.id, selectedStoreLocations]
    );

    const updateDiscovery = useCallback((updates: Partial<DiscoveryState>) => {
        setDiscovery((current) => ({ ...current, ...updates, offset: updates.offset ?? 0 }));
    }, []);
    const clearDiscovery = useCallback(() => setDiscovery(DEFAULT_DISCOVERY_STATE), []);

    const value = useMemo(
        () => ({
            mode,
            owner,
            ownerInfo,
            network,
            currentStore,
            currentStoreInfo,
            discovery,
            selectedStoreLocations,
            initializeOwner,
            enterStore,
            leaveStore,
            selectStoreLocation,
            getSelectedStoreLocation,
            updateDiscovery,
            clearDiscovery,
        }),
        [
            clearDiscovery,
            currentStore,
            currentStoreInfo,
            discovery,
            enterStore,
            getSelectedStoreLocation,
            initializeOwner,
            leaveStore,
            mode,
            network,
            owner,
            ownerInfo,
            selectStoreLocation,
            selectedStoreLocations,
            updateDiscovery,
        ]
    );

    return <StorefrontRuntimeContext.Provider value={value}>{children}</StorefrontRuntimeContext.Provider>;
};

export const useStorefrontRuntime = (): StorefrontRuntimeValue => {
    const context = useContext(StorefrontRuntimeContext);
    if (!context) throw new Error('useStorefrontRuntime must be used within StorefrontRuntimeProvider');
    return context;
};
