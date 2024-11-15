import { useCallback } from 'react';
import useStorage from './use-storage';

const useStorefrontInfo = () => {
    const [info, setInfo] = useStorage('info');

    const updateInfo = useCallback(
        (newInfo) => {
            setInfo(newInfo);
        },
        [setInfo]
    );

    return {
        info,
        setInfo: updateInfo, // Expose a memoized setter
    };
};

export default useStorefrontInfo;
