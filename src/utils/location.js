import Geolocation from '@react-native-community/geolocation';
import { Platform } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { checkMultiple, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { GoogleAddress, Place, Point } from '@fleetbase/sdk';
import { StoreLocation } from '@fleetbase/storefront';
import { adapter as storefrontAdapter } from '../hooks/use-storefront';
import { adapter } from '../hooks/use-fleetbase';
import { haversine } from './math';
import { config, uniqueArray, isObject, isArray, isEmpty, isResource, isSerializedResource, isPojoResource } from './';
import { getLocale } from './localize';
import storage from './storage';
import axios from 'axios';

const DEFAULT_LATITUDE = 1.369;
const DEFAULT_LONGITUDE = 103.8864;
const isAndroid = Platform.OS === 'android';

/** Configure GeoLocation */
Geolocation.setRNConfiguration({
    authorizationLevel: 'whenInUse',
    enableBackgroundLocationUpdates: false,
    locationProvider: 'auto',
});

const emit = EventRegister.emit;

export function createGoogleAddress(...args) {
    return new GoogleAddress(...args);
}

export async function geocode(latitude, longitude, options = {}) {
    const language = getLocale();
    if (!latitude || !longitude) {
        const fallbackCoordinates = getDefaultCoordinates();
        latitude = fallbackCoordinates.latitude;
        longitude = fallbackCoordinates.longitude;
    }

    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                latlng: `${latitude},${longitude}`,
                sensor: false,
                language,
                key: config('GOOGLE_MAPS_API_KEY'),
            },
        });

        if (isEmpty(response.data.results)) {
            throw new Error(`No geocode results for provided coordinates: ${latitude},${longitude}`, response);
        }

        // Allow full results
        if (options.withAllResults === true) {
            return response.data.results.map((result) => {
                return options.asGoogleAddress === true ? new GoogleAddress(result) : result;
            });
        }

        const result = response.data.results[0];
        return options.asGoogleAddress === true ? new GoogleAddress(result) : result;
    } catch (error) {
        console.warn('Geocoding error:', error);
        return null;
    }
}

export async function geocodeAutocomplete(input, coordinates = null) {
    const language = getLocale();

    try {
        const params = {
            input,
            language,
            key: config('GOOGLE_MAPS_API_KEY'),
        };

        if (isArray(coordinates)) {
            params.location = `${coordinates[0]},${coordinates[1]}`;
            params.radius = 5000;
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
            params,
        });

        // Extract predictions from response
        const predictions = response.data.predictions.map((prediction) => {
            const segments = parseAutocompleteAddress(prediction.description);

            return {
                description: prediction.description,
                place_id: prediction.place_id,
                ...segments,
            };
        });

        return predictions;
    } catch (error) {
        console.warn('Autocomplete error:', error);
        return [];
    }
}

export async function getPlaceDetails(placeId) {
    try {
        // Make a request to the Google Places Details API
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
                place_id: placeId,
                key: config('GOOGLE_MAPS_API_KEY'),
                fields: 'name,formatted_address,geometry,place_id,types,international_phone_number,website,address_components',
            },
        });

        // Handle API response
        if (response.data.status !== 'OK') {
            throw new Error(`Google API Error: ${response.data.status}`);
        }

        // Return the full result object from Google
        return response.data.result;
    } catch (error) {
        console.warn(`Error fetching place details for ID: ${placeId}`, error.message);
        return null;
    }
}

export function createFleetbasePlaceFromDetails(details, meta = {}) {
    const addressObject = parseAutocompleteAddress(details.formatted_address);
    const placeObject = parsePlaceDetails(details);

    const attributes = {
        name: details.name ?? null,
        street1: placeObject.street ?? addressObject.street,
        city: placeObject.city ?? addressObject.city,
        province: placeObject.state ?? addressObject.state,
        postal_code: placeObject.postalCode ?? addressObject.postalCode,
        neighborhood: placeObject.neighborhood,
        building: placeObject.building,
        security_access_code: null,
        country: placeObject.country ?? addressObject.country,
        location: new Point(placeObject.latitude, placeObject.longitude),
        phone: null,
        meta: {
            ...meta,
            coordinates: [placeObject.latitude, placeObject.longitude],
            location: addressObject.others,
        },
    };

    return new Place(attributes, adapter);
}

