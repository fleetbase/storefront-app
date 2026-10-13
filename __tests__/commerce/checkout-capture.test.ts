import { captureWithRetry, pendingCaptureFor, unavailableItemsFromError, unavailableItemsText } from '../../src/commerce/checkout-capture';

describe('captureWithRetry', () => {
    it('returns the first successful capture, waiting between failed attempts', async () => {
        const sleep = jest.fn(() => Promise.resolve());
        const capture = jest.fn().mockRejectedValueOnce(new Error('network')).mockRejectedValueOnce(new Error('network')).mockResolvedValue({ id: 'order_1' });

        await expect(captureWithRetry(capture, { delays: [10, 20, 40], sleep })).resolves.toEqual({ id: 'order_1' });
        expect(capture).toHaveBeenCalledTimes(3);
        expect(sleep.mock.calls).toEqual([[10], [20]]);
    });

    it('rejects with the last error once every attempt has failed', async () => {
        const sleep = jest.fn(() => Promise.resolve());
        const capture = jest.fn().mockRejectedValueOnce(new Error('first')).mockRejectedValue(new Error('last'));

        await expect(captureWithRetry(capture, { delays: [10], sleep })).rejects.toThrow('last');
        expect(capture).toHaveBeenCalledTimes(2);
        expect(sleep).toHaveBeenCalledTimes(1);
    });

    it('waits for real with the default delays', async () => {
        jest.useFakeTimers();
        const capture = jest.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue('order');
        const result = captureWithRetry(capture);
        await jest.advanceTimersByTimeAsync(1000);
        await expect(result).resolves.toBe('order');
        jest.useRealTimers();
    });
});

describe('pendingCaptureFor', () => {
    const pending = { token: 'checkout_token', notes: '', customerId: 'customer_1', paidAt: '2026-10-08T10:00:00Z' };

    it("only returns the signed-in customer's pending capture", () => {
        expect(pendingCaptureFor(pending, 'customer_1')).toBe(pending);
        expect(pendingCaptureFor(pending, 'customer_2')).toBeNull();
        expect(pendingCaptureFor({ ...pending, customerId: null }, undefined)).toEqual({ ...pending, customerId: null });
        expect(pendingCaptureFor({ ...pending, token: '' }, 'customer_1')).toBeNull();
        expect(pendingCaptureFor(null, 'customer_1')).toBeNull();
    });
});

describe('unavailable items', () => {
    it('reads cart_items_unavailable refusals from the quote and from checkout', () => {
        const error = Object.assign(new Error('Some items in your cart are no longer available.'), {
            code: 'cart_items_unavailable',
            response: { items: [{ id: 'line_1', product_id: 'product_1', name: ' Iced Latte ', available: 2 }, { id: 'line_2', name: '' }, null] },
        });
        expect(unavailableItemsFromError(error)).toEqual([
            { id: 'line_1', product_id: 'product_1', name: 'Iced Latte', available: 2 },
            { id: 'line_2', product_id: undefined, name: undefined, available: null },
        ]);
        expect(unavailableItemsFromError({ response: { code: 'cart_items_unavailable' } })).toEqual([]);
        expect(unavailableItemsFromError(new Error('network'))).toBeNull();
        expect(unavailableItemsFromError(null)).toBeNull();
    });

    it('names the items with any stock left', () => {
        expect(unavailableItemsText([{ name: 'Iced Latte', available: 2 }, { name: 'Croissant', available: 0 }, { id: 'x' }], (count) => `${count} left`)).toBe(
            'Iced Latte (2 left), Croissant'
        );
        expect(unavailableItemsText(null, () => '')).toBe('');
    });
});
