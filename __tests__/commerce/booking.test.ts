import { bookingDays, bookingWindows, dateKey, depositPercent, fetchSlots, nextOpenDay, orderBooking, parseScheduledAt, parseSlots, serviceDuration, startTimes, toLocalIso, weekdayOf } from '../../src/commerce/booking';

// Tuesday 6 October 2026, 1:20 pm local time.
const now = new Date(2026, 9, 6, 13, 20);
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => ({ day_of_week: day, start: '08:00', end: '18:00' }));

describe('booking', () => {
    test('reads weekdays from names and numbers', () => {
        expect(weekdayOf('Monday')).toBe(1);
        expect(weekdayOf('sun')).toBe(0);
        expect(weekdayOf(7)).toBe(0);
        expect(weekdayOf('6')).toBe(6);
        expect(weekdayOf('mo')).toBeNull();
        expect(weekdayOf(9)).toBeNull();
        expect(weekdayOf(null)).toBeNull();
    });

    test('collects valid windows per weekday', () => {
        const windows = bookingWindows([...weekdays, { day: 'Saturday', start: '07:00', end: '07:30' }, { day: 'Sunday', start: '10:00', end: '09:00' }, { day: 'Funday', start: '1:00', end: '2:00' }, { day: 'Monday', start: 'x', end: '2:00' }]);
        expect(windows.get(6)).toEqual([{ start: 420, end: 450 }, { start: 480, end: 1080 }]);
        expect(windows.has(0)).toBe(false);
        expect(bookingWindows(null).size).toBe(0);
    });

    test('lists the next days with closed days marked', () => {
        const days = bookingDays(weekdays, now, 7);
        expect(days.map((day) => `${day.date}:${day.open}`)).toEqual(['2026-10-06:true', '2026-10-07:true', '2026-10-08:true', '2026-10-09:true', '2026-10-10:true', '2026-10-11:false', '2026-10-12:true']);
        expect(bookingDays([], now, 2).every((day) => day.open)).toBe(true);
        expect(nextOpenDay(days, '2026-10-11')?.date).toBe('2026-10-12');
        expect(nextOpenDay(days)?.date).toBe('2026-10-06');
        expect(nextOpenDay(days, '2026-10-12')).toBeNull();
    });

    test('offers start times that leave room to finish and marks past ones', () => {
        const today = startTimes('2026-10-06', weekdays, { now, duration: 180 });
        expect(today.map((time) => time.minutes / 60)).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
        expect(today.filter((time) => time.past).map((time) => time.minutes / 60)).toEqual([8, 9, 10, 11, 12, 13]);
        expect(today[0]).toMatchObject({ endMinutes: 660, period: 'morning' });
        expect(today[5].period).toBe('afternoon');
        expect(today[0].at).toBe(toLocalIso(new Date(2026, 9, 6, 8, 0)));

        const evening = startTimes('2026-10-07', [{ day: 'Wednesday', start: '16:30', end: '19:00' }], { now, step: 30 });
        expect(evening.map((time) => `${time.minutes}:${time.period}:${time.past}`)).toEqual(['990:afternoon:false', '1020:evening:false', '1050:evening:false', '1080:evening:false', '1110:evening:false']);
        expect(evening[0].endMinutes).toBeNull();

        expect(startTimes('2026-10-11', weekdays, { now })).toEqual([]);
        expect(startTimes('2026-10-11', null, { now })[0].minutes).toBe(480);
        expect(startTimes('2026-10-07', [{ day: 'Wednesday', start: '09:00', end: '12:00' }, { day: 'Wednesday', start: '11:00', end: '14:00' }], { now }).map((time) => time.minutes / 60)).toEqual([9, 10, 11, 12, 13]);
    });

    test('formats and parses scheduled times', () => {
        const at = new Date(2026, 9, 10, 10, 0);
        expect(toLocalIso(at)).toMatch(/^2026-10-10T10:00:00[+-]\d{2}:\d{2}$/);
        expect(parseScheduledAt(toLocalIso(at))).toMatchObject({ date: '2026-10-10', minutes: 600 });
        expect(parseScheduledAt('2026-10-10 10:30:00')).toMatchObject({ date: '2026-10-10', minutes: 630 });
        expect(parseScheduledAt(at)?.date).toBe(dateKey(at));
        expect(parseScheduledAt('soon')).toBeNull();
        expect(parseScheduledAt(42)).toBeNull();
    });

    test('reads an optional duration from product meta', () => {
        expect(serviceDuration({ meta: { duration: '180' } })).toBe(180);
        expect(serviceDuration({ getAttribute: () => ({ duration_minutes: 90 }) })).toBe(90);
        expect(serviceDuration({ meta: { duration: 0 } })).toBeNull();
        expect(serviceDuration(null)).toBeNull();
    });

    test('reads service settings', () => {
        expect(serviceDuration({ meta: { service: { duration_minutes: 45 }, duration: 90 } })).toBe(45);
        expect(depositPercent({ meta: { service: { deposit_percent: 30 } } })).toBe(30);
        expect(depositPercent({ getAttribute: () => ({ service: { deposit_percent: '100' } }) })).toBeNull();
        expect(depositPercent({ meta: {} })).toBeNull();
    });

    test('uses the server slots, marking taken and past ones', () => {
        const at = (hour: number) => toLocalIso(new Date(2026, 9, 6, hour, 0));
        const times = parseSlots(
            [
                { start: at(15), end: at(16), available: true, providers: 2 },
                { start: at(9), end: at(10), available: true, providers: 1 },
                { start: at(14), end: at(15), available: false, providers: 0 },
                { start: at(14), end: at(15), available: true },
                { start: toLocalIso(new Date(2026, 9, 7, 9, 0)), available: true },
                { start: 'nope' },
            ],
            '2026-10-06',
            { now }
        );
        expect(times.map((time) => [time.minutes, time.endMinutes, time.past, time.full, time.period])).toEqual([
            [540, 600, true, false, 'morning'],
            [840, 900, true, true, 'afternoon'],
            [900, 960, false, false, 'afternoon'],
        ]);
        expect(parseSlots({ slots: [{ start: at(18), providers: 0 }] }, '2026-10-06', { now })[0]).toMatchObject({ full: true, past: true, period: 'evening' });
        expect(parseSlots(null, '2026-10-06', { now })).toEqual([]);
    });

    test('fetches slots and falls back when the server has none', async () => {
        const request = jest.fn().mockResolvedValueOnce([{ start: toLocalIso(new Date(2026, 9, 7, 9, 0)), available: true }]);
        expect(await fetchSlots(request, 'product 1', '2026-10-07', { now, location: 'store_location_1' })).toHaveLength(1);
        expect(request).toHaveBeenCalledWith('products/product%201/slots', { query: { date: '2026-10-07', location: 'store_location_1' } });
        request.mockRejectedValueOnce(Object.assign(new Error('Not found'), { status: 404 }));
        expect(await fetchSlots(request, 'product_1', '2026-10-07', { now })).toBeNull();
        expect(request).toHaveBeenLastCalledWith('products/product_1/slots', { query: { date: '2026-10-07' } });
    });

    test('reads a booking order appointment', () => {
        const booking = orderBooking({ booking: { start: '2026-10-07T09:00:00', duration_minutes: 90, provider: 'driver_1' } });
        expect(booking?.start?.getHours()).toBe(9);
        expect(booking?.end?.getHours()).toBe(10);
        expect(booking).toMatchObject({ durationMinutes: 90, provider: 'driver_1' });
        expect(orderBooking({ booking: { start: '2026-10-07T09:00:00', end: '2026-10-07T11:00:00' } })?.durationMinutes).toBe(120);
        expect(orderBooking({})).toBeNull();
    });
});
