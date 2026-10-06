import { groupOrders, itemsPreview, parseOrderLine, paymentKey, placeLine, receiptText, summarizeOrder } from '../../src/commerce/order-summary';

const order = (overrides: any = {}) => ({
    id: 'order_1',
    status: 'driver_enroute',
    created_at: '2026-10-01T10:00:00Z',
    tracking_number: { tracking_number: 'SF-1001' },
    notes: '  Leave at door ',
    meta: {
        storefront: 'Rochor Noodle House',
        storefront_id: 'store_1',
        subtotal: 2400,
        delivery_fee: '399',
        tip: 200,
        delivery_tip: 100,
        discount: 300,
        promotions: [
            { name: 'Welcome', code: 'HELLO', amount: 200, delivery_amount: 100 },
            { name: null, code: null },
        ],
        total: 2799,
        currency: 'SGD',
        gateway: 'stripe',
        is_pickup: false,
    },
    payload: {
        pickup: { name: 'Rochor Noodle House', street1: '1 Rochor Rd' },
        dropoff: { name: 'Home', street1: '612 Hougang Ave 8' },
        entities: [
            {
                id: 'entity_1',
                name: 'Laksa',
                photo_url: 'https://img/laksa.jpg',
                meta: { quantity: 2, subtotal: 1600, variants: [{ name: 'Large' }], addons: [{ name: 'Extra prawns' }, { name: '' }] },
            },
            { id: 'entity_2', name: 'Kopi', price: 400, meta: { quantity: '2' } },
        ],
    },
    ...overrides,
});

describe('summarizeOrder', () => {
    it('reads what checkout recorded', () => {
        const summary = summarizeOrder(order());
        expect(summary).toMatchObject({
            id: 'order_1',
            reference: 'SF-1001',
            storeName: 'Rochor Noodle House',
            storeId: 'store_1',
            phase: 'onTheWay',
            active: true,
            canceled: false,
            isPickup: false,
            currency: 'SGD',
            itemCount: 4,
            subtotal: 2400,
            deliveryFee: 399,
            tip: 200,
            deliveryTip: 100,
            discount: 300,
            total: 2799,
            gateway: 'stripe',
            address: 'Home, 612 Hougang Ave 8',
            notes: 'Leave at door',
        });
        expect(summary.promotions).toEqual([{ name: 'Welcome', code: 'HELLO', amount: 300 }]);
        expect(summary.lines[0]).toEqual({
            id: 'entity_1',
            name: 'Laksa',
            quantity: 2,
            subtotal: 1600,
            imageUrl: 'https://img/laksa.jpg',
            options: ['Large', 'Extra prawns'],
            scheduledAt: null,
        });
        expect(summary.lines[1]).toMatchObject({ quantity: 2, subtotal: 800, imageUrl: null, options: [] });
    });

    it('handles pickup, finished and canceled orders', () => {
        const pickup = summarizeOrder(order({ status: 'completed', meta: { is_pickup: 1, delivery_fee: 500, storefront: null } }));
        expect(pickup).toMatchObject({ isPickup: true, phase: 'collected', active: false, deliveryFee: 0, address: 'Rochor Noodle House, 1 Rochor Rd', storeName: 'Rochor Noodle House' });

        const canceled = summarizeOrder(order({ status: 'canceled' }));
        expect(canceled).toMatchObject({ canceled: true, active: false });
    });

    it('copes with missing data', () => {
        const empty = summarizeOrder({});
        expect(empty).toMatchObject({
            id: '',
            reference: '',
            storeName: '',
            lines: [],
            itemCount: 0,
            total: 0,
            currency: null,
            gateway: null,
            address: null,
            notes: null,
            phase: 'placed',
            active: true,
        });
        expect(summarizeOrder({ id: 'order_2', tracking: 'TRK', payload: { payment_method: 'qpay' }, meta: { total: 'MNT 1,000' } })).toMatchObject({
            reference: 'TRK',
            gateway: 'qpay',
            total: 1000,
        });
        expect(summarizeOrder({ id: 'order_3', meta: { total: 'n/a' } }).total).toBe(0);
    });
});

