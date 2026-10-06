import { describeOpenStatus, formatDistance, openStatus, type OpenStatus, type OpeningHour, type Translate } from './format';

/**
 * Generic images the API returns when a store or network has no logo or backdrop.
 * They are treated as missing so screens can show a monogram or pattern instead.
 */
export const PLACEHOLDER_IMAGES = ['image-file-icon.png', 'default-storefront-backdrop.png', 'no-avatar.png'];

/** Tags operators use to mark stores that take bookings. */
export const BOOKABLE_TAGS = ['services', 'service', 'bookable', 'booking', 'appointments'];

type Attributes = Record<string, any>;

/** Reads an attribute from an SDK resource (`getAttribute`) or a plain object. */
export function attr<T = any>(source: unknown, key: string, fallback?: T): T {
    if (!source || typeof source !== 'object') return fallback as T;
    const resource = source as { getAttribute?: (key: string, fallback?: unknown) => unknown; attributes?: Attributes };
    if (typeof resource.getAttribute === 'function') {
        const value = resource.getAttribute(key);
        return (value === undefined || value === null ? fallback : value) as T;
    }
    const value = key.split('.').reduce<any>((current, part) => (current === undefined || current === null ? undefined : current[part]), source);
    return (value === undefined || value === null ? fallback : value) as T;
}

/** The URL when it points at a real image, otherwise null. */
export function usableImageUrl(url: unknown): string | null {
    if (typeof url !== 'string' || url.trim() === '') return null;
    return PLACEHOLDER_IMAGES.some((placeholder) => url.includes(placeholder)) ? null : url;
}

/** Weekly hours from a store's locations (the first location that has any). */
export function storeHours(store: unknown): OpeningHour[] {
    const locations = attr<any[]>(store, 'locations', []);
    for (const location of Array.isArray(locations) ? locations : []) {
        const hours = attr<OpeningHour[]>(location, 'hours', []);
        if (Array.isArray(hours) && hours.length > 0) return hours;
    }
    return [];
}

export type StoreSummary = {
    id: string | null;
    name: string;
    description: string | null;
    logoUrl: string | null;
    backdropUrl: string | null;
    rating: number | null;
    category: string | null;
    distance: string | null;
    status: OpenStatus;
    statusText: string | null;
    /** Closed, or not accepting orders: muted on cards but still browsable. */
    muted: boolean;
    bookable: boolean;
    tags: string[];
};

/** Everything a store card or header shows, derived from a store resource. */
export function storeSummary(store: unknown, { now = new Date(), t, hour12 = true }: { now?: Date; t: Translate; hour12?: boolean }): StoreSummary {
    const rating = Number(attr(store, 'rating'));
    const tags = (attr<unknown[]>(store, 'tags', []) ?? []).filter((tag): tag is string => typeof tag === 'string');
    const status = openStatus(storeHours(store), now, attr<boolean | null>(store, 'online', null));
    const category = attr<unknown>(store, 'category');

    return {
        id: attr<string | null>(store, 'id', null),
        name: attr<string>(store, 'name', ''),
        description: attr<string | null>(store, 'description', null),
        logoUrl: usableImageUrl(attr(store, 'logo_url')),
        backdropUrl: usableImageUrl(attr(store, 'backdrop_url')),
        rating: Number.isFinite(rating) && rating > 0 ? Math.round(rating * 10) / 10 : null,
        category: typeof category === 'string' ? category : (attr<string | null>(category, 'name', null) ?? null),
        distance: formatDistance(attr(store, 'distance')),
        status,
        statusText: describeOpenStatus(status, t, hour12),
        muted: status.state === 'offline' || status.state === 'closed',
        bookable: tags.some((tag) => BOOKABLE_TAGS.includes(tag.toLowerCase())),
        tags,
    };
}