export function restoreFleetbasePlace(data) {
    // If is a resource already
    if (isResource(data)) {
        return data;
    }

    // If serialized resource object
    if (isSerializedResource(data)) {
        return new Place(data, adapter);
    }

    // If POJO resource object
    if (isPojoResource(data)) {
        return new Place(data.attributes, adapter);
    }

    // If array of resources
    if (isArray(data) && data.length) {
        return data.map(restoreFleetbasePlace);
    }

    if (isObject(data)) {
        return new Place(data, adapter);
    }

    return data;
}

export function restoreFleetbaseStoreLocation(data) {
    // If is a resource already
    if (isResource(data)) {
        if (data.place) {
            data.place = restoreFleetbasePlace(data.place);
        }

        return data;
    }

    // If serialized resource object
    if (isSerializedResource(data)) {
        if (data.place) {
            data.place = restoreFleetbasePlace(data.place);
        }

        return new StoreLocation(data, storefrontAdapter);
    }

    // If POJO resource object
    if (isPojoResource(data)) {
        if (data.attributes && data.attributes.place) {
            data.attributes.place = restoreFleetbasePlace(data.attributes / place);
        }

        return new StoreLocation(data.attributes, storefrontAdapter);
    }

    // If array of resources
    if (isArray(data) && data.length) {
        return data.map(restoreFleetbasePlace);
    }

    if (isObject(data)) {
        if (data.place) {
            data.place = restoreFleetbasePlace(data.place);
        }

        return new StoreLocation(data, storefrontAdapter);
    }

    return data;
}

export function formattedAddressFromPlace(place) {
    const segments = [
        place.getAttribute('street1'),
        place.getAttribute('street2'),
        place.getAttribute('neighborhood'),
        place.getAttribute('city'),
        place.getAttribute('state'),
        place.getAttribute('postal_code'),
        place.getAttribute('country'),
    ];

    // Worst case scenario fallback to coordinates
    if (segments.filter(Boolean).length === 0) {
        const { latitude, longitude } = getDefaultCoordinates();
        segments.push(...(place.getAttribute('location.coordinates', [longitude, latitude]) ?? [longitude, latitude]).map((coord) => (coord ? parseFloat(coord).toFixed(4) : coord)));
    }

    return segments.filter(Boolean).join(', ');
}

export function formattedAddressFromSerializedPlace(place) {
    const segments = [place.street1, place.street2, place.neighborhood, place.city, place.state, place.postal_code, place.country];

    return segments.filter(Boolean).join(', ');
}

export function formatAddressSecondaryIdentifier(place) {
    if (place.getAttribute('building')) {
        return `Building: ${place.getAttribute('building')}`;
    }

    if (place.getAttribute('neighborhood')) {
        return `Neighborhood: ${place.getAttribute('neighborhood')}`;
    }

    if (place.getAttribute('postal_code')) {
        return `Postal Code: ${place.getAttribute('postal_code')}`;
    }
}

export function serializGoogleAddress(googleAddress) {
    let attributes = {};

    if (googleAddress instanceof GoogleAddress || typeof googleAddress.all === 'function') {
        attributes = googleAddress.all();
    } else if (typeof googleAddress.toArray === 'function') {
        attributes = googleAddress.toArray();
    } else if (isObject(googleAddress.attributes)) {
        attributes = googleAddress.attributes;
    }

    return attributes;
}

export function createPlaceFromCoordinates(latitude, longitude, attributes = {}) {
    return new Place({ location: new Point(latitude, longitude), ...attributes });
}

