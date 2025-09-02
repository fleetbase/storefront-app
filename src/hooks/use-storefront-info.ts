import { useCallback, useMemo } from 'react';
import { adapter } from './use-storefront';
import { Store } from '@fleetbase/storefront';
import { get } from '../utils';
import useStorage from './use-storage';

const useStorefrontInfo = () => {
    const [info, setInfo] = useStorage('info', {});
    const store = useMemo(() => new Store(info, adapter), [info]);

    const updateInfo = useCallback(
        (newInfo) => {
            setInfo(newInfo);
        },
        [setInfo]
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
            store,
            setInfo: updateInfo,
            enabled,
        }),
        [info, store, updateInfo, enabled]
    );
};

export default useStorefrontInfo;
