import { useMemo, useState, useEffect } from 'react';
import Storefront from '@fleetbase/storefront';
import Config from 'react-native-config';
import { getString } from './use-storage';

const { STOREFRONT_KEY, FLEETBASE_HOST } = Config;
export const instance = new Storefront(STOREFRONT_KEY, { host: FLEETBASE_HOST });
export const adapter = instance.getAdapter();

const hasStorefrontConfig = () => {
    return 'FLEETBASE_KEY' in Config && 'STOREFRONT_KEY' in Config;
};

const useStorefront = () => {
    const [storefront, setStorefront] = useState<Storefront | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const storefrontAdapter = useMemo(() => {
        if (storefront) {
            return storefront.getAdapter();
        }

        return adapter;
    }, [storefront]);

    useEffect(() => {
        const authToken = getString('_customer_token');
        if (authToken) {
            const authorizedAdapter = adapter.setHeaders({ 'Customer-Token': authToken });
            instance.setAdapter(authorizedAdapter);
        }

        try {
            setStorefront(instance);
        } catch (initializationError) {
            setError(initializationError);
        }
    }, []);

    // Return both the storefront instance and any adapter for easier access in components
    return { storefront, adapter: storefrontAdapter, error, hasStorefrontConfig };
};

export default useStorefront;
