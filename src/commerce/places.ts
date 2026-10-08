/**
 * Saved places (the customer's address book). A place is a Fleetbase place: `name` is
 * the customer's label ("Home"), `street1`/`street2`/`neighborhood`/`city`/
 * `postal_code` the address, `type` what kind of building, `phone` and
 * `meta.instructions` notes for the driver.
 */

export const PLACE_TYPES = ['apartment', 'house', 'office', 'hotel', 'hospital', 'school', 'other'] as const;

export type PlaceFields = {
    name: string;
    street1: string;
    street2: string;
    neighborhood: string;
    city: string;
    postalCode: string;
    phone: string;
    instructions: string;
    type: string | null;
};

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim());

/** Read a place (SDK instance or plain JSON) into editable fields. */
export function placeFields(place: any): PlaceFields {
    const get = (key: string) => (typeof place?.getAttribute === 'function' ? place.getAttribute(key) : key.split('.').reduce((value: any, part) => value?.[part], place));
    return {
        name: text(get('name')),
        street1: text(get('street1')),
        street2: text(get('street2')),
        neighborhood: text(get('neighborhood')),
        city: text(get('city')),
        postalCode: text(get('postal_code')),
        phone: text(get('phone')),
        instructions: text(get('meta.instructions')),
        type: text(get('type')) || null,
    };
}

/** The attributes to save, with empty optional fields left out of the address. */
export function placeAttributes(fields: PlaceFields): Record<string, any> {
    return {
        // An unlabelled place is listed by its street.
        name: fields.name.trim() || fields.street1.trim(),
        street1: fields.street1.trim(),
        street2: fields.street2.trim() || null,
        neighborhood: fields.neighborhood.trim() || null,
        city: fields.city.trim() || null,
        postal_code: fields.postalCode.trim() || null,
        phone: fields.phone.trim() || null,
        type: fields.type,
        meta: { instructions: fields.instructions.trim() || null },
    };
}

export type PlaceErrors = Partial<Record<'street1', 'required'>>;

/** The street is the one field a driver can't do without; the label falls back to it. */
export function validatePlace(fields: PlaceFields): PlaceErrors {
    return fields.street1.trim() ? {} : { street1: 'required' };
}

/** Title and one-line address for a place in a list. */
export function placeLines(place: any): { title: string; address: string } {
    const fields = placeFields(place);
    const street = [fields.street1, fields.street2].filter(Boolean).join(', ');
    const address = [street, fields.neighborhood, fields.city, fields.postalCode].filter(Boolean).join(', ');
    return { title: fields.name || fields.street1 || address, address: fields.name ? address : [fields.neighborhood, fields.city, fields.postalCode].filter(Boolean).join(', ') };
}

/**
 * Identifies a place: its id once saved to the account, otherwise (a guest's place on
 * this device) its street and pin.
 */
export function placeKey(place: any): string | null {
    if (!place) return null;
    const get = (key: string) => (typeof place.getAttribute === 'function' ? place.getAttribute(key) : place[key]);
    const id = get('id');
    if (id) return String(id);
    const location = get('location');
    return `${text(get('street1'))}|${JSON.stringify(location?.coordinates ?? location ?? null)}`;
}

/** Saved places with the current one first, the rest in their saved order. */
export function sortPlaces<T>(places: T[], current: any): T[] {
    const list = places.filter(Boolean);
    const currentKey = placeKey(current);
    const index = currentKey ? list.findIndex((place) => placeKey(place) === currentKey) : -1;
    if (index <= 0) return list;
    return [list[index], ...list.slice(0, index), ...list.slice(index + 1)];
}

export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

/** A map region around a point; falls back when the point is missing or invalid. */
export function regionAround(coordinates: unknown, fallback: [number, number] = [1.3521, 103.8198], delta = 0.005): Region {
    const [latitude, longitude] = Array.isArray(coordinates) ? coordinates.map(Number) : [NaN, NaN];
    const valid = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && !(latitude === 0 && longitude === 0);
    return { latitude: valid ? latitude : fallback[0], longitude: valid ? longitude : fallback[1], latitudeDelta: delta, longitudeDelta: delta };
}

/** Whether the map has moved far enough (about 5 m) to treat the pin as moved. */
export function movedEnough(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): boolean {
    return Math.abs(a.latitude - b.latitude) > 0.00005 || Math.abs(a.longitude - b.longitude) > 0.00005;
}
