import { useState, useEffect } from 'react';
import { restoreFleetbasePlace } from '../utils/location';
import { isResource, isEmpty } from '../utils';
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

    // Handle location update
    const updateLocation = async (attributes = {}) => {
        const place = restoreFleetbasePlace(attributes);

        try {
            const updatedPlace = await place.save();
            updateLocationState(updatedPlace);
            return updatedPlace;
        } catch (err) {
            setError(err);
        }
    };

    // Update the place in state only
    const updateLocationState = (place) => {
        setCustomerLocations((prevLocations) => prevLocations.map((location) => (location.id === place.id ? place.serialize() : location)));
    };

    // Handle delete location by ID
    const deleteLocationById = async (placeId) => {
        try {
            const place = restoreFleetbasePlace({ id: placeId });
            const deletedPlace = await place.destroy();
            setCustomerLocations((prevLocations) => prevLocations.filter((location) => location.id !== deletedPlace.id));
        } catch (err) {
            setError(err);
        }
    };

    // Handle delete location
    const deleteLocation = async (place) => {
        try {
            const deletedPlace = await place.destroy();
            setCustomerLocations((prevLocations) => prevLocations.filter((location) => location.id !== deletedPlace.id));
        } catch (err) {
            setError(err);
        }
    };

    // Add location
    const addLocation = async (attributes = {}) => {
        if (isAuthenticated) {
            return isEmpty(attributes.id) ? addCustomerLocation(attributes) : updateLocation(attributes);
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
        updateLocation,
        updateLocationState,
        deleteLocation,
        deleteLocationById,
        isLoadingSavedLocations: loading,
        savedLocationsError: error,
    };
};

export default useSavedLocations;
