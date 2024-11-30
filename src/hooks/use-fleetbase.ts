import { useMemo, useState, useEffect } from 'react';
import Fleetbase from '@fleetbase/sdk';
import Config from 'react-native-config';

const { FLEETBASE_KEY, FLEETBASE_HOST } = Config;
export const instance = new Fleetbase(FLEETBASE_KEY, { host: FLEETBASE_HOST });
export const adapter = instance.getAdapter();

const useFleetbase = () => {
    // State to store the storefront instance and any initialization errors
    const [fleetbase, setFleetbase] = useState<Fleetbase | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const adapter = useMemo(() => {
        // Initialize adapter once and memoize it
        if (fleetbase) {
            return adapter;
        }
        return null;
    }, [fleetbase]);

    useEffect(() => {
        // Initialize the Fleetbase SDK once
        try {
            setFleetbase(instance);
        } catch (initializationError) {
            setError(initializationError);
        }
    }, []);

    // Return both the fleetbase instance and any adapter for easier access in components
    return { fleetbase, adapter, error };
};

export default useFleetbase;
