import { useCallback, useMemo } from 'react';
import { get } from '../utils';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';

const useStorefrontInfo = () => {
    const { mode, ownerInfo, network, currentStore, currentStoreInfo, initializeOwner } = useStorefrontRuntime();
    const info = useMemo(() => currentStoreInfo || ownerInfo || {}, [currentStoreInfo, ownerInfo]);

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
