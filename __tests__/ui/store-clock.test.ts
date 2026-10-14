import { offsetSuffix, parseUtcOffset, storeClockIso, storeMinutes, storeNow, toStoreWall } from '../../src/ui/store-clock';
import { toLocalIso } from '../../src/commerce/booking';

// Tuesday 6 October 2026, 23:30 UTC.
const instant = new Date(Date.UTC(2026, 9, 6, 23, 30));

describe('store clock', () => {
    test('reads usable offsets only', () => {
        expect(parseUtcOffset(480)).toBe(480);
        expect(parseUtcOffset('-300')).toBe(-300);
        expect(parseUtcOffset(0)).toBe(0);
        expect(parseUtcOffset(null)).toBeNull();
        expect(parseUtcOffset(undefined)).toBeNull();
        expect(parseUtcOffset('')).toBeNull();
        expect(parseUtcOffset('UTC')).toBeNull();
        expect(parseUtcOffset(true)).toBeNull();
        expect(parseUtcOffset(2000)).toBeNull();
    });

    test('reads a moment on the store wall clock, wherever the phone is', () => {
        const singapore = toStoreWall(instant, 480);
        expect([singapore.getDay(), singapore.getDate(), singapore.getHours(), singapore.getMinutes()]).toEqual([3, 7, 7, 30]);
        const newYork = toStoreWall(instant, -240);
        expect([newYork.getDay(), newYork.getDate(), newYork.getHours(), newYork.getMinutes()]).toEqual([2, 6, 19, 30]);
        const india = toStoreWall(instant, 330);
        expect([india.getDate(), india.getHours(), india.getMinutes()]).toEqual([7, 5, 0]);
        expect(storeMinutes(instant, 480)).toBe(450);
        expect(storeNow(480, instant).getTime()).toBe(singapore.getTime());
    });

    test('falls back to the device clock without an offset', () => {
        expect(toStoreWall(instant, null)).toBe(instant);
        expect(storeMinutes(instant, undefined)).toBe(instant.getHours() * 60 + instant.getMinutes());
    });

    test('writes store times with the store offset', () => {
        expect(offsetSuffix(480)).toBe('+08:00');
        expect(offsetSuffix(-330)).toBe('-05:30');
        expect(offsetSuffix(0)).toBe('+00:00');
        expect(storeClockIso('2026-10-14', 600, 480)).toBe('2026-10-14T10:00:00+08:00');
        expect(new Date(storeClockIso('2026-10-14', 600, 480)).getTime()).toBe(Date.UTC(2026, 9, 14, 2, 0));
        expect(storeClockIso('2026-10-14', 1470, -300)).toBe('2026-10-15T00:30:00-05:00');
        // Without an offset: the device's, as before.
        expect(storeClockIso('2026-10-14', 600, null)).toBe(toLocalIso(new Date(2026, 9, 14, 10, 0)));
    });
});
