import { useCallback } from 'react';
import { adapter } from './use-storefront';
import { Store } from '@fleetbase/storefront';
import { get } from '../utils';
import useStorage from './use-storage';

const useStorefrontInfo = () => {
    const [info, setInfo] = useStorage('info', {});
    const store = new Store(info, adapter);

    const updateInfo = useCallback(
        (newInfo) => {
            setInfo(newInfo);
        },
        [setInfo]
    );

    const enabled = (key) => {
        if (!key.endsWith('_enabled')) {
            key = `${key}_enabled`;
        }
        return get(info.options, key) === true;
    };

    return {
        info,
        store,
        setInfo: updateInfo,
        enabled,
    };
};

export default useStorefrontInfo;
