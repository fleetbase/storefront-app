import {
    autocompleteRequestBody,
    computeRoutesRequestBody,
    decodePolyline,
    googleHeaders,
    googleUrl,
    isRoutePoint,
    placeDetailsFromPlace,
    placeDetailsUrl,
    predictionsFromAutocomplete,
    routeFromComputeRoutes,
} from '../../src/utils/google-maps';

describe('decodePolyline', () => {
    it('decodes the example from Google’s polyline algorithm page', () => {
        expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
            { latitude: 38.5, longitude: -120.2 },
            { latitude: 40.7, longitude: -120.95 },
            { latitude: 43.252, longitude: -126.453 },
        ]);
    });

    it('returns no points for an empty or cut-off string', () => {
        expect(decodePolyline('')).toEqual([]);
        expect(decodePolyline('_p~iF')).toEqual([]);
    });
});

describe('Places API (New)', () => {
    it('sends the key and field mask as headers', () => {
        expect(googleHeaders('key-1', 'id,location')).toEqual({ 'Content-Type': 'application/json', 'X-Goog-Api-Key': 'key-1', 'X-Goog-FieldMask': 'id,location' });
        expect(placeDetailsUrl('ChIJ abc/1')).toBe('https://places.googleapis.com/v1/places/ChIJ%20abc%2F1');
    });

    it('biases autocomplete toward the customer within 5 km', () => {
        expect(autocompleteRequestBody('Peace Ave', { languageCode: 'mn', coordinates: [47.9, 106.9], sessionToken: 'tok' })).toEqual({
            input: 'Peace Ave',
            languageCode: 'mn',
            locationBias: { circle: { center: { latitude: 47.9, longitude: 106.9 }, radius: 5000 } },
            sessionToken: 'tok',
        });
        expect(autocompleteRequestBody('Peace Ave', { coordinates: null })).toEqual({ input: 'Peace Ave' });
        expect(autocompleteRequestBody('Peace Ave', { coordinates: [Number.NaN, 1] })).toEqual({ input: 'Peace Ave' });
    });

    it('turns suggestions into legacy predictions', () => {
        const predictions = predictionsFromAutocomplete({
            suggestions: [
                { placePrediction: { placeId: 'p1', text: { text: '1600 Amphitheatre Pkwy, Mountain View, CA, USA' } } },
                { queryPrediction: { text: { text: 'pizza near me' } } },
                { placePrediction: { placeId: 'p2' } },
            ],
        });
        expect(predictions).toEqual([{ description: '1600 Amphitheatre Pkwy, Mountain View, CA, USA', place_id: 'p1' }]);
        expect(predictionsFromAutocomplete({})).toEqual([]);
        expect(predictionsFromAutocomplete(null)).toEqual([]);
    });

    it('turns a place into legacy place details', () => {
        const details = placeDetailsFromPlace({
            id: 'p1',
            displayName: { text: 'Googleplex', languageCode: 'en' },
            formattedAddress: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
            location: { latitude: 37.422, longitude: -122.084 },
            types: ['establishment'],
            addressComponents: [
                { longText: '1600', shortText: '1600', types: ['street_number'] },
                { longText: 'California', shortText: 'CA', types: ['administrative_area_level_1', 'political'] },
            ],
        });
        expect(details).toEqual({
            place_id: 'p1',
            name: 'Googleplex',
            formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
            types: ['establishment'],
            geometry: { location: { lat: 37.422, lng: -122.084 } },
            address_components: [
                { long_name: '1600', short_name: '1600', types: ['street_number'] },
                { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1', 'political'] },
            ],
        });
    });

    it('keeps missing parts empty', () => {
        expect(placeDetailsFromPlace({ id: 'p1' })).toEqual({ place_id: 'p1', name: null, formatted_address: '', types: [], geometry: null, address_components: [] });
        expect(placeDetailsFromPlace(null)).toBeNull();
    });
});

describe('Routes API', () => {
    it('builds a driving route request with stops in between', () => {
        expect(computeRoutesRequestBody({ latitude: 1, longitude: 2 }, '10 Downing St, London', { waypoints: [{ latitude: 3, longitude: 4 }, { latitude: null } as any] })).toEqual({
            origin: { location: { latLng: { latitude: 1, longitude: 2 } } },
            destination: { address: '10 Downing St, London' },
            intermediates: [{ location: { latLng: { latitude: 3, longitude: 4 } } }],
            travelMode: 'DRIVE',
            polylineEncoding: 'ENCODED_POLYLINE',
        });
        expect(computeRoutesRequestBody({ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }, { mode: 'WALKING' }).travelMode).toBe('WALK');
    });

    it('reads the route in kilometres and minutes', () => {
        const route = routeFromComputeRoutes({ routes: [{ polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC' }, distanceMeters: 12500, duration: '930s' }] });
        expect(route).toEqual({
            coordinates: [
                { latitude: 38.5, longitude: -120.2 },
                { latitude: 40.7, longitude: -120.95 },
            ],
            distance: 12.5,
            duration: 15.5,
        });
        expect(routeFromComputeRoutes({})).toBeNull();
        expect(routeFromComputeRoutes({ routes: [{ duration: '1s' }] })).toBeNull();
    });

    it('only accepts complete stops', () => {
        expect(isRoutePoint({ latitude: 0, longitude: 0 })).toBe(true);
        expect(isRoutePoint({ latitude: '47.9', longitude: '106.9' })).toBe(true);
        expect(isRoutePoint('Ulaanbaatar')).toBe(true);
        expect(isRoutePoint({ latitude: null, longitude: 1 })).toBe(false);
        expect(isRoutePoint({ latitude: Number.NaN, longitude: 1 })).toBe(false);
        expect(isRoutePoint(' ')).toBe(false);
        expect(isRoutePoint(undefined)).toBe(false);
    });
});

describe('googleUrl', () => {
    it('leaves Google URLs alone without a proxy', () => {
        expect(googleUrl('https://places.googleapis.com/v1/places:autocomplete')).toBe('https://places.googleapis.com/v1/places:autocomplete');
        expect(googleUrl('https://places.googleapis.com/v1/places:autocomplete', '')).toBe('https://places.googleapis.com/v1/places:autocomplete');
    });

    it('sends each Google service to its own path under the proxy', () => {
        const proxy = 'https://preview.example.com/p/tok/google/';
        expect(googleUrl('https://maps.googleapis.com/maps/api/geocode/json', proxy)).toBe('https://preview.example.com/p/tok/google/maps/maps/api/geocode/json');
        expect(googleUrl('https://places.googleapis.com/v1/places:autocomplete', proxy)).toBe('https://preview.example.com/p/tok/google/places/v1/places:autocomplete');
        expect(googleUrl(placeDetailsUrl('ChIJ abc'), proxy)).toBe('https://preview.example.com/p/tok/google/places/v1/places/ChIJ%20abc');
        expect(googleUrl('https://routes.googleapis.com/directions/v2:computeRoutes', proxy)).toBe('https://preview.example.com/p/tok/google/routes/directions/v2:computeRoutes');
    });

    it('never proxies anything but those Google services', () => {
        expect(googleUrl('https://example.com/maps/api', 'https://proxy.test')).toBe('https://example.com/maps/api');
        expect(googleUrl('https://evil.googleapis.com/x', 'https://proxy.test')).toBe('https://evil.googleapis.com/x');
    });
});