export async function getLiveLocation() {
    return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Save the last known coordinates
                storage.setArray('_last_known_position', [latitude, longitude]);

                try {
                    const details = await geocode(latitude, longitude);
                    if (details) {
                        const place = createFleetbasePlaceFromDetails(details, { position });
                        // Save the last known location
                        storage.setMap('_last_known_location', place.serialize());
                        resolve(place);
                    } else {
                        const place = new Place({ location: new Point(latitude, longitude), meta: { position } });
                        console.warn('Defaulting live location to coordinate based place:', place);

                        storage.setMap('_last_known_location', place.serialize());
                        resolve(place);
                    }
                } catch (error) {
                    console.warn('Error attempting to geocode live/current position:', error);

                    const place = new Place({ location: new Point(latitude, longitude), meta: { position } });
                    console.warn('Defaulting live location to coordinate based place:', place);

                    // Save the last known location
                    storage.setMap('_last_known_location', place.serialize());

                    resolve(place);
                }
            },
            (error) => {
                resolve(null);
                console.error('Error getting device current position:', error);
            },
            { enableHighAccuracy: !isAndroid, timeout: 20000, maximumAge: 3600000 }
        );
    });
}

export async function getCurrentLocation() {
    const lastLocation = restoreFleetbasePlace(storage.getMap('_current_location'));

    return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Save the last known coordinates
                storage.setArray('_last_known_position', [latitude, longitude]);

                // Check if user has moved more than 200 meters from the last location
                if (lastLocation && haversine([latitude, longitude], lastLocation.getAttribute('location')) > 200) {
                    return resolve(lastLocation);
                }

                try {
                    const details = await geocode(latitude, longitude);
                    if (details) {
                        const place = createFleetbasePlaceFromDetails(details, { position });
                        storage.setMap('_current_location', place.serialize());
                        resolve(place);
                    } else {
                        const place = new Place({ location: new Point(latitude, longitude), meta: { position } });
                        console.warn('Defaulting live location to coordinate based place:', place);

                        storage.setMap('_last_known_location', place.serialize());
                        resolve(place);
                    }
                } catch (error) {
                    const place = new Place({ location: new Point(latitude, longitude), meta: { position } });
                    console.warn('Error attempting to geocode current position:', error);
                    console.warn('Defaulting current location to coordinate based place:', place);

                    storage.setMap('_current_location', place.serialize());
                    resolve(place);
                }
            },
            (error) => {
                resolve(null);
                console.error('Error getting device current position:', error);
            },
            { enableHighAccuracy: !isAndroid, timeout: 2000, maximumAge: 3600000 }
        );
    });
}

export function getLastKnownPosition() {
    return storage.getArray('_last_known_position') ?? [0, 0];
}

// NOTICE: when fleetbase returns a geojson point the coordinates will always be in order of [longitude, latitude]
export function getCoordinates(target, options = {}) {
    const { latitude: fallbackLatitude, longitude: fallbackLongitude } = getDefaultCoordinates();
    if (!target) {
        return [fallbackLatitude, fallbackLongitude];
    }

    if (isResource(target, 'place') || isResource(target, 'driver') || isResource(target, 'vehicle') || isResource(target, 'food-truck')) {
        const [longitude, latitude] = target.getAttribute('location').coordinates;
        return [latitude, longitude];
    }

    if (isResource(target, 'store-location')) {
        const location = target.getAttribute('place');
        return getCoordinates(location);
    }

    if (isResource(target, 'food-truck')) {
        const location = target.getAttribute('vehicle');
        return getCoordinates(location);
    }

    if (isPojoResource(target) && target.resource === 'place') {
        const [longitude, latitude] =
            typeof target.getAttribute === 'function'
                ? (target.getAttribute('location.coordinates') ?? [fallbackLatitude, fallbackLongitude])
                : (target.attributes?.location?.coordinates ?? [fallbackLatitude, fallbackLongitude]);
        return [latitude, longitude];
    }

    if (isPojoResource(target) && isObject(target.attributes.place) && target.resource === 'store-location') {
        return getCoordinates(target.attributes.place);
    }

    if (isSerializedResource(target)) {
        if (isObject(target.location)) {
            const [longitude, latitude] = target.location.coordinates;
            return [latitude, longitude];
        }

        if (isObject(target.place)) {
            return getCoordinates(target.place);
        }

        return [fallbackLatitude, fallbackLongitude];
    }

    if (isArray(target)) {
        return target;
    }

    if (isObject(target) && target.type === 'Point') {
        return target.coordinates;
    }

    if (isObject(target) && target.latitude && target.longitude) {
        return [target.latitude, target.longitude];
    }

    return [fallbackLatitude, fallbackLongitude];
}

