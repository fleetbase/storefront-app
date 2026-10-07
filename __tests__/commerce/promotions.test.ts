import { NO_PROMOTIONS, PromoCodeError, applyPromoCode, fetchCartPromotions, normalizePromoCode, parseCartPromotions, promoReasonFromMessage, promotionHints, removePromoCode } from '../../src/commerce/promotions';

const fakeAdapter = (overrides: Partial<Record<'get' | 'post' | 'delete', jest.Mock>> = {}) => ({
    get: overrides.get ?? jest.fn(),
    post: overrides.post ?? jest.fn(),
    delete: overrides.delete ?? jest.fn(),
});

const serverResult = {
    discount: 650,
    discount_subtotal: 500,
    discount_delivery: 150,
    applied: [
        { promotion: 'promo_1', name: 'First order', type: 'fixed_amount', code: 'FIRST5', amount: 500, delivery_amount: 0 },
        { promotion: 'promo_2', name: 'Free delivery', type: 'free_delivery', code: null, amount: 0, delivery_amount: 150 },
    ],
    rejected: [{ code: 'OLD10', reason: 'not_active' }, { code: null, reason: 'x' }],
};

describe('cart promotions', () => {
    test('parses the public promotion result', () => {
        expect(parseCartPromotions(serverResult)).toEqual({
            discount: 650,
            discountSubtotal: 500,
            discountDelivery: 150,
            applied: [
                { promotionId: 'promo_1', name: 'First order', type: 'fixed_amount', code: 'FIRST5', amount: 500, deliveryAmount: 0 },
                { promotionId: 'promo_2', name: 'Free delivery', type: 'free_delivery', code: null, amount: 0, deliveryAmount: 150 },
            ],
            rejected: [{ code: 'OLD10', reason: 'not_active' }],
        });
        expect(parseCartPromotions(null)).toBe(NO_PROMOTIONS);
        expect(parseCartPromotions({ discount: 'abc', applied: [{}] }).applied[0]).toEqual({ promotionId: null, name: null, type: null, code: null, amount: 0, deliveryAmount: 0 });
    });

    test('normalizes codes and reads rejection reasons from error messages', () => {
        expect(normalizePromoCode(' first 5 ')).toBe('FIRST5');
        expect(promoReasonFromMessage('Promotion code "X" cannot be applied (invalid_code).')).toBe('invalid_code');
        expect(promoReasonFromMessage('Promotion code "X" cannot be applied (min_subtotal)')).toBe('min_subtotal');
        expect(promoReasonFromMessage('Promotion code "X" cannot be applied (made_up).')).toBe('unknown');
        expect(promoReasonFromMessage(undefined)).toBe('unknown');
    });

    test('fetches promotions with pickup or the service quote', async () => {
        const get = jest.fn().mockResolvedValue(serverResult);
        const adapter = fakeAdapter({ get });
        expect((await fetchCartPromotions(adapter, 'cart_1')).discount).toBe(650);
        await fetchCartPromotions(adapter, 'cart_1', { serviceQuoteId: 'quote_1' });
        await fetchCartPromotions(adapter, 'cart_1', { pickup: true, serviceQuoteId: 'quote_1' });
        expect(get.mock.calls).toEqual([
            ['carts/cart_1/promotions', {}],
            ['carts/cart_1/promotions', { service_quote: 'quote_1' }],
            ['carts/cart_1/promotions', { pickup: 1 }],
        ]);
    });

    test('applies a normalized code and returns the cart and promotions', async () => {
        const post = jest.fn().mockResolvedValue({ cart: { id: 'cart_1' }, promotions: serverResult });
        const result = await applyPromoCode(fakeAdapter({ post }), 'cart_1', 'first5');
        expect(post).toHaveBeenCalledWith('carts/cart_1/promo-code', { code: 'FIRST5' });
        expect(result.cart).toEqual({ id: 'cart_1' });
        expect(result.promotions.discount).toBe(650);
    });

    test('turns refusals into PromoCodeError with the reason', async () => {
        const post = jest.fn().mockRejectedValue(new Error('Promotion code "NOPE" cannot be applied (invalid_code).'));
        await expect(applyPromoCode(fakeAdapter({ post }), 'cart_1', 'nope')).rejects.toMatchObject({ name: 'PromoCodeError', reason: 'invalid_code' });
        await expect(applyPromoCode(fakeAdapter({ post: jest.fn().mockRejectedValue({}) }), 'cart_1', 'x')).rejects.toMatchObject({ reason: 'unknown' });
        await expect(applyPromoCode(fakeAdapter(), 'cart_1', '  ')).rejects.toBeInstanceOf(PromoCodeError);
    });

    test('posts through fetch when the adapter exposes its host, keeping the refusal reason', async () => {
        const original = (globalThis as any).fetch;
        const adapter = { ...fakeAdapter(), host: 'https://api.test', namespace: 'storefront/v1', headers: { Authorization: 'Bearer key' } };
        try {
            (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: false, statusText: 'Bad Request', json: () => Promise.resolve({ error: 'Promotion code "NOPE" cannot be applied (invalid_code).', reason: 'invalid_code' }) });
            await expect(applyPromoCode(adapter, 'cart_1', 'nope')).rejects.toMatchObject({ reason: 'invalid_code', message: 'Promotion code "NOPE" cannot be applied (invalid_code).' });
            expect((globalThis as any).fetch).toHaveBeenCalledWith('https://api.test/storefront/v1/carts/cart_1/promo-code', {
                method: 'POST',
                headers: { Authorization: 'Bearer key', 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: 'NOPE' }),
            });

            (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: false, statusText: 'Bad Request', json: () => Promise.resolve({ error: 'Promotion code "X" cannot be applied (min_items).' }) });
            await expect(applyPromoCode(adapter, 'cart_1', 'x')).rejects.toMatchObject({ reason: 'min_items' });

            (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: false, statusText: 'Server Error', json: () => Promise.reject(new Error('not json')) });
            await expect(applyPromoCode(adapter, 'cart_1', 'x')).rejects.toMatchObject({ reason: 'unknown', message: 'Server Error' });

            (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ cart: { id: 'cart_1' }, promotions: serverResult }) });
            expect((await applyPromoCode(adapter, 'cart_1', 'first5')).promotions.discount).toBe(650);
            expect(adapter.post).not.toHaveBeenCalled();
        } finally {
            (globalThis as any).fetch = original;
        }
    });

    test('removes a code', async () => {
        const del = jest.fn().mockResolvedValue({ cart: { id: 'cart_1' }, promotions: { discount: 0 } });
        const result = await removePromoCode(fakeAdapter({ delete: del }), 'cart_1', 'first 5');
        expect(del).toHaveBeenCalledWith('carts/cart_1/promo-code/FIRST5');
        expect(result.promotions.discount).toBe(0);
        expect((await removePromoCode(fakeAdapter({ delete: jest.fn().mockResolvedValue(null) }), 'cart_1', 'X')).cart).toBeNull();
    });

    test('hints at automatic promotions the cart has not reached, nearest first', () => {
        const promotions = [
            { id: 'network_big', name: 'S$10 off S$150', trigger: 'automatic', min_subtotal: 15000, availability: 'live', owner: { type: 'network', id: 'network_1' } },
            { id: 'store_card', name: 'Free greeting card', trigger: 'automatic', min_subtotal: 12000, availability: 'live', owner: { type: 'store', id: 'store_bloom' } },
            { id: 'other_store', name: 'Elsewhere', trigger: 'automatic', min_subtotal: 5000, owner: { type: 'store', id: 'store_other' } },
            { id: 'code_only', name: 'Code', trigger: 'code', code: 'X', min_subtotal: 20000 },
            { id: 'scheduled', name: 'Soon', trigger: 'automatic', min_subtotal: 20000, availability: 'scheduled' },
            { id: 'reached', name: 'Reached', trigger: 'automatic', min_subtotal: 1000 },
            { id: 'no_min', name: 'No minimum', trigger: 'automatic', min_subtotal: 0 },
            { id: 'applied', name: 'Applied', trigger: 'automatic', min_subtotal: 90000 },
            { id: 'other_currency', name: 'MNT', trigger: 'automatic', min_subtotal: 90000, currency: 'MNT' },
            { name: 'No id' },
        ];
        const hints = promotionHints(promotions, { subtotal: 9400, storeSubtotals: { store_bloom: 9400 }, appliedIds: ['applied', null], currency: 'SGD' });
        expect(hints).toEqual([
            { id: 'store_card', name: 'Free greeting card', minSubtotal: 12000, remaining: 2600, ownerId: 'store_bloom' },
            { id: 'network_big', name: 'S$10 off S$150', minSubtotal: 15000, remaining: 5600, ownerId: null },
        ]);
        expect(promotionHints(null, { subtotal: 0 })).toEqual([]);
    });
});
