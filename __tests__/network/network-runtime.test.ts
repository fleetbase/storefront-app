import {
    canCombineNetworkCart,
    buildNetworkStoreQuery,
    getNetworkCartDecision,
    getCartOriginIds,
    getCartQuoteOrigin,
    getScopedStorageKey,
    getLocationFallbackState,
    getNetworkLocationCoordinates,
    getMappableNetworkLocations,
    getStorefrontMode,
    getStorefrontRoute,
    getStorefrontStorageScope,
    groupCartItemsByStore,
    mergeNetworkPage,
    shouldAcceptNetworkRequest,
    totalCartQuantity,
} from '../../src/network/network-runtime';

describe('network runtime contracts', () => {
    it('discriminates owner mode and boot route', () => {
        expect(getStorefrontMode({ is_network: true })).toBe('network');
        expect(getStorefrontRoute({ is_network: true })).toBe('NetworkNavigator');
        expect(getStorefrontMode({ is_store: true })).toBe('store');
        expect(getStorefrontRoute({ is_store: true })).toBe('StoreNavigator');
    });

    it('scopes cached state without persisting a complete storefront key', () => {
        const key = `network_${'a'.repeat(32)}`;
        const bootstrapScope = getStorefrontStorageScope(key);
        expect(bootstrapScope).toMatch(/^network-[a-z0-9]+$/);
        expect(bootstrapScope).not.toContain(key);
        expect(bootstrapScope).not.toContain('aaaa');
        expect(getScopedStorageKey('network_public', 'locations', 'store_public')).toBe('storefront:network_public:store_public:locations');
    });

    it('keeps persisted storage scopes stable across renames', () => {
        // These values key data already persisted on devices; changing them orphans carts and cached state.
        expect(getStorefrontStorageScope(`network_${'a'.repeat(32)}`)).toBe('network-dpaesf');
        expect(getStorefrontStorageScope(`store_${'b'.repeat(32)}`)).toBe('store-m123mi');
        expect(getStorefrontStorageScope(`network_${'a'.repeat(32)}`, 'network_owner')).toBe('network_owner');
    });

    it('implements deterministic single and multi merchant cart policy', () => {
        const items = [{ store_id: 'store_one', quantity: 2 }];
        expect(getNetworkCartDecision(items, 'store_one', false)).toBe('add');
        expect(getNetworkCartDecision(items, 'store_two', false)).toBe('replace');
        expect(getNetworkCartDecision(items, 'store_two', true)).toBe('add');
        expect(totalCartQuantity(items)).toBe(2);
        expect(Object.keys(groupCartItemsByStore([...items, { store_id: 'store_two', quantity: 1 }]))).toEqual(['store_one', 'store_two']);
    });

    it('rejects incomplete or mixed-currency multi-store carts', () => {
        expect(canCombineNetworkCart([{ store_id: 'one', store_location_id: 'loc_one', currency: 'USD' }])).toBe(true);
        expect(canCombineNetworkCart([{ store_id: 'one', store_location_id: null, currency: 'USD' }])).toBe(false);
        expect(canCombineNetworkCart([
            { store_id: 'one', store_location_id: 'loc_one', currency: 'USD' },
            { store_id: 'two', store_location_id: 'loc_two', currency: 'EUR' },
        ])).toBe(false);
    });

    it('prepares every unique checkout origin without collapsing multi-store carts', () => {
        const cart = {
            contents: () => [
                { store_location_id: 'location_one' },
                { store_location_id: 'location_two' },
                { store_location_id: 'location_one' },
            ],
        };
        expect(getCartOriginIds(cart)).toEqual(['location_one', 'location_two']);
        expect(getCartQuoteOrigin(cart)).toEqual(['location_one', 'location_two']);
    });

    it('builds discovery filters and preserves deterministic pagination', () => {
        const query = buildNetworkStoreQuery({
            query: ' coffee ',
            category: 'category_drinks',
            tags: ['open-late'],
            sort: 'popular',
            online: true,
            maximumDistance: 5000,
            offset: 0,
        }, 20, '47.91,106.91');
        expect(query).toEqual({
            limit: 20,
            offset: 20,
            sort: 'popular',
            query: 'coffee',
            category: 'category_drinks',
            tagged: ['open-late'],
            online: true,
            maximum_distance: 5000,
            location: '47.91,106.91',
        });
        expect(mergeNetworkPage([{ id: 'one' }], [{ id: 'one' }, { id: 'two' }], true)).toEqual([{ id: 'one' }, { id: 'two' }]);
    });

    it('filters invalid map coordinates and keeps a usable manual-location fallback', () => {
        const resourceLocation = { id: 'resource', getAttribute: (key: string) => ({ latitude: 47.9, longitude: 106.9 })[key] };
        expect(getMappableNetworkLocations([
            { id: 'valid', latitude: 47.9, longitude: 106.9 },
            resourceLocation,
            { id: 'invalid', latitude: null, longitude: 'not-a-number' },
        ])).toHaveLength(2);
        expect(getNetworkLocationCoordinates(resourceLocation)).toEqual({ latitude: 47.9, longitude: 106.9 });
        expect(getLocationFallbackState('blocked', false)).toBe('manual');
        expect(getLocationFallbackState('denied', true)).toBe('ready');
        expect(getLocationFallbackState('undetermined', false)).toBe('request');
    });

    it('rejects stale discovery and search responses', () => {
        expect(shouldAcceptNetworkRequest(4, 5)).toBe(false);
        expect(shouldAcceptNetworkRequest(5, 5)).toBe(true);
    });
});
