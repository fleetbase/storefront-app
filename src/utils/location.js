import Geolocation from '@react-native-community/geolocation';
import { Platform } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { checkMultiple, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { GoogleAddress, Place } from '@fleetbase/sdk';
import { StoreLocation } from '@fleetbase/storefront';
import { setMap, getMap, getArray } from './storage';
import { haversine } from './math';
import { config, uniqueArray, isObject, isArray } from './';
import axios from 'axios';

/** Configure GeoLocation */
Geolocation.setRNConfiguration({
    authorizationLevel: 'whenInUse',
    enableBackgroundLocationUpdates: false,
    locationProvider: 'auto'
})

const emit = EventRegister.emit;

export function createGoogleAddress(...args) {
    return new GoogleAddress(...args);
}

export async function geocode(latitude: number, longitude: number) {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                latlng: `${latitude},${longitude}`,
                sensor: false,
                language: 'en-US',
                key: config('GOOGLE_MAPS_KEY'),
            },
        });
        const result = response.data.results[0];
        return result ? new GoogleAddress(result) : null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};

export async function geocodeAutocomplete(input, coordinates = null) {
    try {
        const params = {
            input,
            types: 'address', // Restrict results to addresses only
            language: 'en-US',
            key: config('GOOGLE_MAPS_KEY'),
        };

        if (isArray(coordinates)) {
            params.location = `${coordinates[0]},${coordinates[1]}`;
            params.radius = 5000; // 5km radius
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
            params,
        });

        // Extract predictions from response
        const predictions = response.data.predictions.map(prediction => ({
            description: prediction.description,
            place_id: prediction.place_id,
        }));

        return predictions;
    } catch (error) {
        console.error('Autocomplete error:', error);
        return [];
    }
}

export async function getCurrentLocation () {
    const lastLocation = getMap('last_current_location');

    return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Check if user has moved more than 200 meters from the last location
                if (lastLocation && haversine([latitude, longitude], lastLocation.coordinates) > 200) {
                    return resolve(lastLocation);
                }

                try {
                     const googleAddress = await geocode(latitude, longitude);
                     if (googleAddress) {
                        googleAddress.setAttribute('position', position);

                        const serializedGoogleAddress = googleAddress.all();
                        setMap('last_current_location', serializedGoogleAddress);
                        emit('location.updated', Place.fromGoogleAddress(googleAddress));
                        resolve(serializedGoogleAddress);
                    } else {
                        resolve({ address: null, coordinates: [latitude, longitude], position });
                    }
                } catch (error) {
                    resolve({ address: null, coordinates: [latitude, longitude], position });
                }
            },
            (error) => resolve(null),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    });
};

export function getLocation () {
    return get('location');
}

export function getCoordinates  (location)  {
    if (!location) return [];

    if (location instanceof Place && location.coordinates) {
        const [longitude, latitude] = location.coordinates;
        return [latitude, longitude];
    }

    if (location instanceof StoreLocation) {
        const point = location.getAttribute('place.location');
        if (point) {
            const [longitude, latitude] = point.coordinates;
            return [latitude, longitude];
        }
    }

    if (isArray(location)) return location;

    if (typeof location === 'object' && location.type === 'Point') {
        const [longitude, latitude] = location.coordinates;
        return [latitude, longitude];
    }

    return [0, 0];
};

export function getDistance (origin, destination) {
    const originCoordinates = getCoordinates(origin);
    const destinationCoordinates = getCoordinates(destination);
    return haversine(originCoordinates, destinationCoordinates);
};

export function getLocationName(place) {
    if (isObject(place)) {
        if (place.address) {
            return place.address;
        }

        const segments = uniqueArray([place.city, place.county, place.postalCode, place.state].filter(Boolean));
        return segments.join(', ');
    }

    return 'Uknown Location';
};

export function getLocationFromRouteOrStorage(key, routeParams = {}) {
    const lastLocation = getMap('last_current_location');
    const savedLocalLocations = getArray('saved_local_locations');
    const locationFromParams = routeParams[key];

    if (locationFromParams) {
        return locationFromParams;
    }

    if (lastLocation) {
        return lastLocation;
    }

    if (isArray(savedLocalLocations) && savedLocalLocations.length) {
        return savedLocalLocations[0];
    }

    return null;
}