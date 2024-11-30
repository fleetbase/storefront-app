import { useState, useCallback } from 'react';

export function usePromiseWithLoading() {
    const [loadingStates, setLoadingStates] = useState({});

    const runWithLoading = useCallback(async (promise, loadingKey = 'default') => {
        setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));
        try {
            const result = await promise;
            return result;
        } finally {
            setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }));
        }
    }, []);

    const isAnyLoading = useCallback(() => {
        const anyLoading = Object.values(loadingStates).some((_) => _ === true);
        return anyLoading;
    }, [loadingStates]);

    const isLoading = useCallback(
        (loadingKey = 'default') => {
            return !!loadingStates[loadingKey];
        },
        [loadingStates]
    );

    return { runWithLoading, isLoading, isAnyLoading };
}

export default usePromiseWithLoading;
