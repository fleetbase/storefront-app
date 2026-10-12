import { cartGroups, cartLine, cartTotals, checkoutBlock, describeLineOptions } from '../../src/ui/cart-display';

const item = (overrides: Record<string, any> = {}) => ({
    id: 'line_1',
    product_id: 'product_1',
    name: 'Garden rose bouquet',
    quantity: 2,
    price: 7200,
    subtotal: 14400,
    variants: [{ id: 'v1', name: 'Classic, 12 stems' }],
    addons: [{ id: 'a1', name: 'Kraft paper' }, 'Greeting card', { id: 'a3' }],
    store_id: 'store_bloom',
    store_location_id: 'loc_1',
    product_image_url: 'https://cdn.test/roses.jpg',
    scheduled_at: null,
    store: { id: 'store_bloom', name: 'Bloom & Co.', logo_url: 'https://cdn.test/static/image-file-icon.png', online: true },
    ...overrides,
});

describe('cart display', () => {
    test('describes chosen options', () => {
        expect(describeLineOptions(item())).toBe('Classic, 12 stems · Kraft paper · Greeting card');
        expect(describeLineOptions({ variants: [], addons: null })).toBeNull();
    });

    test('maps a cart item to a line', () => {
        expect(cartLine(item())).toEqual({
            id: 'line_1',
            productId: 'product_1',
            name: 'Garden rose bouquet',
            quantity: 2,
            unitPrice: 7200,
            lineTotal: 14400,
            imageUrl: 'https://cdn.test/roses.jpg',
            options: 'Classic, 12 stems · Kraft paper · Greeting card',
            storeId: 'store_bloom',
            storeLocationId: 'loc_1',
            scheduledAt: null,
        });
        const sparse = cartLine({ id: 9, quantity: '0', price: '3.50', product_image_url: 'https://x/static/image-file-icon.png', store: { id: 'store_x' } });
        expect(sparse).toMatchObject({ id: '9', quantity: 0, unitPrice: 3.5, lineTotal: 0, imageUrl: null, storeId: 'store_x', productId: null, storeLocationId: null });
    });

    test('groups lines by store with subtotals and minimum progress', () => {
        const groups = cartGroups(
            [
                item(),
                item({ id: 'line_2', name: 'Candle', quantity: 1, subtotal: 2200, variants: [], addons: [] }),
                item({ id: 'line_3', name: 'Home clean', quantity: 1, subtotal: 9600, store_id: 'store_clean', store: { name: 'Sparkle', online: false }, store_location_id: null }),
                item({ id: 'line_4', quantity: 0 }),
                item({ id: '', quantity: 1 }),
            ],
            { store_bloom: { name: 'Bloom & Co. (lookup)', minimum: 20000, logoUrl: 'https://cdn.test/bloom.png' } }
        );

        expect(groups).toHaveLength(2);
        expect(groups[0]).toMatchObject({ storeId: 'store_bloom', name: 'Bloom & Co. (lookup)', logoUrl: 'https://cdn.test/bloom.png', itemCount: 3, subtotal: 16600, minimum: 20000, remaining: 3400, progress: 83, belowMinimum: true, open: true, missingLocation: false });
        expect(groups[1]).toMatchObject({ storeId: 'store_clean', name: 'Sparkle', logoUrl: null, minimum: 0, remaining: 0, progress: 100, belowMinimum: false, open: false, missingLocation: true });
        expect(cartTotals(groups)).toEqual({ itemCount: 4, storeCount: 2, subtotal: 26200 });
        expect(cartGroups(null)).toEqual([]);
    });

    test('lines without a store group together but do not count as a store', () => {
        const groups = cartGroups([item({ store_id: undefined, store: undefined })], { store: { open: false } });
        expect(groups[0]).toMatchObject({ storeId: 'store', name: null, open: false });
        expect(cartTotals(groups).storeCount).toBe(0);
    });

    test('names the first reason checkout is blocked', () => {
        const [bloom, clean] = cartGroups([item(), item({ id: 'line_3', store_id: 'store_clean', store: { name: 'Sparkle' }, store_location_id: null })], { store_bloom: { minimum: 20000 } });
        expect(checkoutBlock([bloom, clean])).toEqual({ reason: 'location', storeId: 'store_clean', storeName: 'Sparkle' });
        expect(checkoutBlock([bloom, clean], { requireLocation: false })).toEqual({ reason: 'minimum', storeId: 'store_bloom', storeName: 'Bloom & Co.', remaining: 5600 });
        expect(checkoutBlock([{ ...bloom, open: false }, clean])).toEqual({ reason: 'closed', storeId: 'store_bloom', storeName: 'Bloom & Co.' });
        expect(checkoutBlock([{ ...bloom, belowMinimum: false }])).toBeNull();
    });
});