export function getCoordinatesObject(place) {
    const [latitude, longitude] = getCoordinates(place);
    return { latitude, longitude };
}

export function getDistance(origin, destination) {
    const originCoordinates = getCoordinates(origin);
    const destinationCoordinates = getCoordinates(destination);
    return haversine(originCoordinates, destinationCoordinates);
}

export function getLocationName(place) {
    if (isObject(place)) {
        if (place.address) {
            return place.address;
        }

        const segments = uniqueArray([place.city, place.county, place.postalCode, place.state].filter(Boolean));
        return segments.join(', ');
    }

    return 'Uknown Location';
}

export function getLocationFromRouteOrStorage(key, routeParams = {}) {
    let location;
    const locationFromParams = routeParams[key];
    const lastKnownLocation = storage.getMap('_last_known_location');
    const currentLocation = storage.getMap('_current_location');
    const localLocations = storage.getArray('_local_locations');
    const customerLocations = storage.getArray('_customer_locations');

    if (locationFromParams) {
        location = locationFromParams;
    } else if (lastKnownLocation) {
        location = lastKnownLocation;
    } else if (currentLocation) {
        location = currentLocation;
    } else if (isArray(customerLocations) && customerLocations.length) {
        location = customerLocations[0];
    } else if (isArray(localLocations) && localLocations.length) {
        location = localLocations[0];
    }

    return restoreFleetbasePlace(location);
}

export function parsePlaceDetails(details) {
    const parsed = {
        streetNumber: null,
        street: null,
        city: null,
        state: null,
        postalCode: null,
        country: null,
        neighborhood: null,
        building: null,
        latitude: null,
        longitude: null,
    };

    if (!details || !details.address_components) {
        throw new Error('Invalid place details object.');
    }

    // Parse address components
    details.address_components.forEach((component) => {
        if (component.types.includes('street_number')) {
            parsed.streetNumber = component.long_name;
        } else if (component.types.includes('route')) {
            parsed.street = component.long_name;
        } else if (component.types.includes('locality')) {
            parsed.city = component.long_name;
        } else if (component.types.includes('administrative_area_level_1')) {
            parsed.state = component.short_name; // Use short_name for state abbreviations
        } else if (component.types.includes('country')) {
            parsed.country = component.long_name;
        } else if (component.types.includes('postal_code')) {
            parsed.postalCode = component.long_name;
        } else if (component.types.includes('neighborhood')) {
            parsed.neighborhood = component.long_name;
        } else if (component.types.includes('premise')) {
            parsed.building = component.long_name;
        } else if (component.types.includes('sublocality') || component.types.includes('sublocality_level_1')) {
            // Assign sublocality as neighborhood if neighborhood is not already set
            if (!parsed.neighborhood) {
                parsed.neighborhood = component.long_name;
            }
        }
    });

    // Add coordinates if available
    if (details.geometry && details.geometry.location) {
        parsed.latitude = details.geometry.location.lat;
        parsed.longitude = details.geometry.location.lng;
    }

    // Combine street number and route into full street address
    if (parsed.streetNumber && parsed.street) {
        parsed.street = `${parsed.streetNumber} ${parsed.street}`;
        delete parsed.streetNumber; // Clean up streetNumber field
    }

    return parsed;
}

