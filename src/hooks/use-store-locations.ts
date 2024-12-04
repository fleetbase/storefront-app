import { useState, useEffect } from 'react';
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
    const getDefaultStoreLocation = (storeLocations = []) => {
        let defaultStoreLocation = null;

        if (currentStoreLocationId) {
            defaultStoreLocation = storeLocations.find((location) => location.id === currentStoreLocationId);
        }

        if (storeLocations.length && !defaultStoreLocation) {
            defaultStoreLocation = storeLocations[0];
        }

        return defaultStoreLocation && typeof defaultStoreLocation.serialize === 'function' ? serializeStoreLocation(defaultStoreLocation) : defaultStoreLocation;
    };

    // Function to update the current store location which will be used for loading and checkout
    const updateCurrentStoreLocation = (storeLocation) => {
        setCurrentStoreLocationId(storeLocation.id);
        setCurrentStoreLocation(serializeStoreLocation(storeLocation));
    };

    // Function to load customer locations
    const loadStoreLocations = async () => {
        if (!store) {
            setError(new Error('Store instance is not set'));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const locations = await store.getLocations();
            const storeLocations = locations.map(serializeStoreLocation);
            setStoreLocations(storeLocations);
            setCurrentStoreLocation(getDefaultStoreLocation(storeLocations));
            return locations;
        } catch (err) {
            console.error('Error fetching store locations:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStoreLocations();
    }, []);

    return {
        currentStoreLocation: restoreFleetbaseStoreLocation(currentStoreLocation),
        storeLocations: restoreFleetbaseStoreLocation(storeLocations),
        store,
        updateCurrentStoreLocation,
        isLoadingStoreLocations: loading,
        storeLocationsError: error,
    };
};

export default useStoreLocations;