describe('order lines', () => {
    it('defaults the quantity and uses the price when there is no subtotal', () => {
        expect(parseOrderLine({ name: 'Tea', price: 300, meta: { image_url: 'https://img/tea.jpg', scheduled_at: '2026-10-02 09:00', variants: [{ label: 'Hot' }] } }, 3)).toEqual({
            id: '3',
            name: 'Tea',
            quantity: 1,
            subtotal: 300,
            imageUrl: 'https://img/tea.jpg',
            options: ['Hot'],
            scheduledAt: '2026-10-02 09:00',
        });
        expect(parseOrderLine(null).name).toBe('');
    });

    it('previews what was ordered', () => {
        const lines = summarizeOrder(order()).lines;
        const more = (count: number) => `and ${count} more`;
        expect(itemsPreview(lines, more)).toBe('2× Laksa, 2× Kopi');
        expect(itemsPreview([...lines, parseOrderLine({ name: 'Cake' })], more)).toBe('2× Laksa, 2× Kopi and 1 more');
        expect(itemsPreview([], more)).toBe('');
    });
});

describe('placeLine', () => {
    it('joins the name and street without repeating them', () => {
        expect(placeLine({ name: 'Home', street1: 'Home' })).toBe('Home');
        expect(placeLine({ address: '1 Main St, Singapore' })).toBe('1 Main St, Singapore');
        expect(placeLine({})).toBeNull();
        expect(placeLine(null)).toBeNull();
    });
});

describe('groupOrders', () => {
    it('pins orders in progress and sorts each group newest first', () => {
        const a = summarizeOrder(order({ id: 'a', status: 'completed', created_at: '2026-09-01T00:00:00Z' }));
        const b = summarizeOrder(order({ id: 'b', status: 'completed', created_at: '2026-09-05T00:00:00Z' }));
        const c = summarizeOrder(order({ id: 'c', status: 'preparing', created_at: '2026-09-02T00:00:00Z' }));
        const d = summarizeOrder(order({ id: 'd', status: 'created', created_at: null }));
        const { active, past } = groupOrders([a, b, c, d, b, summarizeOrder({})]);
        expect(active.map((entry) => entry.id)).toEqual(['c', 'd']);
        expect(past.map((entry) => entry.id)).toEqual(['b', 'a']);
    });
});

describe('paymentKey', () => {
    it.each([
        ['stripe', 'card'],
        ['QPay', 'qpay'],
        ['paypal', 'paypal'],
        ['cash', 'cash'],
        ['cod', 'cash'],
        ['other', 'other'],
        [null, 'other'],
    ])('%s → %s', (gateway, key) => expect(paymentKey(gateway)).toBe(key));
});

describe('receiptText', () => {
    const t = (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key);
    const money = (value: number) => `$${(value / 100).toFixed(2)}`;

    it('lists the lines and every charge that applies', () => {
        const text = receiptText(summarizeOrder(order()), { t, money, date: 'Oct 1, 2026' });
        expect(text.split('\n')).toEqual([
            'Rochor Noodle House',
            'Receipt.orderNumber {"number":"SF-1001"}',
            'Oct 1, 2026',
            '',
            '2 × Laksa (Large, Extra prawns)  $16.00',
            '2 × Kopi  $8.00',
            '',
            'Receipt.subtotal: $24.00',
            'Receipt.deliveryFee: $3.99',
            'Receipt.tip: $2.00',
            'Receipt.driverTip: $1.00',
            'Receipt.discount: −$3.00',
            'Receipt.total: $27.99',
        ]);
    });

    it('leaves out charges that are zero and a missing date', () => {
        const text = receiptText(summarizeOrder(order({ meta: { subtotal: 500, total: 500, is_pickup: true } })), { t, money, date: null });
        expect(text).not.toContain('deliveryFee');
        expect(text).not.toContain('tip');
        expect(text).not.toContain('discount');
        expect(text.split('\n')[2]).toBe('');
    });
});
