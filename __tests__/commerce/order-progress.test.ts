import { orderPhase, orderProgress, shortName } from '../../src/commerce/order-progress';

const states = (progress: ReturnType<typeof orderProgress>) => progress.steps.map((step) => `${step.key}:${step.state}`);

describe('order progress', () => {
    test('maps storefront status codes to phases', () => {
        expect(orderPhase('created')).toBe('placed');
        expect(orderPhase('accepted')).toBe('accepted');
        expect(orderPhase('started')).toBe('accepted');
        expect(orderPhase('PREPARING')).toBe('preparing');
        expect(orderPhase('driver_enroute_to_store')).toBe('driverToStore');
        expect(orderPhase('driver_picked_up')).toBe('pickedUp');
        expect(orderPhase('driver_enroute')).toBe('onTheWay');
        expect(orderPhase('completed')).toBe('delivered');
        expect(orderPhase('completed', true)).toBe('collected');
        expect(orderPhase('picked_up')).toBe('delivered');
        expect(orderPhase('pickup_ready', true)).toBe('ready');
        expect(orderPhase('order_canceled')).toBe('canceled');
        expect(orderPhase('something_new')).toBe('placed');
        expect(orderPhase(null)).toBe('placed');
    });

    test('builds the delivery timeline with times from the tracking history', () => {
        const progress = orderProgress({
            status: 'driver_enroute',
            createdAt: '2026-10-06T05:30:00Z',
            trackingStatuses: [
                { code: 'created', created_at: '2026-10-06T05:30:05Z' },
                { code: 'accepted', created_at: '2026-10-06T05:33:00Z' },
                { code: 'preparing', created_at: '2026-10-06T05:34:00Z' },
                { code: 'driver_picked_up', created_at: '2026-10-06T05:51:00Z' },
                { code: 'driver_enroute', created_at: '2026-10-06T05:52:00Z' },
                { status: 'canceled', created_at: '2026-10-06T05:00:00Z' },
                { code: 'preparing' },
            ],
        });
        expect(progress.phase).toBe('onTheWay');
        expect(states(progress)).toEqual(['placed:done', 'preparing:done', 'pickedUp:done', 'onTheWay:current', 'delivered:todo']);
        expect(progress.steps.map((step) => step.at)).toEqual(['2026-10-06T05:30:00Z', '2026-10-06T05:33:00Z', '2026-10-06T05:51:00Z', '2026-10-06T05:52:00Z', null]);
        expect(progress.finished).toBe(false);
    });

    test('builds the pickup timeline', () => {
        expect(states(orderProgress({ status: 'pickup_ready', isPickup: true }))).toEqual(['placed:done', 'preparing:done', 'ready:current', 'collected:todo']);
        const collected = orderProgress({ status: 'completed', isPickup: true });
        expect(states(collected)).toEqual(['placed:done', 'preparing:done', 'ready:done', 'collected:done']);
        expect(collected.finished).toBe(true);
    });

    test('marks only the first step done for a new or canceled order', () => {
        expect(states(orderProgress({ status: 'created' }))).toEqual(['placed:current', 'preparing:todo', 'pickedUp:todo', 'onTheWay:todo', 'delivered:todo']);
        const canceled = orderProgress({ status: 'canceled', trackingStatuses: null });
        expect(canceled.canceled).toBe(true);
        expect(states(canceled)).toEqual(['placed:done', 'preparing:todo', 'pickedUp:todo', 'onTheWay:todo', 'delivered:todo']);
        expect(states(orderProgress({ status: 'completed' }))).toEqual(['placed:done', 'preparing:done', 'pickedUp:done', 'onTheWay:done', 'delivered:done']);
    });

    test('shortens driver names', () => {
        expect(shortName('Ravi Kumar')).toBe('Ravi K.');
        expect(shortName('  Ravi  van der kumar ')).toBe('Ravi K.');
        expect(shortName('Ravi')).toBe('Ravi');
        expect(shortName(null)).toBe('');
    });
});
