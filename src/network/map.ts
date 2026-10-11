export type LatLng = { latitude: number; longitude: number };
export type Region = LatLng & { latitudeDelta: number; longitudeDelta: number };

const EARTH_RADIUS_METERS = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in meters. */
export function distanceMeters(from: LatLng, to: LatLng): number {
    const dLat = toRadians(to.latitude - from.latitude);
    const dLng = toRadians(to.longitude - from.longitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function isValidCoordinate(point: Partial<LatLng> | null | undefined): point is LatLng {
    return (
        !!point &&
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        Math.abs(point.latitude as number) <= 90 &&
        Math.abs(point.longitude as number) <= 180 &&
        !(point.latitude === 0 && point.longitude === 0)
    );
}

/**
 * The first region to show: around the customer when their location is known (with the
 * nearest stores in view), otherwise fitted to every store, otherwise null.
 */
export function initialRegion(customer: LatLng | null, stores: LatLng[], { minimumDelta = 0.02, padding = 1.4, nearest = 5 } = {}): Region | null {
    const points = stores.filter(isValidCoordinate);
    if (customer && isValidCoordinate(customer)) {
        const closest = [...points].sort((a, b) => distanceMeters(customer, a) - distanceMeters(customer, b)).slice(0, nearest);
        const latitudeSpan = Math.max(minimumDelta, ...closest.map((point) => Math.abs(point.latitude - customer.latitude) * 2 * padding));
        const longitudeSpan = Math.max(minimumDelta, ...closest.map((point) => Math.abs(point.longitude - customer.longitude) * 2 * padding));
        return { latitude: customer.latitude, longitude: customer.longitude, latitudeDelta: latitudeSpan, longitudeDelta: longitudeSpan };
    }
    if (points.length === 0) return null;
    const latitudes = points.map((point) => point.latitude);
    const longitudes = points.map((point) => point.longitude);
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...latitudes), Math.max(...latitudes), Math.min(...longitudes), Math.max(...longitudes)];
    return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(minimumDelta, (maxLat - minLat) * padding),
        longitudeDelta: Math.max(minimumDelta, (maxLng - minLng) * padding),
    };
}
