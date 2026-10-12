import { formatDuration, productSummary } from '../../src/ui/product-display';

describe('product display', () => {
    test('summarises a product with its store', () => {
        expect(
            productSummary({
                id: 'product_roses',
                name: 'Garden rose bouquet',
                description: 'Roses',
                primary_image_url: 'https://flb-assets.s3.ap-southeast-1.amazonaws.com/images/fallback-placeholder-1.png',
                images: [null, 'https://cdn.test/roses.jpg'],
                price: '6800',
                sale_price: 5800,
                is_on_sale: true,
                currency: 'SGD',
                is_available: true,
                is_service: false,
                is_recommended: true,
                store: { id: 'store_bloom', name: 'Bloom & Co.' },
            })
        ).toEqual({
            id: 'product_roses',
            name: 'Garden rose bouquet',
            description: 'Roses',
            imageUrl: 'https://cdn.test/roses.jpg',
            price: 6800,
            salePrice: 5800,
            onSale: true,
            currency: 'SGD',
            available: true,
            isService: false,
            isBookable: false,
            durationMinutes: null,
            recommended: true,
            storeId: 'store_bloom',
            storeName: 'Bloom & Co.',
        });
    });

    test('ignores sales that are not cheaper and flags services and unavailable items', () => {
        const summary = productSummary({ name: 'Clean', price: 9600, sale_price: 9600, is_on_sale: true, is_service: true, is_bookable: true, is_available: false, store_id: 'store_sparkle' });
        expect(summary.onSale).toBe(false);
        expect(summary.salePrice).toBeNull();
        expect(summary.isService).toBe(true);
        expect(summary.isBookable).toBe(true);
        expect(summary.available).toBe(false);
        expect(summary.storeId).toBe('store_sparkle');
        expect(summary.imageUrl).toBeNull();
        expect(productSummary({ price: 'x' }).price).toBe(0);
    });

    test('reads a service duration from meta and formats it', () => {
        expect(productSummary({ name: 'Clean', meta: { duration: '180' } }).durationMinutes).toBe(180);
        expect(productSummary({ name: 'Shampoo', meta: { duration_minutes: 90 } }).durationMinutes).toBe(90);
        expect(productSummary({ name: 'Nothing', meta: { duration: -5 } }).durationMinutes).toBeNull();
        expect(formatDuration(45)).toBe('45 min');
        expect(formatDuration(180)).toBe('3 hr');
        expect(formatDuration(90)).toBe('1.5 hr');
        expect(formatDuration(100)).toBe('1.7 hr');
        expect(formatDuration(null)).toBeNull();
    });
});
