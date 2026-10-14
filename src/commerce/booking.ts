/**
 * Booking times for bookable products (`is_bookable`). The backend stores the chosen
 * start as the cart item's `scheduled_at` and carries it onto the order.
 *
 * Start times come from the server's slots (GET products/{id}/slots?date&location →
 * `[{ start, end, available, providers }]`, which subtracts existing bookings) when it has
 * them; servers without that endpoint answer 404, and the times are then worked out here
 * from the product's booking hours (or the store's hours when the product has none). A
 * service may set `meta.service.duration_minutes` (or `meta.duration`) so the visit's end
 * time and the last start time can be shown, and `meta.service.deposit_percent` when only
 * a deposit is paid at checkout.
 *
 * Booking hours, slots and booked times are the store's wall-clock times. Each helper takes
 * the store's `utc_offset` (minutes east of UTC) to read "today" and "now" on the store's
 * clock and to write times with the store's offset; with no offset (an older server) the
 * device clock is used, as before.
 */

import { storeClockIso, toStoreWall } from '../ui/store-clock';

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export type BookingHour = { day?: unknown; day_of_week?: unknown; start?: unknown; end?: unknown };
export type BookingDay = { date: string; weekday: number; open: boolean };
export type StartTime = {
    at: string;
    minutes: number;
    endMinutes: number | null;
    period: 'morning' | 'afternoon' | 'evening';
    /** Can't be booked: already passed (or too soon), or, from the server's slots, taken. */
    past: boolean;
    /** Every provider is booked at this time (server slots only). */
    full?: boolean;
};

/** Ends with a UTC offset ("Z", "+08:00", "-0500"). */
const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/;

const periodOf = (minutes: number): StartTime['period'] => (minutes < 12 * 60 ? 'morning' : minutes < 17 * 60 ? 'afternoon' : 'evening');

function clock(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
    if (!match) return null;
    const minutes = Number(match[1]) * 60 + Number(match[2]);
    return minutes <= 1440 ? minutes : null;
}

/** 0 (Sunday) – 6 (Saturday) from a day name ("Monday", "mon") or number (0/7 = Sunday). */
export function weekdayOf(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 7) return value % 7;
    if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        if (/^\d$/.test(trimmed)) return weekdayOf(Number(trimmed));
        const index = WEEKDAY_NAMES.findIndex((name) => trimmed.length >= 3 && name.startsWith(trimmed));
        return index === -1 ? null : index;
    }
    return null;
}

/** Booking windows per weekday, in minutes since midnight. */
export function bookingWindows(hours: BookingHour[] | null | undefined): Map<number, { start: number; end: number }[]> {
    const windows = new Map<number, { start: number; end: number }[]>();
    for (const hour of Array.isArray(hours) ? hours : []) {
        const day = weekdayOf(hour?.day_of_week ?? hour?.day);
        const start = clock(hour?.start);
        const end = clock(hour?.end);
        if (day === null || start === null || end === null || end <= start) continue;
        windows.set(day, [...(windows.get(day) ?? []), { start, end }].sort((a, b) => a.start - b.start));
    }
    return windows;
}

const productMeta = (product: any): any => (typeof product?.getAttribute === 'function' ? product.getAttribute('meta') : product?.meta) ?? {};

export function serviceDuration(product: any): number | null {
    const meta = productMeta(product);
    const minutes = Number(meta.service?.duration_minutes ?? meta.duration_minutes ?? meta.duration);
    return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null;
}

