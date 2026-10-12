import { describeSchedule, featuredOffer, fetchOffer, fetchOffers, groupOffers, offerBadge, offerStoreId, parseOffer } from '../../src/commerce/offers';

const money = (amount: number) => `$${(amount / 100).toFixed(2)}`;
const now = new Date('2026-10-07T10:00:00Z');

const base = {
    id: 'promo_1',
    name: 'Weekday flowers',
    description: '10% off bouquets.',
    image_url: 'https://cdn.test/flowers.jpg',
    type: 'percentage',
    value: 10,
    max_discount_amount: 1500,
    currency: 'SGD',
    min_subtotal: 3000,
    min_items: null,
    first_order_only: false,
    usage_limit_per_customer: 2,
    stackable: true,
    trigger: 'automatic',
    code: null,
    availability: 'live',
    next_starts_at: null,
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: '2026-10-31T00:00:00Z',
    schedule: [{ days: [1, 2, 3, 4, 5], start: '14:00', end: '17:00' }, null],
    timezone: 'Asia/Singapore',
    owner: { type: 'store', id: 'store_bloom', name: 'Bloom & Co.', logo_url: null },
    applies_to: { categories: ['category_flowers'], exclude_products: ['product_hamper', 7] },
};

describe('offers', () => {
    test('parses a public promotion', () => {
        const offer = parseOffer(base);
        expect(offer).toMatchObject({
            id: 'promo_1',
            type: 'percentage',
            value: 10,
            maxDiscount: 1500,
            minSubtotal: 3000,
            minItems: null,
            perCustomerLimit: 2,
            stackable: true,
            trigger: 'automatic',
            code: null,
            availability: 'live',
            schedule: [{ days: [1, 2, 3, 4, 5], start: '14:00', end: '17:00' }],
            owner: { type: 'store', id: 'store_bloom', name: 'Bloom & Co.', logoUrl: null },
            appliesTo: { products: [], stores: [], categories: ['category_flowers'], excludeProducts: ['product_hamper'], excludeCategories: [] },
            bogo: null,
        });
        const sparse = parseOffer({ id: 'p', type: 'mystery', availability: 'unknown', code: 'SAVE', owner: { type: 'person', id: 'x' }, schedule: [{ days: [0, 8, 3] }, {}], image_url: '' });
        expect(sparse).toMatchObject({ type: 'percentage', availability: 'live', trigger: 'code', code: 'SAVE', owner: null, imageUrl: null, description: null });
        expect(sparse.schedule).toEqual([{ days: [3], start: '00:00', end: '24:00' }, { days: [1, 2, 3, 4, 5, 6, 7], start: '00:00', end: '24:00' }]);
        expect(parseOffer({ type: 'bogo', bogo_config: { buy_quantity: 2, get_quantity: 1 } }).bogo).toEqual({ buy: 2, get: 1 });
        expect(parseOffer({ type: 'bogo' }).bogo).toEqual({ buy: 1, get: 1 });
        expect(parseOffer(null).id).toBe('');
    });

    test('badges each offer type', () => {
        expect(offerBadge(parseOffer(base), money)).toBe('10%');
        expect(offerBadge(parseOffer({ type: 'fixed_amount', value: 800 }), money)).toBe('$8');
        expect(offerBadge(parseOffer({ type: 'fixed_amount', value: 850 }), money)).toBe('$8.50');
        expect(offerBadge(parseOffer({ type: 'free_delivery' }), money, 'FREE')).toBe('FREE');
        expect(offerBadge(parseOffer({ type: 'bogo', bogo_config: { buy_quantity: 2, get_quantity: 1 } }), money)).toBe('2+1');
    });

    test('groups offers by urgency and features one', () => {
        const offers = [
            parseOffer({ ...base, id: 'later', ends_at: null }),
            parseOffer({ ...base, id: 'soon', ends_at: '2026-10-08T10:00:00Z' }),
            parseOffer({ ...base, id: 'sooner', ends_at: '2026-10-07T20:00:00Z', image_url: null }),
            parseOffer({ ...base, id: 'upcoming2', availability: 'scheduled', next_starts_at: '2026-10-09T06:00:00Z' }),
            parseOffer({ ...base, id: 'upcoming1', availability: 'scheduled', next_starts_at: '2026-10-07T14:00:00Z' }),
            parseOffer({ ...base, id: 'upcoming3', availability: 'scheduled' }),
            parseOffer({ ...base, id: 'ended', availability: 'ended' }),
        ];
        const groups = groupOffers(offers, now);
        expect(groups.endingSoon.map((offer) => offer.id)).toEqual(['sooner', 'soon']);
        expect(groups.ongoing.map((offer) => offer.id)).toEqual(['later']);
        expect(groups.upcoming.map((offer) => offer.id)).toEqual(['upcoming1', 'upcoming2', 'upcoming3']);

        expect(featuredOffer([...offers, parseOffer({ ...base, id: 'first', first_order_only: true })])?.id).toBe('first');
        expect(featuredOffer([parseOffer({ ...base, id: 'plain', image_url: null }), parseOffer({ ...base, id: 'pic' })])?.id).toBe('pic');
        expect(featuredOffer([parseOffer({ ...base, id: 'plain', image_url: null })])?.id).toBe('plain');
        expect(featuredOffer([parseOffer({ ...base, availability: 'ended' })])).toBeNull();
    });

    test('describes weekly schedules', () => {
        const day = (iso: number) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][iso - 1];
        const time = (minutes: number) => `${minutes / 60}h`;
        expect(
            describeSchedule(
                [
                    { days: [1, 2, 3, 4, 5], start: '14:00', end: '17:00' },
                    { days: [6, 7], start: '00:00', end: '24:00' },
                    { days: [1, 2, 3, 4, 5, 6, 7], start: '00:00', end: '24:00' },
                    { days: [1, 3, 4, 5, 7], start: '09:00', end: '12:00' },
                    { days: [2, 2], start: 'x', end: 'y' },
                ],
                day,
                time,
                'Daily'
            )
        ).toEqual(['Mon – Fri, 14h – 17h', 'Sat, Sun', 'Daily', 'Mon, Wed – Fri, Sun, 9h – 12h', 'Tue']);
    });

    test('finds the store an offer belongs to', () => {
        expect(offerStoreId(parseOffer(base))).toBe('store_bloom');
        expect(offerStoreId(parseOffer({ owner: { type: 'network', id: 'n' }, applies_to: { stores: ['store_a'] } }))).toBe('store_a');
        expect(offerStoreId(parseOffer({ owner: { type: 'network', id: 'n' }, applies_to: { stores: ['a', 'b'] } }))).toBeNull();
    });

    test('fetches offers', async () => {
        const get = jest.fn().mockResolvedValueOnce([base, { id: '' }]).mockResolvedValueOnce(null).mockResolvedValueOnce(base);
        expect(await fetchOffers(get, { storeId: 'store_bloom' })).toHaveLength(1);
        expect(await fetchOffers(get, { includeScheduled: false })).toEqual([]);
        expect((await fetchOffer(get, 'promo 1')).id).toBe('promo_1');
        expect(get.mock.calls).toEqual([
            ['promotions', { include: 'scheduled', store: 'store_bloom' }],
            ['promotions', {}],
            ['promotions/promo%201'],
        ]);
    });
});
