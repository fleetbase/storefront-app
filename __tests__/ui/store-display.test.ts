import { attr, storeHours, storeSummary, usableImageUrl } from '../../src/ui/store-display';

const t = (key: string, params: Record<string, unknown> = {}) => `${key}${Object.keys(params).length ? JSON.stringify(params) : ''}`;
const tuesday10am = new Date(2026, 9, 6, 10, 0);

const resource = (attributes: Record<string, any>) => ({ getAttribute: (key: string) => attributes[key] });

describe('store display', () => {
    test('reads attributes from SDK resources and plain objects', () => {
        expect(attr(resource({ name: 'Bloom' }), 'name')).toBe('Bloom');
        expect(attr(resource({ name: null }), 'name', 'fallback')).toBe('fallback');
        expect(attr({ category: { name: 'Flowers' } }, 'category.name')).toBe('Flowers');
        expect(attr({ category: null }, 'category.name', 'none')).toBe('none');
        expect(attr(null, 'name', 'x')).toBe('x');
    });

    test('treats generic placeholder images as missing', () => {
        expect(usableImageUrl('https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/image-file-icon.png')).toBeNull();
        expect(usableImageUrl('https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/default-storefront-backdrop.png')).toBeNull();
        expect(usableImageUrl('  ')).toBeNull();
        expect(usableImageUrl(42)).toBeNull();
        expect(usableImageUrl('https://cdn.test/bloom.png')).toBe('https://cdn.test/bloom.png');
    });

    test('uses the hours of the first location that has any', () => {
        expect(storeHours({ locations: [{ hours: [] }, { hours: [{ day: 'Monday', start: '09:00', end: '17:00' }] }] })).toHaveLength(1);
        expect(storeHours({ locations: 'nope' })).toEqual([]);
        expect(storeHours({})).toEqual([]);
    });

    test('summarises a store for cards and headers', () => {
        const summary = storeSummary(
            {
                id: 'store_bloom',
                name: 'Bloom & Co.',
                description: 'Flowers',
                logo_url: 'https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/image-file-icon.png',
                backdrop_url: 'https://cdn.test/backdrop.jpg',
                rating: '4.83',
                category: { name: 'Flowers & gifts' },
                distance: 1234,
                online: true,
                tags: ['Services', 7],
                locations: [{ hours: [{ day: 'Tuesday', start: '09:00', end: '20:00' }] }],
            },
            { now: tuesday10am, t }
        );

        expect(summary).toEqual({
            id: 'store_bloom',
            name: 'Bloom & Co.',
            description: 'Flowers',
            logoUrl: null,
            backdropUrl: 'https://cdn.test/backdrop.jpg',
            rating: 4.8,
            category: 'Flowers & gifts',
            distance: '1.2 km',
            status: { state: 'open', allDay: false, closesAt: 1200 },
            statusText: 'UI.openClosesAt{"time":"8 pm"}',
            utcOffset: null,
            muted: false,
            bookable: true,
            tags: ['Services'],
        });
    });

    test('reads the hours on the store clock when the store sends its offset', () => {
        // Tuesday 6 October 2026, 23:30 UTC: Wednesday 7:30 am in Singapore, Tuesday 6:30 pm in New York.
        const now = new Date(Date.UTC(2026, 9, 6, 23, 30));
        const locations = [{ hours: ['Tuesday', 'Wednesday'].map((day) => ({ day, start: '09:00', end: '20:00' })) }];
        const singapore = storeSummary({ utc_offset: 480, locations }, { now, t });
        expect(singapore.utcOffset).toBe(480);
        expect(singapore.status).toEqual({ state: 'closed', opensAt: 540, opensInDays: 0, opensOn: 'Wednesday' });
        expect(storeSummary(resource({ utc_offset: '-240', locations }), { now, t }).status).toEqual({ state: 'open', allDay: false, closesAt: 1200 });
        expect(storeSummary({ utc_offset: 'soon', locations }, { now, t }).utcOffset).toBeNull();
    });

    test('mutes offline stores and leaves unknown details empty', () => {
        const summary = storeSummary(resource({ name: 'Volt', online: false, rating: 0, category: 'Electronics' }), { t });
        expect(summary.muted).toBe(true);
        expect(summary.statusText).toBe('UI.notAcceptingOrders');
        expect(summary.rating).toBeNull();
        expect(summary.category).toBe('Electronics');
        expect(summary.distance).toBeNull();
        expect(summary.bookable).toBe(false);
        expect(storeSummary({}, { t }).name).toBe('');
        expect(storeSummary({}, { t }).id).toBeNull();
    });
});

describe('category icons', () => {
    const { categoryIcon } = require('../../src/ui/category-icons');
    const icons = require('@fortawesome/free-solid-svg-icons');

    test.each([
        ['Groceries', icons.faBasketShopping],
        ['Electronics', icons.faLaptop],
        ['Flowers & gifts', icons.faSeedling],
        ['Home cleaning', icons.faBroom],
        ['Health & Beauty', icons.faSpa],
        ['Pharmacy', icons.faHeartPulse],
        ['Хүнсний дэлгүүр', icons.faBasketShopping],
        ['Something else', icons.faTag],
        [null, icons.faTag],
    ])('%p uses the matching icon', (name, icon) => {
        expect(categoryIcon(name)).toBe(icon);
    });

    test('server fallback placeholders count as missing images', () => {
        expect(usableImageUrl('https://flb-assets.s3.ap-southeast-1.amazonaws.com/images/fallback-placeholder-1.png')).toBeNull();
    });
});