/** The share of the price paid as a deposit at checkout (1–99), or null when paid in full. */
export function depositPercent(product: any): number | null {
    const percent = Number(productMeta(product).service?.deposit_percent);
    return Number.isFinite(percent) && percent > 0 && percent < 100 ? percent : null;
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

/** "2026-10-10" for a local date. */
export function dateKey(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromKey(key: string): Date {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * The next `count` days from today on the store's calendar, each marked open when there are
 * booking hours that weekday. With no usable hours at all, every day is open (times are
 * then unrestricted).
 */
export function bookingDays(hours: BookingHour[] | null | undefined, now: Date, count = 14, utcOffset: number | null = null): BookingDay[] {
    const windows = bookingWindows(hours);
    const anyHours = windows.size > 0;
    const today = toStoreWall(now, utcOffset);
    const days: BookingDay[] = [];
    for (let offset = 0; offset < count; offset++) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
        days.push({ date: dateKey(date), weekday: date.getDay(), open: anyHours ? windows.has(date.getDay()) : true });
    }
    return days;
}

/** The first open day after `from` (or the first open day at all). */
export function nextOpenDay(days: BookingDay[], from?: string | null): BookingDay | null {
    const index = from ? days.findIndex((day) => day.date === from) : -1;
    return days.slice(index + 1).find((day) => day.open) ?? null;
}

/**
 * Local ISO 8601 with the device's UTC offset, e.g. "2026-10-10T10:00:00+08:00". Booking
 * times use `storeClockIso`, which writes the store's offset.
 */
export function toLocalIso(date: Date): string {
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * Start times on `date` (a store calendar day) every `step` minutes inside its booking
 * windows, leaving room to finish when the duration is known. Times already passed (or
 * within `leadMinutes` of now on the store's clock) are kept but marked `past` so the grid
 * stays stable. Each `at` carries the store's offset, so the server books the store's time.
 */
export function startTimes(
    date: string,
    hours: BookingHour[] | null | undefined,
    { now, step = 60, duration = null, leadMinutes = 30, utcOffset = null }: { now: Date; step?: number; duration?: number | null; leadMinutes?: number; utcOffset?: number | null }
): StartTime[] {
    const day = fromKey(date);
    const windows = bookingWindows(hours);
    const dayWindows = windows.size > 0 ? (windows.get(day.getDay()) ?? []) : [{ start: 8 * 60, end: 20 * 60 }];
    const clockNow = toStoreWall(now, utcOffset);
    const isToday = dateKey(clockNow) === date;
    const cutoff = clockNow.getHours() * 60 + clockNow.getMinutes() + leadMinutes;
    const times: StartTime[] = [];
    for (const window of dayWindows) {
        const latest = window.end - (duration ?? step);
        for (let minutes = Math.ceil(window.start / step) * step; minutes <= latest; minutes += step) {
            if (times.some((time) => time.minutes === minutes)) continue;
            times.push({
                at: storeClockIso(date, minutes, utcOffset),
                minutes,
                endMinutes: duration ? minutes + duration : null,
                period: periodOf(minutes),
                past: isToday && minutes < cutoff,
            });
        }
    }
    return times.sort((a, b) => a.minutes - b.minutes);
}

const noneLeft = (value: unknown): boolean => value !== undefined && value !== null && Number.isFinite(Number(value)) && Number(value) <= 0;

/**
 * The store's date and time written in an ISO string that carries an offset: the server
 * writes slots with the store's offset, so "2026-10-14T10:00:00+08:00" is 10 am on the
 * 14th at the store, wherever the phone is.
 */
function writtenWallClock(value: unknown): { date: string; minutes: number } | null {
    if (typeof value !== 'string' || !HAS_OFFSET.test(value.trim())) return null;
    const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(value.trim());
    return match ? { date: match[1], minutes: Number(match[2]) * 60 + Number(match[3]) } : null;
}

/**
 * The server's slots for `date` (a store calendar day) as start times. The server answers
 * on the store's clock: `start`/`end` carry the store's offset, `time` is the store's
 * "HH:mm" and `past` says whether it has gone, so those are used as they are. Slots that
 * are taken (`available` false, or no providers or places left) are kept, marked `full`,
 * so the grid shows them crossed out; slots already passed (or within `leadMinutes`) are
 * marked past as with local times.
 */
export function parseSlots(json: any, date: string, { now, leadMinutes = 30, utcOffset = null }: { now: Date; leadMinutes?: number; utcOffset?: number | null }): StartTime[] {
    const list = Array.isArray(json) ? json : Array.isArray(json?.slots) ? json.slots : Array.isArray(json?.data) ? json.data : [];
    const cutoff = now.getTime() + leadMinutes * 60000;
    const times: StartTime[] = [];
    for (const slot of list) {
        const start = parseScheduledAt(slot?.start, utcOffset);
        if (!start) continue;
        const written = writtenWallClock(slot.start);
        const slotDate = written?.date ?? start.date;
        const minutes = clock(slot?.time) ?? written?.minutes ?? start.minutes;
        if (slotDate !== date || times.some((time) => time.minutes === minutes)) continue;
        const end = parseScheduledAt(slot?.end, utcOffset);
        const endWritten = writtenWallClock(slot?.end);
        const endDate = endWritten?.date ?? end?.date;
        const full = slot?.available === false || noneLeft(slot?.providers) || noneLeft(slot?.remaining);
        times.push({
            at: typeof slot.start === 'string' ? slot.start : storeClockIso(slotDate, minutes, utcOffset),
            minutes,
            endMinutes: end && endDate === date ? (endWritten?.minutes ?? end.minutes) : null,
            period: periodOf(minutes),
            past: full || slot?.past === true || start.at.getTime() < cutoff,
            full,
        });
    }
    return times.sort((a, b) => a.minutes - b.minutes);
}

export type SlotRequest = (path: string, options?: { query?: Record<string, any> }) => Promise<any>;

/**
 * Start times on `date` from the server, or null when it has no slots endpoint (404) or
 * can't be reached, in which case the caller works them out from the booking hours.
 */
export async function fetchSlots(
    request: SlotRequest,
    productId: string,
    date: string,
    { now, location = null, utcOffset = null }: { now: Date; location?: string | null; utcOffset?: number | null }
): Promise<StartTime[] | null> {
    try {
        const json = await request(`products/${encodeURIComponent(productId)}/slots`, { query: { date, ...(location ? { location } : {}) } });
        return parseSlots(json, date, { now, utcOffset });
    } catch {
        return null;
    }
}

export type OrderBooking = { start: Date | null; end: Date | null; durationMinutes: number | null; provider: string | null };

/** A booking order's appointment (`meta.booking`), or null for other orders. Times without an offset are the store's (`utcOffset`). */
export function orderBooking(meta: any, utcOffset: number | null = null): OrderBooking | null {
    const booking = meta?.booking;
    if (!booking || typeof booking !== 'object') return null;
    const start = parseScheduledAt(booking.start, utcOffset)?.at ?? null;
    const end = parseScheduledAt(booking.end, utcOffset)?.at ?? null;
    const duration = Number(booking.duration_minutes);
    return {
        start,
        end: end ?? (start && Number.isFinite(duration) && duration > 0 ? new Date(start.getTime() + duration * 60000) : null),
        durationMinutes: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : null,
        provider: typeof booking.provider === 'string' && booking.provider ? booking.provider : null,
    };
}

export type ScheduledAt = {
    /** The day on the store's calendar, "2026-10-10". */
    date: string;
    /** Minutes since midnight on the store's clock. */
    minutes: number;
    /** The instant: for comparing, sorting and calendars. */
    at: Date;
    /** `at` on the store's clock, for showing the weekday and date (see `toStoreWall`). */
    wall: Date;
};

/**
 * Splits `scheduled_at` into its store date key and minutes, or null when unparseable. A
 * time with an offset is an instant, read on the store's clock; one without is the store's
 * wall-clock time. With no `utcOffset` both are read on the device clock, as before.
 */
export function parseScheduledAt(value: unknown, utcOffset: number | null = null): ScheduledAt | null {
    if (typeof value !== 'string' && !(value instanceof Date)) return null;
    const known = utcOffset !== null && Number.isFinite(utcOffset);
    const text = typeof value === 'string' ? value.trim() : '';
    const written = known && typeof value === 'string' && !HAS_OFFSET.test(text) ? WALL_CLOCK.exec(text) : null;
    let at: Date;
    if (written) {
        const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = written;
        at = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)) - (utcOffset as number) * 60000);
    } else {
        at = value instanceof Date ? value : new Date(text.includes('T') || text.includes('Z') ? text : text.replace(' ', 'T'));
    }
    if (Number.isNaN(at.getTime())) return null;
    const wall = toStoreWall(at, known ? utcOffset : null);
    return { date: dateKey(wall), minutes: wall.getHours() * 60 + wall.getMinutes(), at, wall };
}
