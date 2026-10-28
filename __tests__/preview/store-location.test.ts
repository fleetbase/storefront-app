const mockSetMap = jest.fn();

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('@react-native-community/geolocation', () => ({ setRNConfiguration: jest.fn(), getCurrentPosition: jest.fn() }));
jest.mock('react-native-event-listeners', () => ({ EventRegister: { emit: jest.fn() } }));
jest.mock('react-native-permissions', () => ({}));
jest.mock('@fleetbase/storefront', () => ({ StoreLocation: class {} }));
jest.mock('../../src/hooks/use-storefront', () => ({ adapter: {} }));
jest.mock('../../src/hooks/use-fleetbase', () => ({ adapter: {} }));
jest.mock('../../src/utils/localize', () => ({ getLocale: () => 'en' }));
jest.mock('../../src/utils/storage', () => ({ __esModule: true, default: { setMap: (...args: any[]) => mockSetMap(...args) } }), { virtual: true });
jest.mock('../../src/utils', () => ({
    config: () => undefined,
    isArray: Array.isArray,
    isObject: (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value),
    isEmpty: (value: unknown) => value == null,
    uniqueArray: (array: unknown[]) => [...new Set(array)],
    isResource: () => false,
    isSerializedResource: () => false,
    isPojoResource: () => false,
}));

import { setCurrentLocationToStore } from '../../src/utils/location';

const orchard = {
    id: 'place_scyhkiu6kc',
    uuid: 'b5e0c9a2',
    public_id: 'place_scyhkiu6kc',
    name: 'ORCHARD GROCERS',
    street1: '2 ORCHARD TURN',
    city: 'SINGAPORE',
    country: 'SG',
    location: { type: 'Point', coordinates: [103.8318, 1.304] },
};
const storeWith = (locations: any[]) => ({ getLocations: async () => locations });

beforeEach(() => {
    mockSetMap.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
});

describe('a hosted preview starting at the store', () => {
    it("saves the store's first location as the current location, without the place's ids", async () => {
        const place = await setCurrentLocationToStore(storeWith([{ getAttribute: (key: string) => (key === 'place' ? orchard : undefined) }]));

        expect(place).not.toBeNull();
        expect(mockSetMap).toHaveBeenCalledTimes(1);
        const [key, saved] = mockSetMap.mock.calls[0];
        expect(key).toBe('_current_location');
        expect(saved).toMatchObject({ name: 'ORCHARD GROCERS', street1: '2 ORCHARD TURN', location: { type: 'Point', coordinates: [103.8318, 1.304] } });
        expect(saved).not.toHaveProperty('public_id');
        expect(saved.id ?? null).toBeNull();
    });

    it('saves nothing for a store without a location, or one whose locations fail to load', async () => {
        expect(await setCurrentLocationToStore(storeWith([]))).toBeNull();
        expect(await setCurrentLocationToStore({ getLocations: async () => Promise.reject(new Error('offline')) })).toBeNull();
        expect(await setCurrentLocationToStore(null)).toBeNull();
        expect(mockSetMap).not.toHaveBeenCalled();
    });
});
