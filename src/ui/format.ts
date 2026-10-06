/**
 * Formatting helpers for the redesigned screens. Pure functions, so they are easy
 * to test and safe to call while rendering.
 */

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/**
 * Distances further than this are treated as unknown. A store thousands of
 * kilometres away almost always means the customer location was missing and the
 * API measured from (0, 0), so showing it would only confuse.
 */
export const MAX_SHOWN_DISTANCE_METERS = 1_000_000;

export type DistanceParts = { value: string; unit: 'm' | 'km' };

/**
 * Splits a distance in meters into a display value and unit: "800 m" under a
 * kilometre, "1.2 km" under ten, and whole kilometres beyond that. Returns null
 * for missing, negative or implausible distances.
 */
export function distanceParts(meters: unknown): DistanceParts | null {
    const value = typeof meters === 'string' ? Number(meters) : meters;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_SHOWN_DISTANCE_METERS) {
        return null;
    }

    if (value < 1000) {
        // Round to the nearest 10 m so the number does not jitter as location updates.
        return { value: String(Math.max(10, Math.round(value / 10) * 10)), unit: 'm' };
    }

    const km = value / 1000;
    return { value: km < 10 ? km.toFixed(1).replace(/\.0$/, '') : String(Math.round(km)), unit: 'km' };
}

/** "800 m" or "1.2 km", or null when the distance is unknown. */
export function formatDistance(meters: unknown): string | null {
    const parts = distanceParts(meters);
    return parts ? `${parts.value} ${parts.unit}` : null;
}

/** Minutes since midnight for "HH:mm" or "HH:mm:ss"; null when unparseable. */
export function parseClock(time: unknown): number | null {
    if (typeof time !== 'string') return null;
    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) return null;
    return hours * 60 + minutes;
}

/**
 * A clock time for display: "8 pm" / "8:30 pm" in 12-hour locales, "20:00" otherwise.
 */
export function formatClock(minutesOfDay: number, hour12 = true): string {
    const total = ((Math.round(minutesOfDay) % 1440) + 1440) % 1440;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;

    if (!hour12) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    const suffix = hours < 12 ? 'am' : 'pm';
    const display = hours % 12 === 0 ? 12 : hours % 12;
    return minutes === 0 ? `${display} ${suffix}` : `${display}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export type OpeningHour = { day?: string | null; start?: string | null; end?: string | null };

export type OpenStatus =
    | { state: 'offline' }
    | { state: 'unknown' }
    | { state: 'open'; allDay: boolean; closesAt: number | null }
    | { state: 'closed'; opensAt: number | null; opensInDays: number; opensOn: Weekday | null };

type Window = { day: number; start: number; end: number };

function windowsFor(hours: OpeningHour[]): Window[] {
    const windows: Window[] = [];
    for (const hour of hours) {
        const day = WEEKDAYS.findIndex((name) => name.toLowerCase() === String(hour.day ?? '').toLowerCase());
        const start = parseClock(hour.start);
        const end = parseClock(hour.end);
        if (day === -1 || start === null || end === null) continue;
        windows.push({ day, start, end: end <= start ? end + 1440 : end });
    }
    return windows;
}

/**
 * Whether a store (or service) is open at `now`, from its weekly hours.
 *
 * - `offline`: the store is not accepting orders, whatever its hours.
 * - `unknown`: no usable hours, so only `online` is known.
 * - `open`: inside a window; `closesAt` is minutes since midnight today (or null when open all day).
 * - `closed`: `opensAt`/`opensOn`/`opensInDays` describe the next opening within a week.
 *
 * Windows that end at or before they start run past midnight.
 */
export function openStatus(hours: OpeningHour[] | null | undefined, now: Date, online: boolean | null | undefined = true): OpenStatus {
    if (online === false) {
        return { state: 'offline' };
    }

    const windows = windowsFor(hours ?? []);
    if (windows.length === 0) {
        return { state: 'unknown' };
    }

    const today = now.getDay();
    const minute = now.getHours() * 60 + now.getMinutes();

    for (const window of windows) {
        // Today's window, or yesterday's window that runs past midnight.
        const offset = window.day === today ? 0 : window.day === (today + 6) % 7 ? 1440 : null;
        if (offset === null) continue;
        const at = minute + offset;
        if (at >= window.start && at < window.end) {
            const allDay = window.end - window.start >= 1439;
            return { state: 'open', allDay, closesAt: allDay ? null : (window.end - offset) % 1440 };
        }
    }

    for (let inDays = 0; inDays <= 7; inDays++) {
        const day = (today + inDays) % 7;
        const starts = windows
            .filter((window) => window.day === day && (inDays > 0 || window.start > minute))
            .map((window) => window.start)
            .sort((a, b) => a - b);
        if (starts.length > 0) {
            return { state: 'closed', opensAt: starts[0], opensInDays: inDays, opensOn: WEEKDAYS[day] };
        }
    }

    return { state: 'closed', opensAt: null, opensInDays: 0, opensOn: null };
}

export type Translate = (key: string, params?: Record<string, unknown>) => string;

/**
 * One line for store cards and headers: "Open · closes 8 pm", "Closed · opens 9 am",
 * "Closed · opens Monday 9 am", "Open 24 hours", "Not accepting orders". Null when
 * nothing useful is known.
 */
export function describeOpenStatus(status: OpenStatus, t: Translate, hour12 = true): string | null {
    switch (status.state) {
        case 'offline':
            return t('UI.notAcceptingOrders');
        case 'unknown':
            return null;
        case 'open':
            if (status.allDay || status.closesAt === null) return t('UI.openAllDay');
            return t('UI.openClosesAt', { time: formatClock(status.closesAt, hour12) });
        case 'closed':
            if (status.opensAt === null || status.opensOn === null) return t('UI.closed');
            if (status.opensInDays === 0) return t('UI.closedOpensAt', { time: formatClock(status.opensAt, hour12) });
            if (status.opensInDays === 1) return t('UI.closedOpensTomorrow', { time: formatClock(status.opensAt, hour12) });
            return t('UI.closedOpensOn', { day: t(`StoreLocationSchedule.${status.opensOn}`), time: formatClock(status.opensAt, hour12) });
    }
}

/** Whether 12-hour clock times suit the locale (English); others use 24-hour times. */
export function usesTwelveHourClock(locale: string | null | undefined): boolean {
    return !locale || locale.toLowerCase().startsWith('en');
}

/** One or two initials for a monogram, e.g. "Bloom & Co." → "BC". */
export function initials(name: unknown): string {
    const words = String(name ?? '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * A stable, pleasant tint for a name, used behind monograms and missing images so
 * fallbacks look intentional and the same store always gets the same color.
 */
export function tintFor(name: unknown): string {
    const tints = ['#c9d4f0', '#f2c1cf', '#c5e6ec', '#cfe3bd', '#f6dc8a', '#e8cfe9', '#f2d9b4', '#d6d1e6', '#cdd5e3', '#ecdcc2'];
    let hash = 0;
    for (const char of String(name ?? '')) {
        hash = (hash * 31 + char.codePointAt(0)!) % 2_147_483_647;
    }
    return tints[Math.abs(hash) % tints.length];
}
