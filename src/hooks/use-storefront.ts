import { useMemo, useState, useEffect } from 'react';
import Storefront from '@fleetbase/storefront';
import Config from 'react-native-config';

const { STOREFRONT_KEY, FLEETBASE_HOST } = Config;
export const instance = new Storefront(STOREFRONT_KEY, { host: FLEETBASE_HOST });
export const adapter = instance.getAdapter();

const hasStorefrontConfig = () => {
    return 'FLEETBASE_KEY' in Config && 'STOREFRONT_KEY' in Config;
};

const useStorefront = () => {
    // State to store the storefront instance and any initialization errors
    const [storefront, setStorefront] = useState<Storefront | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const adapter = useMemo(() => {
        // Initialize adapter once and memoize it
        if (storefront) {
            return adapter;
        }
        return null;
    }, [storefront]);

    useEffect(() => {
        // Initialize the Storefront SDK once
        try {
            setStorefront(instance);
        } catch (initializationError) {
            setError(initializationError);
        }
    }, []);

    // Return both the storefront instance and any adapter for easier access in components
    return { storefront, adapter, error, hasStorefrontConfig };
};

export default useStorefront;
