import { canRequestAddressChange, parseOrderChanged, placeMoved, pushedOrderId, socketEventName } from '../../src/commerce/order-changes';

describe('order changes', () => {
    test('parses order.changed socket events', () => {
        const event = {
            event: 'order.changed',
            data: {
                id: 'order_1',
                changes: ['dropoff', 'items'],
                summary: 'Drop-off changed to 8 Marina View, Tower B · Iced Latte 2→1',
                dropoff: { id: 'place_x' },
                cod_amount: null,
                total: 8400,
                currency: 'SGD',
                changed_by: 'Jon (store)',
                changed_at: '2026-10-13T12:48:00Z',
            },
        };
        expect(parseOrderChanged(event)).toEqual({
            orderId: 'order_1',
            changes: ['dropoff', 'items'],
            summary: 'Drop-off changed to 8 Marina View, Tower B · Iced Latte 2→1',
            dropoffChanged: true,
            total: 8400,
            currency: 'SGD',
            changedBy: 'Jon (store)',
            changedAt: '2026-10-13T12:48:00Z',
        });
        expect(parseOrderChanged({ event: 'order.changed' })).toMatchObject({ orderId: null, changes: [], summary: null, dropoffChanged: false, total: null });
        expect(parseOrderChanged({ event: 'order.dispatched', data: {} })).toBeNull();
        expect(parseOrderChanged(null)).toBeNull();
        expect(socketEventName({ type: 'order.changed' })).toBe('order.changed');
    });

    test('finds the order a push is about', () => {
        expect(pushedOrderId({ type: 'order_updated', id: 'order_9' })).toBe('order_9');
        expect(pushedOrderId({ type: 'order_dispatched', order_id: 'order_8' })).toBe('order_8');
        expect(pushedOrderId({ id: 'order_7' })).toBe('order_7');
        expect(pushedOrderId({ type: 'campaign', id: 'order_6' })).toBeNull();
        expect(pushedOrderId({ type: 'order_updated', id: 'customer_1' })).toBeNull();
        expect(pushedOrderId(null)).toBeNull();
    });

    test('notices a moved drop-off', () => {
        const a = { id: 'place_a', location: { type: 'Point', coordinates: [103.85, 1.29] } };
        expect(placeMoved(a, { ...a })).toBe(false);
        expect(placeMoved(a, { id: 'place_a', location: { coordinates: [103.86, 1.29] } })).toBe(true);
        expect(placeMoved({ latitude: 1, longitude: 2 }, { latitude: 1, longitude: 2 })).toBe(false);
        expect(placeMoved({ id: 'place_a' }, { id: 'place_b' })).toBe(true);
        expect(placeMoved(null, null)).toBe(false);
    });

    test('allows an address change request until the order is dispatched', () => {
        const base = { isPickup: false, finished: false, canceled: false };
        expect(canRequestAddressChange({ ...base, status: 'created', phase: 'placed' })).toBe(true);
        expect(canRequestAddressChange({ ...base, status: 'preparing', phase: 'preparing' })).toBe(true);
        expect(canRequestAddressChange({ ...base, status: 'dispatched', phase: 'accepted' })).toBe(false);
        expect(canRequestAddressChange({ ...base, status: 'driver_enroute', phase: 'onTheWay' })).toBe(false);
        expect(canRequestAddressChange({ ...base, isPickup: true, status: 'created', phase: 'placed' })).toBe(false);
        expect(canRequestAddressChange({ ...base, finished: true, status: 'completed', phase: 'delivered' })).toBe(false);
    });
});
