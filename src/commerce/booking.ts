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
 */

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
                period: periodOf(minutes),
                past: isToday && minutes < cutoff,
            });
        }
    }
    return times.sort((a, b) => a.minutes - b.minutes);
}

/**
 * The server's slots for `date` as start times. Slots that are taken (`available` false or
 * no providers left) are kept, marked `full`, so the grid shows them crossed out; slots
 * already passed (or within `leadMinutes`) are marked past as with local times.
 */
export function parseSlots(json: any, date: string, { now, leadMinutes = 30 }: { now: Date; leadMinutes?: number }): StartTime[] {
    const list = Array.isArray(json) ? json : Array.isArray(json?.slots) ? json.slots : Array.isArray(json?.data) ? json.data : [];
    const cutoff = now.getTime() + leadMinutes * 60000;
    const times: StartTime[] = [];
    for (const slot of list) {
        const start = parseScheduledAt(slot?.start);
        if (!start || start.date !== date || times.some((time) => time.minutes === start.minutes)) continue;
        const end = parseScheduledAt(slot?.end);
        const providers = Number(slot?.providers);
        const full = slot?.available === false || (slot?.providers !== undefined && slot?.providers !== null && Number.isFinite(providers) && providers <= 0);
        times.push({
            at: typeof slot.start === 'string' ? slot.start : toLocalIso(start.at),
            minutes: start.minutes,
            endMinutes: end && end.date === date ? end.minutes : null,
            period: periodOf(start.minutes),
            past: full || start.at.getTime() < cutoff,
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
export async function fetchSlots(request: SlotRequest, productId: string, date: string, { now, location = null }: { now: Date; location?: string | null }): Promise<StartTime[] | null> {
    try {
        const json = await request(`products/${encodeURIComponent(productId)}/slots`, { query: { date, ...(location ? { location } : {}) } });
        return parseSlots(json, date, { now });
    } catch {
        return null;
    }
}

export type OrderBooking = { start: Date | null; end: Date | null; durationMinutes: number | null; provider: string | null };

/** A booking order's appointment (`meta.booking`), or null for other orders. */
export function orderBooking(meta: any): OrderBooking | null {
    const booking = meta?.booking;
    if (!booking || typeof booking !== 'object') return null;
    const start = parseScheduledAt(booking.start)?.at ?? null;
    const end = parseScheduledAt(booking.end)?.at ?? null;
    const duration = Number(booking.duration_minutes);
    return {
        start,
        end: end ?? (start && Number.isFinite(duration) && duration > 0 ? new Date(start.getTime() + duration * 60000) : null),
        durationMinutes: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : null,
        provider: typeof booking.provider === 'string' && booking.provider ? booking.provider : null,
    };
}

/** Splits `scheduled_at` into its local date key and minutes, or null when unparseable. */
export function parseScheduledAt(value: unknown): { date: string; minutes: number; at: Date } | null {
    if (typeof value !== 'string' && !(value instanceof Date)) return null;
    const at = value instanceof Date ? value : new Date(value.includes('T') || value.includes('Z') ? value : value.replace(' ', 'T'));
    if (Number.isNaN(at.getTime())) return null;
    return { date: dateKey(at), minutes: at.getHours() * 60 + at.getMinutes(), at };
}
