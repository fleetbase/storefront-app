import { summarizeTruck } from '../../src/commerce/food-trucks';

describe('summarizeTruck', () => {
    it('is live when the truck takes orders, whatever its vehicle reports', () => {
        expect(summarizeTruck({ id: 'truck_1', online: true, vehicle: { online: false } }).live).toBe(true);
        expect(summarizeTruck({ id: 'truck_1', online: 1, vehicle: null }).live).toBe(true);
    });

    it('is not live when the truck is inactive, even with its vehicle online', () => {
        expect(summarizeTruck({ id: 'truck_1', online: false, vehicle: { online: true } }).live).toBe(false);
        expect(summarizeTruck({ id: 'truck_1', vehicle: { online: true } }).live).toBe(false);
    });
});
