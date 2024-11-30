import { useState, useEffect } from 'react';
import { restoreFleetbasePlace } from '../utils/location';
import { isResource } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import useStorage from './use-storage';
import useFleetbase from './use-fleetbase';

const useSavedLocations = () => {
    const { fleetbase } = useFleetbase();
    const { customer, isAuthenticated } = useAuth();
    const [localLocations, setLocalLocations] = useStorage('_local_locations', []);
    const [customerLocations, setCustomerLocations] = useStorage('_customer_locations', []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Add a new local location
    const addLocalLocation = (place) => {
        const data = isResource(place) ? place.serialize() : place;
        setLocalLocations((prevLocations) => [...prevLocations, data]);
    };

    // Add new location but as a promise
    const addLocalLocationPromise = (place) => {
        return new Promise((resolve) => {
            addLocalLocation(place);
            resolve(true);
        });
    };

    // Add new location for authenticated customer
    const addCustomerLocation = async (attributes = {}) => {
        try {
            const place = await fleetbase.places.create({ ...attributes, owner: customer.id });
            setCustomerLocations((prevLocations) => [...prevLocations, place.serialize()]);
            return place;
        } catch (err) {
            setError(err);
        }
    };

    // Add location
    const addLocation = async (attributes = {}) => {
        console.log('[addLocation isAuthenticated]', isAuthenticated);
        if (isAuthenticated) {
            return addCustomerLocation(attributes);
        }

        return addLocalLocationPromise(attributes);
    };

    // Function to load customer locations
    const loadCustomerLocations = async () => {
        if (!customer) {
            setError(new Error('Customer is not defined'));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const places = await customer.getSavedPlaces();
            setCustomerLocations(places.map((place) => place.serialize()));
            return places;
        } catch (err) {
            console.error('Error fetching customer locations:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            loadCustomerLocations();
        }
    }, [isAuthenticated]);

    const savedLocations = restoreFleetbasePlace(isAuthenticated ? customerLocations : localLocations);

    return {
        savedLocations,
        localLocations: restoreFleetbasePlace(localLocations),
        customerLocations: restoreFleetbasePlace(customerLocations),
        addLocation,
        addCustomerLocation,
        addLocalLocation,
        addLocalLocationPromise,
        isLoadingSavedLocations: loading,
        savedLocationsError: error,
    };
};

export default useSavedLocations;
