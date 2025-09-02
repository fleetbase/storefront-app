import { useState, useEffect, useCallback, useMemo } from 'react';
import { isResource } from '../utils';
import { restoreFleetbaseStoreLocation } from '../utils/location';
import { adapter } from './use-storefront';
import useStorage from './use-storage';
import useStorefrontInfo from './use-storefront-info';

const serializeStoreLocation = (storeLocation) => {
    const data = storeLocation.serialize();
    if (data.place && typeof data.place.serialize === 'function') {
        data.place = data.place.serialize();
    }

    return data;
};

const useStoreLocations = () => {
    const { store } = useStorefrontInfo();
    const [currentStoreLocationId, setCurrentStoreLocationId] = useStorage('_current_store_location_id');
    const [currentStoreLocation, setCurrentStoreLocation] = useStorage('_current_store_location');
    const [storeLocations, setStoreLocations] = useStorage('_store_locations', []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Function to get the default store location
    const getDefaultStoreLocation = useCallback(
        (storeLocations = []) => {
            let defaultStoreLocation = null;

            if (currentStoreLocationId) {
                defaultStoreLocation = storeLocations.find((location) => location.id === currentStoreLocationId);
            }

            if (storeLocations.length && !defaultStoreLocation) {
                defaultStoreLocation = storeLocations[0];
            }

            return defaultStoreLocation && typeof defaultStoreLocation.serialize === 'function' ? serializeStoreLocation(defaultStoreLocation) : defaultStoreLocation;
        },
        [currentStoreLocationId]
    );

    // Function to update the current store location which will be used for loading and checkout
    const updateCurrentStoreLocation = useCallback(
        (storeLocation) => {
            setCurrentStoreLocationId(storeLocation.id);
            setCurrentStoreLocation(serializeStoreLocation(storeLocation));
        },
        [setCurrentStoreLocationId, setCurrentStoreLocation]
    );

    // Function to load customer locations
    const loadStoreLocations = useCallback(async () => {
        if (!store) {
            setError(new Error('Store instance is not set'));
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const locations = await store.getLocations();
            const serializedLocations = locations.map(serializeStoreLocation);
            setStoreLocations(serializedLocations);
            setCurrentStoreLocation(getDefaultStoreLocation(serializedLocations));
            return locations;
        } catch (err) {
            console.error('Error fetching store locations:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [store, getDefaultStoreLocation, setStoreLocations, setCurrentStoreLocation]);

    useEffect(() => {
        loadStoreLocations();
    }, [store]);

    return useMemo(
        () => ({
            currentStoreLocation: restoreFleetbaseStoreLocation(currentStoreLocation),
            storeLocations: restoreFleetbaseStoreLocation(storeLocations),
            store,
            updateCurrentStoreLocation,
            isLoadingStoreLocations: loading,
            storeLocationsError: error,
        }),
        [currentStoreLocation, storeLocations, store, updateCurrentStoreLocation, loading, error]
    );
};

export default useStoreLocations;