export function parseAutocompleteAddress(description = '') {
    const segments = description
        .trim()
        .split(',')
        .map((s) => s.trim());
    const result = { street: null, city: null, state: null, postalCode: null, country: null, others: [] };

    // Define regex patterns
    const patterns = {
        postalCode: /^\d{5}(-\d{4})?$|^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$|^\d{3,6}$|^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/, // US/Canada/UK
        state: /^[A-Z]{2}$|california|texas|new york|ontario|british columbia|quebec|england|scotland/i,
        city: /^[A-Za-z\s]+$/, // Cities are alphabetical and may have spaces
        country: /usa|canada|uk|england|france|germany|mongolia|japan|india|china|australia/i,
    };

    const commonCities = [
        'New York',
        'Los Angeles',
        'Chicago',
        'Houston',
        'Phoenix',
        'Philadelphia',
        'San Antonio',
        'San Diego',
        'Dallas',
        'San Jose',
        'Austin',
        'Jacksonville',
        'Fort Worth',
        'Columbus',
        'San Francisco',
        'Charlotte',
        'Indianapolis',
        'Seattle',
        'Denver',
        'Washington',
        'Boston',
        'El Paso',
        'Detroit',
        'Nashville',
        'Memphis',
        'Portland',
        'Las Vegas',
        'Louisville',
        'Baltimore',
        'Milwaukee',
        'Albuquerque',
        'Tucson',
        'Fresno',
        'Sacramento',
        'Kansas City',
        'Mesa',
        'Atlanta',
        'Omaha',
        'Colorado Springs',
        'Raleigh',
        'Miami',
        'Virginia Beach',
        'Oakland',
        'Minneapolis',
        'Tulsa',
        'Arlington',
        'Tampa',
        'New Orleans',
        'Wichita',
        'Cleveland',
        'Bakersfield',
        'Aurora',
        'Anaheim',
        'Honolulu',
        'Toronto',
        'Vancouver',
        'Montreal',
        'Calgary',
        'Ottawa',
        'Edmonton',
        'Winnipeg',
        'Quebec City',
        'Hamilton',
        'Kitchener',
        'London',
        'Victoria',
        'Halifax',
        'Oshawa',
        'Windsor',
        'Saskatoon',
        'Regina',
        "St. John's",
        'Barrie',
        'Kelowna',
        'Sherbrooke',
        'Guelph',
        'Abbotsford',
        'Kingston',
        'London',
        'Manchester',
        'Birmingham',
        'Glasgow',
        'Liverpool',
        'Bristol',
        'Leeds',
        'Edinburgh',
        'Sheffield',
        'Cardiff',
        'Leicester',
        'Belfast',
        'Nottingham',
        'Newcastle',
        'Coventry',
        'Brighton',
        'Hull',
        'Plymouth',
        'Stoke-on-Trent',
        'Wolverhampton',
        'Derby',
        'Southampton',
        'Paris',
        'Marseille',
        'Lyon',
        'Berlin',
        'Munich',
        'Hamburg',
        'Frankfurt',
        'Rome',
        'Milan',
        'Naples',
        'Madrid',
        'Barcelona',
        'Valencia',
        'Lisbon',
        'Dublin',
        'Amsterdam',
        'The Hague',
        'Vienna',
        'Brussels',
        'Zurich',
        'Geneva',
        'Prague',
        'Warsaw',
        'Stockholm',
        'Copenhagen',
        'Oslo',
        'Helsinki',
        'Athens',
        'Budapest',
        'Belgrade',
        'Tokyo',
        'Seoul',
        'Beijing',
        'Shanghai',
        'Shenzhen',
        'Hong Kong',
        'Singapore',
        'Bangkok',
        'Jakarta',
        'Kuala Lumpur',
        'Manila',
        'New Delhi',
        'Mumbai',
        'Bangalore',
        'Chennai',
        'Karachi',
        'Dhaka',
        'Riyadh',
        'Jeddah',
        'Doha',
        'Istanbul',
        'Tehran',
        'Dubai',
        'Abu Dhabi',
        'Taipei',
        'Sydney',
        'Melbourne',
        'Brisbane',
        'Perth',
        'Adelaide',
        'Canberra',
        'Gold Coast',
        'Hobart',
        'Darwin',
        'Auckland',
        'Wellington',
        'Christchurch',
        'Hamilton',
        'Dunedin',
        'Cairo',
        'Lagos',
        'Johannesburg',
        'Nairobi',
        'Cape Town',
        'Accra',
        'Addis Ababa',
        'Casablanca',
        'Algiers',
        'Kampala',
        'Durban',
        'Tunis',
        'Luanda',
        'Gaborone',
        'Harare',
        'São Paulo',
        'Rio de Janeiro',
        'Buenos Aires',
        'Lima',
        'Bogotá',
        'Santiago',
        'Caracas',
        'Quito',
        'Montevideo',
        'La Paz',
        'Brasília',
        'Medellín',
        'Asunción',
        'Cali',
        'Salvador',
    ];
    const commonStates = [
        'California',
        'CA',
        'Texas',
        'TX',
        'Florida',
        'FL',
        'New York',
        'NY',
        'Illinois',
        'IL',
        'Pennsylvania',
        'PA',
        'Ohio',
        'OH',
        'Georgia',
        'GA',
        'North Carolina',
        'NC',
        'Michigan',
        'MI',
        'New Jersey',
        'NJ',
        'Virginia',
        'VA',
        'Washington',
        'WA',
        'Arizona',
        'AZ',
        'Massachusetts',
        'MA',
        'Tennessee',
        'TN',
        'Indiana',
        'IN',
        'Missouri',
        'MO',
        'Maryland',
        'MD',
        'Wisconsin',
        'WI',
        'Minnesota',
        'MN',
        'Colorado',
        'CO',
        'Alabama',
        'AL',
        'South Carolina',
        'SC',
        'Kentucky',
        'KY',
        'Oregon',
        'OR',
        'Oklahoma',
        'OK',
        'Connecticut',
        'CT',
        'Iowa',
        'IA',
        'Utah',
        'UT',
        'Nevada',
        'NV',
        'Arkansas',
        'AR',
        'Mississippi',
        'MS',
        'Kansas',
        'KS',
        'New Mexico',
        'NM',
        'Nebraska',
        'NE',
        'West Virginia',
        'WV',
        'Idaho',
        'ID',
        'Hawaii',
        'HI',
        'Maine',
        'ME',
        'Montana',
        'MT',
        'Delaware',
        'DE',
        'South Dakota',
        'SD',
        'North Dakota',
        'ND',
        'Alaska',
        'AK',
        'Vermont',
        'VT',
        'Wyoming',
        'WY',
        'Ontario',
        'British Columbia',
        'Quebec',
        'Alberta',
        'Manitoba',
        'Saskatchewan',
        'Nova Scotia',
        'Newfoundland and Labrador',
        'New Brunswick',
        'Prince Edward Island',
        'England',
        'Scotland',
        'Wales',
        'Northern Ireland',
        'New South Wales',
        'Victoria',
        'Queensland',
        'Western Australia',
        'South Australia',
        'Tasmania',
        'Northern Territory',
        'Australian Capital Territory',
        'ACT',
        'Maharashtra',
        'Karnataka',
        'Tamil Nadu',
        'Uttar Pradesh',
        'Gujarat',
        'Kerala',
        'Punjab',
        'West Bengal',
        'Rajasthan',
        'Madhya Pradesh',
        'Bihar',
        'Haryana',
        'Delhi',
        'Assam',
        'Gauteng',
        'Western Cape',
        'KwaZulu-Natal',
        'Eastern Cape',
        'Free State',
        'Limpopo',
        'Mpumalanga',
        'Northern Cape',
        'North West',
        'São Paulo',
        'Rio de Janeiro',
        'Minas Gerais',
        'Bahia',
        'Paraná',
        'Pernambuco',
        'Santa Catarina',
        'Ceará',
        'Rio Grande do Sul',
    ];

    // Iterate over segments from last to first
    for (let i = segments.length - 1; i >= 0; i--) {
        const segment = segments[i];

        // Match country
        if (!result.country && patterns.country.test(segment)) {
            result.country = segment;
            continue;
        }

        // Match postal code code
        if (!result.postalCode && patterns.postalCode.test(segment)) {
            result.postalCode = segment;
            continue;
        }

        // Match state
        if (!result.state && (patterns.state.test(segment) || commonStates.includes(segment))) {
            result.state = segment;
            continue;
        }

        // Match city
        if (!result.city && (patterns.city.test(segment) || commonCities.includes(segment))) {
            result.city = segment;
            continue;
        }

        // Default to "others" or "street"
        if (i === 0) {
            result.street = segment;
        } else {
            result.others.unshift(segment);
        }
    }

    // Reprocess "others" intelligently
    result.others = result.others.filter((segment) => {
        // Check if the segment contains both a state and postal code
        const statePotalCodeMatch = segment.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
        if (statePotalCodeMatch) {
            const [, state, postalCode] = statePotalCodeMatch; // Destructure match
            if (!result.state) result.state = state;
            if (!result.postalCode) result.postalCode = postalCode;
            return false; // Remove from others after processing
        }

        // Assign city if still not assigned and segment matches city patterns or common cities
        if (!result.city && (patterns.city.test(segment) || commonCities.includes(segment))) {
            result.city = segment;
            return false;
        }

        // Assign state if still not assigned and segment matches state patterns or common states
        if (!result.state && (patterns.state.test(segment) || commonStates.includes(segment))) {
            result.state = segment;
            return false;
        }

        // Assign postal code if still not assigned and segment matches postal code patterns
        if (!result.postalCode && patterns.postalCode.test(segment)) {
            result.postalCode = segment;
            return false;
        }

        return true; // Keep in others if not matched
    });

    return result;
}

