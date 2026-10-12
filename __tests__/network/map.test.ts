import { distanceMeters, initialRegion, isValidCoordinate } from '../../src/network/map';

const tampines = { latitude: 1.3524, longitude: 103.9447 };
const orchard = { latitude: 1.3048, longitude: 103.8318 };

describe('map helpers', () => {
    test('measures great-circle distance', () => {
        expect(Math.round(distanceMeters(tampines, orchard) / 100) * 100).toBe(13600);
        expect(distanceMeters(tampines, tampines)).toBe(0);
    });

    test('rejects missing, out-of-range and null-island coordinates', () => {
        expect(isValidCoordinate(tampines)).toBe(true);
        expect(isValidCoordinate({ latitude: 0, longitude: 0 })).toBe(false);
        expect(isValidCoordinate({ latitude: 91, longitude: 0 })).toBe(false);
        expect(isValidCoordinate({ latitude: Number.NaN, longitude: 1 })).toBe(false);
        expect(isValidCoordinate(null)).toBe(false);
    });

    test('centres on the customer with the nearest stores in view', () => {
        const region = initialRegion(tampines, [orchard, { latitude: 1.36, longitude: 103.95 }], { nearest: 1 })!;
        expect(region.latitude).toBe(tampines.latitude);
        expect(region.longitude).toBe(tampines.longitude);
        expect(region.latitudeDelta).toBeCloseTo(Math.max(0.02, (1.36 - 1.3524) * 2 * 1.4));
    });

    test('fits every store without a customer location, and returns null with nothing to show', () => {
        const region = initialRegion(null, [tampines, orchard, { latitude: 0, longitude: 0 }])!;
        expect(region.latitude).toBeCloseTo((1.3524 + 1.3048) / 2);
        expect(region.longitudeDelta).toBeCloseTo((103.9447 - 103.8318) * 1.4);
        expect(initialRegion(null, [])).toBeNull();
        expect(initialRegion({ latitude: 0, longitude: 0 }, [])).toBeNull();
        expect(initialRegion(tampines, [])!.latitudeDelta).toBe(0.02);
    });
});
