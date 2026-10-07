import { rememberStores, resetStoreNames, storeName, subscribeStoreNames, summarizeCart } from '../../src/network/store-names';

describe('store names', () => {
    beforeEach(() => resetStoreNames());

    test('remembers stores and notifies only on change', () => {
        const listener = jest.fn();
        const unsubscribe = subscribeStoreNames(listener);

        rememberStores([{ id: 'store_a', name: 'Bloom', logoUrl: null }, { id: null, name: 'No id', logoUrl: null }, { id: 'store_b', name: '', logoUrl: null }]);
        rememberStores([{ id: 'store_a', name: 'Bloom', logoUrl: null }]);
        rememberStores([{ id: 'store_a', name: 'Bloom & Co.', logoUrl: 'https://cdn.test/logo.png' }]);
        unsubscribe();
        rememberStores([{ id: 'store_c', name: 'Volt', logoUrl: null }]);

        expect(listener).toHaveBeenCalledTimes(2);
        expect(storeName('store_a')).toEqual({ name: 'Bloom & Co.', logoUrl: 'https://cdn.test/logo.png' });
        expect(storeName('store_b')).toBeNull();
        expect(storeName(undefined)).toBeNull();
        expect(storeName('store_c')?.name).toBe('Volt');
    });

    test('summarises cart items by count, subtotal and store order', () => {
        expect(
            summarizeCart([
                { quantity: 2, subtotal: 4000, store_id: 'store_b', currency: 'SGD' },
                { quantity: '1', subtotal: '2200', store_id: 'store_a' },
                { quantity: -3, subtotal: 'x', store_id: 'store_b' },
                { quantity: 1, subtotal: 100, store_id: 42 },
            ])
        ).toEqual({ count: 4, subtotal: 6300, currency: 'SGD', storeIds: ['store_b', 'store_a'] });
        expect(summarizeCart([], 'USD')).toEqual({ count: 0, subtotal: 0, currency: 'USD', storeIds: [] });
        expect(summarizeCart([{ quantity: 1, subtotal: 1 }]).currency).toBeNull();
    });
});
