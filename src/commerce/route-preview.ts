/**
 * The checkout's delivery route preview: each store in the cart joined to the delivery
 * address by a dashed arc. The arc is drawn, not looked up, so checkout makes no extra
 * map API call, and its bow makes plain that it isn't the road route. The distance
 * shown is the straight-line distance.
 */

export type LatLng = { latitude: number; longitude: number };
export type Region = LatLng & { latitudeDelta: number; longitudeDelta: number };

const EARTH_RADIUS_M = 6371000;

/** A usable map point from [latitude, longitude], or null for missing or out-of-range values. */
export function toLatLng(coordinates: unknown): LatLng | null {
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    const latitude = Number(coordinates[0]);
    const longitude = Number(coordinates[1]);
    const valid = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && !(latitude === 0 && longitude === 0);
    return valid ? { latitude, longitude } : null;
}

/** Straight-line distance in metres. */
export function straightDistance(a: LatLng, b: LatLng): number {
    const rad = (degrees: number) => (degrees * Math.PI) / 180;
    const dLat = rad(b.latitude - a.latitude);
    const dLng = rad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * A region showing every point, padded so pins at the edge stay inside the strip. A
 * wide, short strip needs extra room above and below, so latitude gets more padding.
 */
export function regionFor(points: LatLng[], { minDelta = 0.01, padding = 0.6 }: { minDelta?: number; padding?: number } = {}): Region | null {
    if (points.length === 0) return null;
    const lats = points.map((point) => point.latitude);
    const lngs = points.map((point) => point.longitude);
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(minDelta, (maxLat - minLat) * (1 + padding * 2)),
        longitudeDelta: Math.max(minDelta, (maxLng - minLng) * (1 + padding)),
    };
}

/**
 * Points along a gentle arc from `from` to `to`: a quadratic curve whose control point
 * sits off the midpoint, to the left of the direction of travel, by `bend` times the
 * distance between them.
 */
export function arcPoints(from: LatLng, to: LatLng, { bend = 0.25, steps = 24 }: { bend?: number; steps?: number } = {}): LatLng[] {
    const dLat = to.latitude - from.latitude;
    const dLng = to.longitude - from.longitude;
    const control = { latitude: (from.latitude + to.latitude) / 2 + dLng * bend, longitude: (from.longitude + to.longitude) / 2 - dLat * bend };
    return Array.from({ length: steps + 1 }, (_, index) => {
        const t = index / steps;
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const c = t * t;
        return { latitude: a * from.latitude + b * control.latitude + c * to.latitude, longitude: a * from.longitude + b * control.longitude + c * to.longitude };
    });
}

/** "BC" for "Bloom & Co.", "T" for "Tiong", "?" for nothing. */
export function initials(name: string | null | undefined): string {
    const words = String(name ?? '')
        .split(/\s+/)
        .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
        .filter(Boolean);
    if (words.length === 0) return '?';
    return words
        .slice(0, 2)
        .map((word) => word[0]!.toUpperCase())
        .join('');
}