export function getDefaultCoordinates() {
    const DEFAULT_COORDINATES = config('DEFAULT_COORDINATES', `${DEFAULT_LATITUDE},${DEFAULT_LONGITUDE}`);
    const [latitude, longitude] = DEFAULT_COORDINATES.split(',');

    return { latitude, longitude };
}

export function createFauxStoreLocation() {
    return new StoreLocation({
        place: new Place({ location: new Point(DEFAULT_LATITUDE, DEFAULT_LONGITUDE) }),
    });
}

export function createFauxPlace() {
    return new Place({ location: new Point(DEFAULT_LATITUDE, DEFAULT_LONGITUDE) });
}

/**
 * Determines if a given point is inside a GeoJSON polygon.
 *
 * @param {number[]} point - The point as [latitude, longitude].
 * @param {Object} polygon - A GeoJSON polygon object.
 * @returns {boolean} - True if the point is inside the polygon, false otherwise.
 *
 * GeoJSON polygon format:
 * {
 *   "type": "Polygon",
 *   "coordinates": [
 *     [ [lon, lat], [lon, lat], ... ],       // Outer ring
 *     [ [lon, lat], [lon, lat], ... ],       // (Optional) Hole(s)
 *     ...
 *   ]
 * }
 */
export function isPointInGeoJSONPolygon(point, polygon) {
    if (!polygon || polygon.type !== 'Polygon' || !isArray(polygon.coordinates)) {
        throw new Error('Invalid GeoJSON polygon');
    }

    // Convert the provided point from [lat, lon] to [lon, lat] to match GeoJSON.
    const testPoint = [point[1], point[0]];

    // Get the outer ring (first coordinate array).
    const outerRing = polygon.coordinates[0];
    if (!isArray(outerRing) || outerRing.length === 0) {
        return false;
    }

    // Check if the point is inside the outer ring.
    if (!rayCastPointInRing(testPoint, outerRing)) {
        return false;
    }

    // If there are inner rings (holes), ensure the point is not inside any of them.
    for (let i = 1; i < polygon.coordinates.length; i++) {
        const hole = polygon.coordinates[i];
        if (rayCastPointInRing(testPoint, hole)) {
            // The point is inside a hole – so it's not considered inside the polygon.
            return false;
        }
    }

    return true;
}

