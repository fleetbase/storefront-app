import { useState, useEffect } from 'react';
import { EventRegister } from 'react-native-event-listeners';
import { getCurrentLocation as fetchCurrentLocation, getLiveLocation, restoreFleetbasePlace, getLastKnownPosition } from '../utils/location';
import { isResource, isArray } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import useStorage from './use-storage';

const useCurrentLocation = () => {
    const { isAuthenticated, updateCustomerLocation, customer, getDefaultAddress } = useAuth();
    const [currentLocation, setCurrentLocation] = useStorage('_current_location');
    const [liveLocation, setLiveLocation] = useStorage('_live_location');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Function to update current location
    const updateCurrentLocation = async (location) => {
        const place = restoreFleetbasePlace(location);

        setCurrentLocation(place);
        EventRegister.emit('current_location.updated', place);
    };

    // Get current location coordinates
    const getCurrentLocationCoordinates = () => {
        if (isResource(currentLocation)) {
            return currentLocation.getAttribute('location');
        }

        if (isArray(currentLocation.location)) {
            return currentLocation.location;
        }

        if (currentLocation.latitude && currentLocation.longitude) {
            return [currentLocation.latitude, currentLocation.longitude];
        }

        return getLastKnownPosition();
    };

    // Function to initialize current location
    const initializeCurrentLocation = async () => {
        setLoading(true);
        setError(null);

        try {
            if (isAuthenticated) {
                const defaultAddress = getDefaultAddress(customer);
                if (defaultAddress) {
                    await updateCurrentLocation(defaultAddress);
                    return;
                }
            }

            const location = await fetchCurrentLocation();
            await updateCurrentLocation(location);
        } catch (err) {
            console.error('Error fetching current location:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Get live location
    const initializeLiveLocation = async () => {
        try {
            const location = await getLiveLocation();
            if (location) {
                setLiveLocation(location.serialize());
            }
        } catch (err) {
            console.error('Error fetching live location:', err);
            setError(err);
        }
    };

    // Set the customer default location
    const setCustomerDefaultLocation = async (location) => {
        if (!isAuthenticated) {
            return;
        }

        try {
            await updateCustomerLocation(location);
        } catch (err) {
            console.error('Error updating customer location:', err);
            throw err;
        }
    };

    // Update current location/default location as a promise
    const updateDefaultLocationPromise = (instance) => {
        return new Promise(async (resolve) => {
            await updateDefaultLocation(instance);
            resolve(instance);
        });
    };

    // Update current location/default location as a promise
    const updateDefaultLocation = (instance) => {
        updateCurrentLocation(instance);
        setCustomerDefaultLocation(instance);
    };

    // Set initial current location
    useEffect(() => {
        initializeLiveLocation();

        if (!currentLocation) {
            initializeCurrentLocation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, customer]);

    return {
        currentLocation: restoreFleetbasePlace(currentLocation),
        liveLocation: restoreFleetbasePlace(liveLocation),
        updateCurrentLocation,
        setCurrentLocation,
        updateDefaultLocationPromise,
        updateDefaultLocation,
        getCurrentLocationCoordinates,
        setCustomerDefaultLocation,
        initializeCurrentLocation,
        initializeLiveLocation,
        isLoadingCurrentLocation: loading,
        currentLocationError: error,
    };
};

export default useCurrentLocation;
