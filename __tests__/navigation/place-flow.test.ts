import { finishPlaceFlow, flowOrigin } from '../../src/navigation/place-flow';

describe('flowOrigin', () => {
    it('finds the screen below the address flow', () => {
        expect(flowOrigin([{ name: 'Profile' }, { name: 'AddressBook' }, { name: 'AddNewLocation' }, { name: 'EditLocation' }])).toEqual({ name: 'AddressBook' });
        expect(flowOrigin([{ name: 'Cart' }, { name: 'Checkout' }, { name: 'LocationPicker' }, { name: 'EditLocation' }, { name: 'EditLocationCoord' }])).toEqual({ name: 'Checkout' });
        expect(flowOrigin([{ name: 'AddressBook' }, { name: 'EditLocation' }])).toEqual({ name: 'AddressBook' });
    });

    it('restarts boot when opened from the location prompt or with nothing below', () => {
        expect(flowOrigin([{ name: 'LocationPermission' }, { name: 'LocationPicker' }, { name: 'EditLocation' }])).toBeNull();
        expect(flowOrigin([{ name: 'Boot' }, { name: 'EditLocation' }])).toBeNull();
        expect(flowOrigin([{ name: 'LocationPicker' }])).toBeNull();
        expect(flowOrigin(undefined)).toBeNull();
    });
});

describe('finishPlaceFlow', () => {
    it('pops back to the origin, merging params', () => {
        const popTo = jest.fn();
        finishPlaceFlow({ getState: () => ({ routes: [{ name: 'NetworkNavigator' }, { name: 'LocationPicker' }, { name: 'EditLocation' }] }), popTo });
        expect(popTo).toHaveBeenCalledWith('NetworkNavigator', undefined, { merge: true });
    });

    it('resets to boot otherwise', () => {
        const reset = jest.fn();
        finishPlaceFlow({ getState: () => ({ routes: [{ name: 'LocationPermission' }, { name: 'EditLocation' }] }), reset });
        expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Boot' }] });
        finishPlaceFlow({ reset });
        expect(reset).toHaveBeenCalledTimes(2);
    });
});