/**
 * Uses the ray-casting algorithm to determine if a point is inside a ring.
 *
 * @param {number[]} point - The point as [lon, lat].
 * @param {number[][]} ring - An array of positions forming a closed ring.
 * @returns {boolean} - True if the point is inside the ring, false otherwise.
 */
export function rayCastPointInRing(point, ring) {
    let inside = false;
    // Loop through each edge of the ring.
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0],
            yi = ring[i][1];
        const xj = ring[j][0],
            yj = ring[j][1];

        // Check if the ray from the point to the right intersects with the edge.
        const intersect = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;

        if (intersect) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * Wraps a coordinate's longitude to the range [-180, 180].
 *
 * @param {number[]} coord - An array [latitude, longitude].
 * @returns {number[]} A new coordinate array with a wrapped longitude.
 */
export function leafletWrapCoordinate(coord) {
    const [lat, lng] = coord;
    const wrappedLng = ((((lng + 180) % 360) + 360) % 360) - 180;
    return [lat, wrappedLng];
}

export function getCurrentLocationFromStorage() {
    const currentLocation = storage.getMap('_current_location');
    return currentLocation ? restoreFleetbasePlace(currentLocation) : null;
}

export function getLiveLocationLocationFromStorage() {
    const liveLocation = storage.getMap('_live_location');
    return liveLocation ? restoreFleetbasePlace(liveLocation) : null;
}

