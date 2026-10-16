export const MAX_RECENT_SEARCHES = 8;

/** Adds a search to the front of the recents, case-insensitively unique, keeping the newest few. */
export function addRecentSearch(recents: unknown, query: string): string[] {
    const term = query.trim();
    const list = Array.isArray(recents) ? recents.filter((item): item is string => typeof item === 'string') : [];
    if (term.length < 2) return list;
    return [term, ...list.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
}

export function removeRecentSearch(recents: unknown, query: string): string[] {
    const list = Array.isArray(recents) ? recents.filter((item): item is string => typeof item === 'string') : [];
    return list.filter((item) => item !== query);
}
