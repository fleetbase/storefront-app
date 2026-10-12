import { describeOpenStatus, distanceParts, formatClock, formatDistance, initials, openStatus, parseClock, tintFor, usesTwelveHourClock } from '../../src/ui/format';

const t = (key: string, params: Record<string, unknown> = {}) => `${key}${Object.keys(params).length ? JSON.stringify(params) : ''}`;

// Tuesday 6 October 2026, local time.
const at = (hours: number, minutes = 0, day = 6) => new Date(2026, 9, day, hours, minutes);

const weekdays = (start: string, end: string) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => ({ day, start, end }));

describe('distance', () => {
    test.each([
        [0, '10 m'],
        [4, '10 m'],
        [804, '800 m'],
        [999, '1000 m'],
        [1000, '1 km'],
        [1234, '1.2 km'],
        [9960, '10 km'],
        [12_400, '12 km'],
        ['850', '850 m'],
    ])('%p meters is %p', (meters, expected) => {
        expect(formatDistance(meters)).toBe(expected);
    });

    test.each([[null], [undefined], [-1], [Number.NaN], ['far'], [5_185_487]])('%p has no display distance', (meters) => {
        expect(formatDistance(meters)).toBeNull();
        expect(distanceParts(meters)).toBeNull();
    });
});

describe('clock', () => {
    test('parses hours with and without seconds', () => {
        expect(parseClock('09:30')).toBe(570);
        expect(parseClock('9:05:00')).toBe(545);
        expect(parseClock('24:00')).toBe(1440);
        expect(parseClock('24:30')).toBeNull();
        expect(parseClock('25:00')).toBeNull();
        expect(parseClock('9.30')).toBeNull();
        expect(parseClock(null)).toBeNull();
    });

    test('formats 12 and 24 hour times', () => {
        expect(formatClock(0)).toBe('12 am');
        expect(formatClock(12 * 60)).toBe('12 pm');
        expect(formatClock(20 * 60)).toBe('8 pm');
        expect(formatClock(20 * 60 + 30)).toBe('8:30 pm');
        expect(formatClock(1440 + 60)).toBe('1 am');
        expect(formatClock(20 * 60 + 5, false)).toBe('20:05');
        expect(usesTwelveHourClock('en-SG')).toBe(true);
        expect(usesTwelveHourClock(undefined)).toBe(true);
        expect(usesTwelveHourClock('mn')).toBe(false);
    });
});

describe('open status', () => {
    test('offline stores are not accepting orders whatever their hours', () => {
        expect(openStatus(weekdays('09:00', '20:00'), at(10), false)).toEqual({ state: 'offline' });
    });

    test('without usable hours the status is unknown', () => {
        expect(openStatus([], at(10))).toEqual({ state: 'unknown' });
        expect(openStatus(null, at(10))).toEqual({ state: 'unknown' });
        expect(openStatus([{ day: 'Someday', start: '09:00', end: '20:00' }, { day: 'Monday', start: 'late', end: null }], at(10))).toEqual({ state: 'unknown' });
    });

    test('open stores say when they close', () => {
        expect(openStatus(weekdays('09:00', '20:00'), at(10))).toEqual({ state: 'open', allDay: false, closesAt: 1200 });
        expect(openStatus([{ day: 'tuesday', start: '00:00', end: '24:00' }], at(10))).toEqual({ state: 'open', allDay: true, closesAt: null });
    });

    test('windows past midnight stay open into the next day', () => {
        const late = [{ day: 'Monday', start: '18:00', end: '02:00' }];
        // Tuesday 1 am is still inside Monday's window.
        expect(openStatus(late, at(1))).toEqual({ state: 'open', allDay: false, closesAt: 120 });
        expect(openStatus([{ day: 'Tuesday', start: '18:00', end: '02:00' }], at(23))).toEqual({ state: 'open', allDay: false, closesAt: 120 });
    });

    test('closed stores say when they next open', () => {
        const hours = weekdays('09:00', '20:00');
        expect(openStatus(hours, at(7))).toEqual({ state: 'closed', opensAt: 540, opensInDays: 0, opensOn: 'Tuesday' });
        expect(openStatus(hours, at(21))).toEqual({ state: 'closed', opensAt: 540, opensInDays: 1, opensOn: 'Wednesday' });
        // Friday evening opens again on Monday.
        expect(openStatus(hours, at(21, 0, 9))).toEqual({ state: 'closed', opensAt: 540, opensInDays: 3, opensOn: 'Monday' });
        expect(openStatus([{ day: 'Tuesday', start: '07:00', end: '08:00' }, { day: 'Tuesday', start: '12:00', end: '13:00' }], at(9))).toEqual({
            state: 'closed',
            opensAt: 720,
            opensInDays: 0,
            opensOn: 'Tuesday',
        });
    });

    test('describes every status in one line', () => {
        const hours = weekdays('09:00', '20:00');
        expect(describeOpenStatus(openStatus(hours, at(10)), t)).toBe('UI.openClosesAt{"time":"8 pm"}');
        expect(describeOpenStatus(openStatus(hours, at(10)), t, false)).toBe('UI.openClosesAt{"time":"20:00"}');
        expect(describeOpenStatus(openStatus([{ day: 'Tuesday', start: '00:00', end: '24:00' }], at(10)), t)).toBe('UI.openAllDay');
        expect(describeOpenStatus(openStatus(hours, at(7)), t)).toBe('UI.closedOpensAt{"time":"9 am"}');
        expect(describeOpenStatus(openStatus(hours, at(21)), t)).toBe('UI.closedOpensTomorrow{"time":"9 am"}');
        expect(describeOpenStatus(openStatus(hours, at(21, 0, 9)), t)).toBe('UI.closedOpensOn{"day":"StoreLocationSchedule.Monday","time":"9 am"}');
        expect(describeOpenStatus({ state: 'offline' }, t)).toBe('UI.notAcceptingOrders');
        expect(describeOpenStatus({ state: 'unknown' }, t)).toBeNull();
        expect(describeOpenStatus({ state: 'closed', opensAt: null, opensInDays: 0, opensOn: null }, t)).toBe('UI.closed');
        expect(describeOpenStatus({ state: 'open', allDay: false, closesAt: null }, t)).toBe('UI.openAllDay');
    });
});

describe('monograms', () => {
    test('initials use the first two words or the first two letters', () => {
        expect(initials('Bloom & Co.')).toBe('BC');
        expect(initials('Volt')).toBe('VO');
        expect(initials('  ')).toBe('?');
        expect(initials(null)).toBe('?');
        expect(initials('Тампинс маркет')).toBe('ТМ');
    });

    test('tints are stable per name', () => {
        expect(tintFor('Bloom & Co.')).toBe(tintFor('Bloom & Co.'));
        expect(tintFor('Bloom & Co.')).toMatch(/^#[0-9a-f]{6}$/);
        expect(tintFor(undefined)).toMatch(/^#[0-9a-f]{6}$/);
    });
});