export function makeCoordinatesFloat(input) {
    // Helper to parse a single coordinate (array or object).
    function parseSingle(coord) {
        if (isArray(coord) && coord.length >= 2) {
            const latitude = parseFloat(coord[0]);
            const longitude = parseFloat(coord[1]);
            if (isNaN(latitude) || isNaN(longitude)) {
                throw new Error(`Invalid numeric values in coordinate array: ${JSON.stringify(coord)}`);
            }
            return { latitude, longitude };
        } else if (typeof coord === 'object' && coord !== null) {
            const newCoord = {};
            if ('latitude' in coord) {
                newCoord.latitude = parseFloat(coord.latitude);
            }
            if ('longitude' in coord) {
                newCoord.longitude = parseFloat(coord.longitude);
            }
            // Optionally include delta values if present (for regions)
            if ('latitudeDelta' in coord) {
                newCoord.latitudeDelta = parseFloat(coord.latitudeDelta);
            }
            if ('longitudeDelta' in coord) {
                newCoord.longitudeDelta = parseFloat(coord.longitudeDelta);
            }
            if (isNaN(newCoord.latitude) || isNaN(newCoord.longitude)) {
                throw new Error(`Invalid numeric values in coordinate object: ${JSON.stringify(coord)}`);
            }
            return newCoord;
        }
        throw new Error(`Unsupported coordinate format: ${JSON.stringify(coord)}`);
    }

    // If input is an array...
    if (isArray(input)) {
        // Check if it’s an array of coordinates.
        if (input.length === 0) {
            return input;
        }
        // If the first element is an object or an array (of at least 2 items),
        // assume it's an array of coordinates.
        const first = input[0];
        if ((isArray(first) && first.length >= 2) || (typeof first === 'object' && first !== null && 'latitude' in first)) {
            return input.map((coord) => parseSingle(coord));
        }
        // Otherwise, if the array itself has 2 items, assume it’s a single coordinate.
        if (input.length === 2) {
            return parseSingle(input);
        }
        throw new Error(`Array format not recognized for coordinates: ${JSON.stringify(input)}`);
    }

    // If input is an object, assume it's a single coordinate/region.
    if (typeof input === 'object' && input !== null) {
        return parseSingle(input);
    }

    throw new Error(`Unsupported type for coordinates: ${typeof input}`);
}
