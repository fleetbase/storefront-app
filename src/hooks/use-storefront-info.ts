import { useCallback, useMemo } from 'react';
import { get } from '../utils';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';

/** Options each store decides for itself, even inside a network. */
export const STORE_LEVEL_OPTIONS = ['pickup_enabled'];

/**
 * The options in effect: in a network the network's settings apply to every store (tips,
 * reviews, cash on delivery, minimum order, tax...), except those a store decides itself
 * (pickup). A single store's app uses the store's own.
 */
export function effectiveOptions(mode: string | null | undefined, ownerOptions: any, storeOptions: any): Record<string, any> {
    const owner = ownerOptions && typeof ownerOptions === 'object' ? ownerOptions : {};
    if (mode !== 'network') return { ...owner, ...(storeOptions && typeof storeOptions === 'object' ? storeOptions : {}) };
    const store = storeOptions && typeof storeOptions === 'object' ? storeOptions : {};
    const options: Record<string, any> = { ...owner };
    for (const key of STORE_LEVEL_OPTIONS) options[key] = store[key];
    return options;
}

const useStorefrontInfo = () => {
    const { mode, ownerInfo, network, currentStore, currentStoreInfo, initializeOwner } = useStorefrontRuntime();
    const info = useMemo(() => {
        const base = currentStoreInfo || ownerInfo || {};
        const options = effectiveOptions(mode, ownerInfo?.options, currentStoreInfo ? currentStoreInfo.options : null);
        return { ...base, options };
    }, [currentStoreInfo, mode, ownerInfo]);

    const updateInfo = useCallback(
        (newInfo) => {
            initializeOwner(newInfo);
        },
        [initializeOwner]
    );

    const enabled = useCallback(
        (key) => {
            if (!key.endsWith('_enabled')) {
                key = `${key}_enabled`;
            }
            return get(info.options, key) === true;
        },
        [info.options]
    );

    return useMemo(
        () => ({
            info,
            store: currentStore,
            network,
            mode,
            ownerInfo,
            setInfo: updateInfo,
            enabled,
        }),
        [currentStore, enabled, info, mode, network, ownerInfo, updateInfo]
    );
};

export default useStorefrontInfo;
