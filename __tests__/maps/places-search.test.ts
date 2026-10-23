const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('axios', () => ({ __esModule: true, default: { get: (...args: any[]) => mockGet(...args), post: (...args: any[]) => mockPost(...args) } }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('@react-native-community/geolocation', () => ({ setRNConfiguration: jest.fn(), getCurrentPosition: jest.fn() }));
jest.mock('react-native-event-listeners', () => ({ EventRegister: { emit: jest.fn() } }));
jest.mock('react-native-permissions', () => ({}));
jest.mock('@fleetbase/sdk', () => ({ GoogleAddress: class {}, Place: class {}, Point: class {} }));
jest.mock('@fleetbase/storefront', () => ({ StoreLocation: class {} }));
jest.mock('../../src/hooks/use-storefront', () => ({ adapter: {} }));
jest.mock('../../src/hooks/use-fleetbase', () => ({ adapter: {} }));
jest.mock('../../src/utils/localize', () => ({ getLocale: () => 'en' }));
jest.mock('../../src/utils/storage', () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock('../../src/utils', () => ({
    config: (key: string) => (key === 'GOOGLE_MAPS_API_KEY' ? 'test-key' : undefined),
    isArray: Array.isArray,
    isObject: (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value),
    isEmpty: (value: unknown) => value == null || (Array.isArray(value) && value.length === 0),
    uniqueArray: (array: unknown[]) => [...new Set(array)],
    isResource: () => false,
    isSerializedResource: () => false,
    isPojoResource: () => false,
}));

import { geocodeAutocomplete, getPlaceDetails } from '../../src/utils/location';

beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
});

describe('address search', () => {
    it('searches Places API (New) and keeps the prediction shape, sharing one session with the details call', async () => {
        mockPost.mockResolvedValue({ data: { suggestions: [{ placePrediction: { placeId: 'p1', text: { text: '350 5th Ave, New York, NY 10118, USA' } } }] } });
        const predictions = await geocodeAutocomplete('350 5th', [40.7, -73.9]);

        const [url, body, options] = mockPost.mock.calls[0];
        expect(url).toBe('https://places.googleapis.com/v1/places:autocomplete');
        expect(body).toMatchObject({ input: '350 5th', languageCode: 'en', locationBias: { circle: { center: { latitude: 40.7, longitude: -73.9 }, radius: 5000 } } });
        expect(options.headers['X-Goog-Api-Key']).toBe('test-key');
        expect(predictions).toEqual([
            expect.objectContaining({ description: '350 5th Ave, New York, NY 10118, USA', place_id: 'p1', street: '350 5th Ave', postalCode: '10118', country: 'USA' }),
        ]);

        mockGet.mockResolvedValue({ data: { id: 'p1', formattedAddress: '350 5th Ave', location: { latitude: 40.748, longitude: -73.985 }, addressComponents: [] } });
        const details = await getPlaceDetails('p1');
        expect(mockGet.mock.calls[0][0]).toBe('https://places.googleapis.com/v1/places/p1');
        expect(mockGet.mock.calls[0][1].params.sessionToken).toBe(body.sessionToken);
        expect(mockGet.mock.calls[0][1].headers['X-Goog-FieldMask']).toBe('id,displayName,formattedAddress,location,types,addressComponents');
        expect(details).toMatchObject({ place_id: 'p1', geometry: { location: { lat: 40.748, lng: -73.985 } }, address_components: [] });

        // The session ended with the details call; the next search starts a new one.
        await geocodeAutocomplete('Main St');
        expect(mockPost.mock.calls[1][1].sessionToken).not.toBe(body.sessionToken);
    });

    it('falls back to the Geocoding API on the phone when Places API (New) fails', async () => {
        mockPost.mockRejectedValue(new Error('403'));
        mockGet.mockResolvedValue({ data: { results: [{ formatted_address: '1 Main St, Boston, MA 02108, USA', place_id: 'g1' }] } });

        const predictions = await geocodeAutocomplete('1 Main', [42.3, -71]);
        expect(mockGet.mock.calls[0][0]).toBe('https://maps.googleapis.com/maps/api/geocode/json');
        expect(mockGet.mock.calls[0][1].params).toMatchObject({ address: '1 Main', key: 'test-key' });
        expect(predictions).toEqual([expect.objectContaining({ description: '1 Main St, Boston, MA 02108, USA', place_id: 'g1' })]);
    });

    it('looks the place up through the Geocoding API when place details fail', async () => {
        const geocoded = { formatted_address: '1 Main St', place_id: 'g1', geometry: { location: { lat: 1, lng: 2 } }, address_components: [] };
        mockGet.mockImplementation((url: string) => (url.includes('places.googleapis.com') ? Promise.reject(new Error('403')) : Promise.resolve({ data: { results: [geocoded] } })));

        expect(await getPlaceDetails('g1')).toEqual(geocoded);
        expect(mockGet.mock.calls[1][1].params).toEqual({ place_id: 'g1', key: 'test-key' });
    });
});
