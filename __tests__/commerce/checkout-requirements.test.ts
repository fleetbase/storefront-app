import { checkoutRequirements } from '../../src/commerce/checkout-requirements';

const record = (json: Record<string, any>) => ({ ...json, getAttribute: (key: string) => json[key] });

describe('checkoutRequirements', () => {
    it('needs nothing with a phone and a saved address', () => {
        expect(checkoutRequirements({ customer: record({ phone: '+97699112233' }), location: record({ id: 'place_1' }), isPickup: false })).toEqual({
            needsPhone: false,
            needsAddress: false,
        });
    });

    it('needs a phone when the customer has none (Apple or Google sign-in)', () => {
        for (const phone of [null, undefined, '', '+']) {
            expect(checkoutRequirements({ customer: record({ phone }), location: record({ id: 'place_1' }), isPickup: false }).needsPhone).toBe(true);
        }
    });

    it('needs a saved address for delivery, not just the device location', () => {
        expect(checkoutRequirements({ customer: record({ phone: '+97699112233' }), location: null, isPickup: false }).needsAddress).toBe(true);
        expect(checkoutRequirements({ customer: record({ phone: '+97699112233' }), location: record({ street1: 'Peace Ave' }), isPickup: false }).needsAddress).toBe(true);
    });

    it('needs only a phone for pickup', () => {
        expect(checkoutRequirements({ customer: record({ phone: null }), location: null, isPickup: true })).toEqual({ needsPhone: true, needsAddress: false });
        expect(checkoutRequirements({ customer: { phone: '+97699112233' }, location: null, isPickup: true })).toEqual({ needsPhone: false, needsAddress: false });
    });
});
