import { currentStep, fetchOrderFlow, parseOrderFlow, usesCustomFlow } from '../../src/commerce/order-flow';

const json = {
    order: 'order_1',
    order_config: { id: 'order_config_1', key: 'olimax', name: 'Oli Max' },
    status: 'started',
    canceled: false,
    completed: false,
    steps: [
        { code: 'created', label: 'Created', details: '', state: 'done', reached_at: '2026-10-08T10:00:00+00:00' },
        { code: 'started', label: ' Started ', details: 'On the way to the store', state: 'current', reached_at: null },
        { code: 'completed', label: '', state: 'upcoming' },
        { code: '', label: 'No code' },
    ],
};

describe('order flow', () => {
    it('reads steps, defaulting labels and unknown states', () => {
        const flow = parseOrderFlow(json)!;
        expect(flow).toEqual({
            configKey: 'olimax',
            status: 'started',
            canceled: false,
            completed: false,
            steps: [
                { code: 'created', label: 'Created', details: null, state: 'done', at: '2026-10-08T10:00:00+00:00' },
                { code: 'started', label: 'Started', details: 'On the way to the store', state: 'current', at: null },
                { code: 'completed', label: 'completed', details: null, state: 'todo', at: null },
            ],
        });
        expect(parseOrderFlow(null)).toBeNull();
        expect(parseOrderFlow({ steps: 'x' })).toBeNull();
        expect(parseOrderFlow({ steps: [], canceled: true, completed: true })).toEqual({ configKey: null, status: null, canceled: true, completed: true, steps: [] });
    });

    it('uses the order’s own steps only for custom configs', () => {
        const flow = parseOrderFlow(json)!;
        expect(usesCustomFlow(flow)).toBe(true);
        expect(usesCustomFlow({ ...flow, configKey: 'storefront' })).toBe(false);
        expect(usesCustomFlow({ ...flow, configKey: null })).toBe(false);
        expect(usesCustomFlow({ ...flow, steps: [] })).toBe(false);
        expect(usesCustomFlow(null)).toBe(false);
    });

    it('finds the step the order is on', () => {
        const flow = parseOrderFlow(json)!;
        expect(currentStep(flow)?.code).toBe('started');
        expect(currentStep({ ...flow, steps: flow.steps.map((step) => ({ ...step, state: 'done' as const })) })?.code).toBe('completed');
        expect(currentStep({ ...flow, steps: [] })).toBeNull();
    });

    it('fetches the order’s flow', async () => {
        const request = jest.fn().mockResolvedValue(json);
        expect((await fetchOrderFlow(request, 'order/1'))?.steps).toHaveLength(3);
        expect(request).toHaveBeenCalledWith('orders/order%2F1/activity-flow');
    });
});
