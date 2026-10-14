/**
 * The store's clock. A store's hours, its booking slots and the times customers book are
 * the store's wall-clock times, which only match the phone's when both are in the same
 * timezone. The API sends each store's current offset (`utc_offset`, minutes east of UTC),
 * and these helpers read a moment on that clock.
 *
 * `Intl`'s `timeZone` isn't used: some runtimes (Hermes without full ICU) ignore it. With
 * no offset (an older server) every helper falls back to the device clock, as before.
 */

/** Real offsets run from UTC−12:00 to UTC+14:00. */
const MIN_OFFSET = -12 * 60;
const MAX_OFFSET = 14 * 60;

/** A usable offset in minutes east of UTC from a number or numeric string, else null. */
export function parseUtcOffset(value: unknown): number | null {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes < MIN_OFFSET || minutes > MAX_OFFSET) return null;
    return Math.round(minutes);
}

/**
 * A date whose local getters (`getDay`, `getHours`, `getDate`...) and local formatting read
 * the store's wall clock at `date`. Only for reading and formatting: it is not the same
 * instant, so never compare it with real times. Without an offset it is `date` itself.
 */
export function toStoreWall(date: Date, offset: number | null | undefined): Date {
    if (offset === null || offset === undefined || !Number.isFinite(offset)) return date;
    const shifted = new Date(date.getTime() + offset * 60000);
    // Rebuilt from the UTC fields so a device DST change between the two can't shift it.
    return new Date(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        shifted.getUTCDate(),
        shifted.getUTCHours(),
        shifted.getUTCMinutes(),
        shifted.getUTCSeconds(),
        shifted.getUTCMilliseconds()
    );
}

/** The store's wall clock now (see `toStoreWall`). */
export function storeNow(offset: number | null | undefined, now: Date = new Date()): Date {
    return toStoreWall(now, offset);
}

/** Minutes since midnight on the store's clock at `date`. */
export function storeMinutes(date: Date, offset: number | null | undefined): number {
    const wall = toStoreWall(date, offset);
    return wall.getHours() * 60 + wall.getMinutes();
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

/** "+08:00" / "-05:30" for an offset in minutes east of UTC. */
export function offsetSuffix(offset: number): string {
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(Math.round(offset));
    return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * ISO 8601 for a time on the store's calendar, e.g. "2026-10-14T10:00:00+08:00" for
 * `minutes` 600 on "2026-10-14" at a store eight hours east of UTC. Without an offset the
 * time is taken on the device clock and carries the device's offset, as before.
 */
export function storeClockIso(date: string, minutes: number, offset: number | null | undefined): string {
    const [year, month, day] = date.split('-').map(Number);
    if (offset === null || offset === undefined || !Number.isFinite(offset)) {
        const local = new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
        const deviceOffset = -local.getTimezoneOffset();
        return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}:00${offsetSuffix(deviceOffset)}`;
    }
    // Through UTC so minutes past midnight roll into the next day.
    const wall = new Date(Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60));
    return `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:00${offsetSuffix(offset)}`;
}
