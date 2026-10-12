/**
 * Food trucks, as the Trucks screens use them: where each truck is, whether it is live,
 * which zone it serves, the store it belongs to (in a Network) and what it sells.
 *
 * A truck comes from `storefront/v1/food-trucks` as plain JSON: `vehicle` (name, plate,
 * photo, `location` GeoJSON point, `online`), `zone` and `service_area` (`border` GeoJSON
 * polygon), `catalogs` → `categories` → `products`, and `store` in a Network.
 */

export type LatLng = { latitude: number; longitude: number };

export type TruckCategory = { key: string; id: string | null; name: string; iconUrl: string | null; truckId: string };

export type TruckSummary = {
    id: string;
    name: string;
    photoUrl: string | null;
    live: boolean;
    coordinate: LatLng | null;
    zoneId: string | null;
    zoneName: string | null;
    zoneBorder: LatLng[][];
    storeId: string | null;
    storeName: string | null;
    store: any | null;
    catalogs: any[];
    raw: any;
};

const get = (item: any, key: string) => {
    if (!item) return undefined;
    if (typeof item.getAttribute === 'function') return item.getAttribute(key);
    return key.split('.').reduce((value: any, part) => (value == null ? undefined : value[part]), item);
};

export function pointOf(geo: any): LatLng | null {
    const coordinates = geo?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    const latitude = Number(coordinates[1]);
    const longitude = Number(coordinates[0]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) return null;
    return { latitude, longitude };
}

/** A GeoJSON Polygon or MultiPolygon border as rings of points (outer rings only). */
export function ringsOf(border: any): LatLng[][] {
    if (!border?.coordinates) return [];
    const polygons = border.type === 'MultiPolygon' ? border.coordinates : [border.coordinates];
    return polygons
        .map((polygon: any) => (Array.isArray(polygon?.[0]) ? polygon[0] : []))
        .map((ring: any[]) => ring.map(([lng, lat]: number[]) => ({ latitude: Number(lat), longitude: Number(lng) })).filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)))
        .filter((ring: LatLng[]) => ring.length >= 3);
}

/** Ray casting: whether the point lies inside the ring. */
export function insideRing(point: LatLng, ring: LatLng[]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i];
        const b = ring[j];
        const crosses = a.latitude > point.latitude !== b.latitude > point.latitude && point.longitude < ((b.longitude - a.longitude) * (point.latitude - a.latitude)) / (b.latitude - a.latitude) + a.longitude;
        if (crosses) inside = !inside;
    }
    return inside;
}

export function insideZone(point: LatLng | null, rings: LatLng[][]): boolean {
    return !!point && rings.some((ring) => insideRing(point, ring));
}

export function truckName(truck: any): string {
    const vehicleName = [get(truck, 'vehicle.year'), get(truck, 'vehicle.make'), get(truck, 'vehicle.model')].filter(Boolean).join(' ');
    return get(truck, 'name') || get(truck, 'vehicle.name') || vehicleName || get(truck, 'vehicle.plate_number') || 'Food truck';
}

export function summarizeTruck(truck: any): TruckSummary {
    const online = get(truck, 'online') ?? get(truck, 'vehicle.online');
    return {
        id: String(get(truck, 'id') ?? ''),
        name: truckName(truck),
        photoUrl: get(truck, 'vehicle.photo_url') ?? null,
        live: online === true || online === 1 || online === '1',
        coordinate: pointOf(get(truck, 'location') ?? get(truck, 'vehicle.location')),
        zoneId: get(truck, 'zone.id') ?? null,
        zoneName: get(truck, 'zone.name') ?? null,
        zoneBorder: ringsOf(get(truck, 'zone.border')),
        storeId: get(truck, 'store.id') ?? null,
        storeName: get(truck, 'store.name') ?? null,
        store: get(truck, 'store') ?? null,
        catalogs: Array.isArray(get(truck, 'catalogs')) ? get(truck, 'catalogs') : [],
        raw: typeof truck?.serialize === 'function' ? truck.serialize() : truck,
    };
}

/** The zone the customer is in, from the trucks' zones (a truck carries its zone's border). */
export function customerZone(trucks: TruckSummary[], customer: LatLng | null): { id: string | null; name: string | null } | null {
    if (!customer) return null;
    const match = trucks.find((truck) => insideZone(customer, truck.zoneBorder));
    return match ? { id: match.zoneId, name: match.zoneName } : null;
}

/** Every category the given trucks sell, once each by name, keeping which truck sells it. */
export function truckCategories(trucks: TruckSummary[]): TruckCategory[] {
    const seen = new Map<string, TruckCategory>();
    for (const truck of trucks) {
        for (const catalog of truck.catalogs) {
            for (const category of Array.isArray(catalog?.categories) ? catalog.categories : []) {
                const name = String(category?.name ?? '').trim();
                if (!name || seen.has(name.toLowerCase())) continue;
                seen.set(name.toLowerCase(), { key: name.toLowerCase(), id: category?.id ?? null, name, iconUrl: category?.icon_url ?? null, truckId: truck.id });
            }
        }
    }
    return [...seen.values()];
}

/** Products across a truck's catalogs, each with the category it is in. */
export function truckProducts(truck: TruckSummary): Array<{ product: any; categoryId: string | null; categoryName: string; catalogName: string }> {
    const items: Array<{ product: any; categoryId: string | null; categoryName: string; catalogName: string }> = [];
    for (const catalog of truck.catalogs) {
        for (const category of Array.isArray(catalog?.categories) ? catalog.categories : []) {
            for (const product of Array.isArray(category?.products) ? category.products : []) {
                items.push({ product, categoryId: category?.id ?? null, categoryName: String(category?.name ?? ''), catalogName: String(catalog?.name ?? '') });
            }
        }
    }
    return items;
}
