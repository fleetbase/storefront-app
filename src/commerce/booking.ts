/**
 * Booking times for bookable products (`is_bookable`). The backend stores the chosen
 * start as the cart item's `scheduled_at` and carries it onto the order; it has no
 * availability API, so start times come from the product's booking hours (or the
 * store's hours when the product has none). A product may set `meta.duration` (minutes)
 * so the visit's end time and the last start time can be shown.
 */

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export type BookingHour = { day?: unknown; day_of_week?: unknown; start?: unknown; end?: unknown };
export type BookingDay = { date: string; weekday: number; open: boolean };
export type StartTime = { at: string; minutes: number; endMinutes: number | null; period: 'morning' | 'afternoon' | 'evening'; past: boolean };

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

export function serviceDuration(product: any): number | null {
    const meta = (typeof product?.getAttribute === 'function' ? product.getAttribute('meta') : product?.meta) ?? {};
    const minutes = Number(meta.duration_minutes ?? meta.duration);
    return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null;
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
 * The next `count` days from `now`, each marked open when there are booking hours that
 * weekday. With no usable hours at all, every day is open (times are then unrestricted).
 */
export function bookingDays(hours: BookingHour[] | null | undefined, now: Date, count = 14): BookingDay[] {
    const windows = bookingWindows(hours);
    const anyHours = windows.size > 0;
    const days: BookingDay[] = [];
    for (let offset = 0; offset < count; offset++) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
        days.push({ date: dateKey(date), weekday: date.getDay(), open: anyHours ? windows.has(date.getDay()) : true });
    }
    return days;
}

/** The first open day after `from` (or the first open day at all). */
export function nextOpenDay(days: BookingDay[], from?: string | null): BookingDay | null {
    const index = from ? days.findIndex((day) => day.date === from) : -1;
    return days.slice(index + 1).find((day) => day.open) ?? null;
}

/** Local ISO 8601 with the device's UTC offset, e.g. "2026-10-10T10:00:00+08:00". */
export function toLocalIso(date: Date): string {
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * Start times on `date` every `step` minutes inside its booking windows, leaving room to
 * finish when the duration is known. Times already passed (or within `leadMinutes` of
 * now) are kept but marked `past` so the grid stays stable.
 */
export function startTimes(date: string, hours: BookingHour[] | null | undefined, { now, step = 60, duration = null, leadMinutes = 30 }: { now: Date; step?: number; duration?: number | null; leadMinutes?: number }): StartTime[] {
    const day = fromKey(date);
    const windows = bookingWindows(hours);
    const dayWindows = windows.size > 0 ? (windows.get(day.getDay()) ?? []) : [{ start: 8 * 60, end: 20 * 60 }];
    const isToday = dateKey(now) === date;
    const cutoff = now.getHours() * 60 + now.getMinutes() + leadMinutes;
    const times: StartTime[] = [];
    for (const window of dayWindows) {
        const latest = window.end - (duration ?? step);
        for (let minutes = Math.ceil(window.start / step) * step; minutes <= latest; minutes += step) {
            if (times.some((time) => time.minutes === minutes)) continue;
            const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
            times.push({
                at: toLocalIso(at),
                minutes,
                endMinutes: duration ? minutes + duration : null,
                period: minutes < 12 * 60 ? 'morning' : minutes < 17 * 60 ? 'afternoon' : 'evening',
                past: isToday && minutes < cutoff,
            });
        }
    }
    return times.sort((a, b) => a.minutes - b.minutes);
}

/** Splits `scheduled_at` into its local date key and minutes, or null when unparseable. */
export function parseScheduledAt(value: unknown): { date: string; minutes: number; at: Date } | null {
    if (typeof value !== 'string' && !(value instanceof Date)) return null;
    const at = value instanceof Date ? value : new Date(value.includes('T') || value.includes('Z') ? value : value.replace(' ', 'T'));
    if (Number.isNaN(at.getTime())) return null;
    return { date: dateKey(at), minutes: at.getHours() * 60 + at.getMinutes(), at };
}
