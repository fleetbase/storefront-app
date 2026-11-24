import { formatDuration, productSummary, productVideos, stockLevel, youtubeVideoId } from '../../src/ui/product-display';

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
            outOfStock: false,
            lowStock: null,
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

    test('reads stock for stores that track it', () => {
        const inventory = { tracked: true, available_total: 5, locations: [{ location: 'store_location_1', available: 2, low: true }, { location: 'store_location_2', available: 3, low: true }] };
        expect(productSummary({ name: 'Latte', in_stock: false, inventory: { tracked: true, available_total: 0, locations: [] } })).toMatchObject({ available: false, outOfStock: true, lowStock: null });
        expect(productSummary({ name: 'Latte', in_stock: true, inventory })).toMatchObject({ available: true, outOfStock: false, lowStock: 5 });
        expect(productSummary({ name: 'Latte', is_available: false, in_stock: false })).toMatchObject({ available: false, outOfStock: false });
        expect(stockLevel({ in_stock: true, inventory }, 'store_location_1')).toEqual({ tracked: true, inStock: true, low: true, available: 2 });
        expect(stockLevel({ inventory: { ...inventory, locations: [{ location: { id: 'store_location_3' }, available: 0, low: false }] } }, 'store_location_3')).toMatchObject({ inStock: false, low: false, available: 0 });
        expect(stockLevel({ inventory: { tracked: true, available_total: 9, locations: [{ location: 'a', available: 2, low: true }, { location: 'b', available: 7, low: false }] } })).toMatchObject({ inStock: true, low: false, available: 9 });
        expect(stockLevel({ name: 'Untracked' })).toEqual({ tracked: false, inStock: true, low: false, available: null });
        expect(stockLevel({ in_stock: false })).toMatchObject({ tracked: false, inStock: false });
        expect(productSummary({ name: 'Clean', meta: { service: { duration_minutes: 45 } } }).durationMinutes).toBe(45);
    });

    test('reads the video id from every kind of YouTube link', () => {
        expect(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        expect(youtubeVideoId('https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
        expect(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ');
        expect(youtubeVideoId('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        expect(youtubeVideoId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        expect(youtubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ#chat')).toBe('dQw4w9WgXcQ');
        expect(youtubeVideoId(' youtu.be/dQw4w9WgXcQ ')).toBe('dQw4w9WgXcQ');
    });

    test('rejects links that are not a YouTube video', () => {
        expect(youtubeVideoId('')).toBeNull();
        expect(youtubeVideoId(null)).toBeNull();
        expect(youtubeVideoId('https://vimeo.com/123456789')).toBeNull();
        expect(youtubeVideoId('https://www.youtube.com/@fleetbase')).toBeNull();
        expect(youtubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
        expect(youtubeVideoId('https://evil.test/?u=https://youtu.be/dQw4w9WgXcQ')).toBeNull();
        expect(youtubeVideoId('https://notyoutube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    });

    test('lists a product\'s videos once each, skipping broken links', () => {
        const product = { youtube_urls: ['https://youtu.be/dQw4w9WgXcQ', '', null, 'not a link', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/shorts/aqz-KE-bpKQ'] };
        expect(productVideos(product)).toEqual([
            { id: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
            { id: 'aqz-KE-bpKQ', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', thumbnailUrl: 'https://img.youtube.com/vi/aqz-KE-bpKQ/hqdefault.jpg' },
        ]);
        expect(productVideos({ name: 'No videos' })).toEqual([]);
        expect(productVideos({ youtube_urls: 'https://youtu.be/dQw4w9WgXcQ' })).toEqual([]);
        expect(productVideos({ getAttribute: (key: string) => (key === 'youtube_urls' ? ['https://youtu.be/dQw4w9WgXcQ'] : null) })).toHaveLength(1);
    });
});
