/** Sort and filter state for the store directory, and the store query it produces. */

export const DIRECTORY_SORTS = ['nearest', 'highest_rated', 'popular', 'trending', 'newest'] as const;
export type DirectorySort = (typeof DIRECTORY_SORTS)[number];

/** Distance choices in meters (the API's `maximum_distance` unit). */
export const DIRECTORY_DISTANCES = [1000, 3000, 5000] as const;

export type DirectoryFilters = {
    sort: DirectorySort;
    tags: string[];
    openNow: boolean;
    maximumDistance: number | null;
};

export const DEFAULT_DIRECTORY_FILTERS: DirectoryFilters = { sort: 'nearest', tags: [], openNow: false, maximumDistance: null };

/** How many filters (not the sort) are active, for the "Filters · 2" button. */
export function activeFilterCount(filters: DirectoryFilters): number {
    return filters.tags.length + Number(filters.openNow) + Number(filters.maximumDistance !== null);
}

/** `coordinates` is what `getCoordinates()` returns ([latitude, longitude]) or a "lat,lng" string. */
export type DirectoryQueryOptions = { categoryId?: string | null; coordinates?: string | number[] | null; offset?: number; limit?: number };

/**
 * The `network.getStores` parameters for the directory. Distance filtering needs a
 * location, so it is only sent with one; "uncategorized" lists stores without a category.
 */
export function buildDirectoryQuery(filters: DirectoryFilters, { categoryId = null, coordinates = null, offset = 0, limit = 20 }: DirectoryQueryOptions = {}): Record<string, unknown> {
    const query: Record<string, unknown> = { limit, offset, sort: filters.sort, with_locations: true };
    if (categoryId === 'uncategorized') query.without_category = true;
    else if (categoryId) query.category = categoryId;
    if (filters.tags.length) query.tagged = filters.tags;
    if (filters.openNow) query.online = true;
    if (coordinates) {
        query.location = coordinates;
        if (filters.maximumDistance !== null) query.maximum_distance = filters.maximumDistance;
    }
    return query;
}
