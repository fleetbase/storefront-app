import { arcPoints, initials, regionFor, straightDistance, toLatLng } from '../../src/commerce/route-preview';

describe('toLatLng', () => {
    it('reads [latitude, longitude] and rejects missing or impossible points', () => {
        expect(toLatLng([1.3, '103.8'])).toEqual({ latitude: 1.3, longitude: 103.8 });
        expect(toLatLng([0, 0])).toBeNull();
        expect(toLatLng([91, 10])).toBeNull();
        expect(toLatLng([10, 181])).toBeNull();
        expect(toLatLng(['x', 1])).toBeNull();
        expect(toLatLng([1])).toBeNull();
        expect(toLatLng(null)).toBeNull();
    });
});

describe('straightDistance', () => {
    it('measures metres along the earth', () => {
        expect(straightDistance({ latitude: 1.3, longitude: 103.8 }, { latitude: 1.3, longitude: 103.8 })).toBe(0);
        // About 1.11 km per 0.01 degree of latitude.
        expect(Math.round(straightDistance({ latitude: 1.3, longitude: 103.8 }, { latitude: 1.31, longitude: 103.8 }))).toBe(1112);
    });
});

describe('regionFor', () => {
    it('frames every point with padding and a minimum zoom', () => {
        const region = regionFor([
            { latitude: 1.3, longitude: 103.8 },
            { latitude: 1.34, longitude: 103.9 },
        ])!;
        expect(region.latitude).toBeCloseTo(1.32);
        expect(region.longitude).toBeCloseTo(103.85);
        expect(region.latitudeDelta).toBeCloseTo(0.088);
        expect(region.longitudeDelta).toBeCloseTo(0.16);
        expect(regionFor([{ latitude: 1.3, longitude: 103.8 }])).toEqual({ latitude: 1.3, longitude: 103.8, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        expect(regionFor([])).toBeNull();
    });
});

describe('initials', () => {
    it('takes the first letters of the first two words', () => {
        expect(initials('Bloom & Co.')).toBe('BC');
        expect(initials('tiong')).toBe('T');
        expect(initials('  ')).toBe('?');
        expect(initials(null)).toBe('?');
    });
});

describe('arcPoints', () => {
    it('bows away from the straight line and ends on both points', () => {
        const from = { latitude: 1.3, longitude: 103.8 };
        const to = { latitude: 1.3, longitude: 103.9 };
        const points = arcPoints(from, to, { steps: 4 });
        expect(points).toHaveLength(5);
        expect(points[0]).toEqual(from);
        expect(points[4]!.latitude).toBeCloseTo(1.3);
        expect(points[4]!.longitude).toBeCloseTo(103.9);
        // Travelling east, the arc bows north (to the left) by half the bend at its middle.
        expect(points[2]!.latitude).toBeCloseTo(1.3125);
        expect(points[2]!.longitude).toBeCloseTo(103.85);
        expect(arcPoints(from, to)).toHaveLength(25);
    });
});
