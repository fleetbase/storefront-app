export type StorefrontMode = 'store' | 'marketplace';

export type DiscoveryState = {
    query: string;
    category: string | null;
    tags: string[];
    sort: string;
    online: boolean | null;
    maximumDistance: number | null;
    offset: number;
};

export const DEFAULT_DISCOVERY_STATE: DiscoveryState = {
    query: '',
    category: null,
    tags: [],
    sort: 'nearest',
    online: null,
    maximumDistance: null,
    offset: 0,
};

export function getStorefrontMode(owner: any): StorefrontMode {
    return owner?.is_network === true ? 'marketplace' : 'store';
}

export function getStorefrontRoute(owner: any): 'StoreNavigator' | 'NetworkNavigator' {
    return getStorefrontMode(owner) === 'marketplace' ? 'NetworkNavigator' : 'StoreNavigator';
}

export function getStorefrontStorageScope(storefrontKey?: string, ownerId?: string): string {
    if (ownerId) {
        return ownerId;
    }

    const key = storefrontKey || 'unconfigured';
    const prefix = key.startsWith('network_') ? 'network' : key.startsWith('store_') ? 'store' : 'storefront';
    let hash = 5381;
    for (let index = 0; index < key.length; index += 1) {
        hash = (hash * 33 + key.charCodeAt(index)) % 2147483647;
    }

    return `${prefix}-${hash.toString(36)}`;
}

export function getScopedStorageKey(scope: string, key: string, storeId?: string): string {
    return ['storefront', scope, storeId, key].filter(Boolean).join(':');
}

export function serializeSdkResource(resource: any): any {
    return resource && typeof resource.serialize === 'function' ? resource.serialize() : resource;
}

export function totalCartQuantity(items: any[] = []): number {
    return items.reduce((total, item) => total + Math.max(0, Number(item?.quantity) || 0), 0);
}

export function groupCartItemsByStore(items: any[] = []): Record<string, any[]> {
    return items.reduce((groups, item) => {
        const storeId = item?.store_id || item?.store?.id || 'unknown';
        groups[storeId] = [...(groups[storeId] || []), item];
        return groups;
    }, {} as Record<string, any[]>);
}

export function getMarketplaceCartDecision(items: any[] = [], targetStoreId?: string, multiCartEnabled = false): 'add' | 'replace' {
    if (multiCartEnabled || items.length === 0) return 'add';
    const existingStores = new Set(items.map((item) => item?.store_id).filter(Boolean));
    return targetStoreId && (existingStores.size === 0 || existingStores.has(targetStoreId)) ? 'add' : 'replace';
}

export function canCombineMarketplaceCart(items: any[] = []): boolean {
    const currencies = new Set(items.map((item) => item?.currency).filter(Boolean));
    return currencies.size <= 1 && !items.some((item) => !item?.store_id || !item?.store_location_id);
}

export function getCartOriginIds(cart: any): string[] {
    if (!cart?.contents || typeof cart.contents !== 'function') return [];
    const items = cart.contents();
    const foodTruckIds = [...new Set(items.map((item: any) => item.food_truck_id).filter(Boolean))] as string[];
    if (foodTruckIds.length) return foodTruckIds;
    return [...new Set(items.map((item: any) => item.store_location_id).filter(Boolean))] as string[];
}

export function getCartQuoteOrigin(cart: any): string | string[] | null {
    const origins = getCartOriginIds(cart);
    return origins.length <= 1 ? origins[0] || null : origins;
}

export function buildMarketplaceStoreQuery(discovery: DiscoveryState, offset = 0, coordinates?: string | null): Record<string, any> {
    const params: Record<string, any> = { limit: 20, offset, sort: discovery.sort };
    if (discovery.query.trim()) params.query = discovery.query.trim();
    if (discovery.category) params.category = discovery.category;
    if (discovery.tags.length) params.tagged = discovery.tags;
    if (discovery.online !== null) params.online = discovery.online;
    if (discovery.maximumDistance !== null) params.maximum_distance = discovery.maximumDistance;
    if (coordinates) params.location = coordinates;
    return params;
}

export function mergeMarketplacePage(current: any[], next: any[], append = false): any[] {
    if (!append) return next;
    const seen = new Set(current.map((item) => item?.id));
    return [...current, ...next.filter((item) => !seen.has(item?.id))];
}

export function getMappableMarketplaceLocations(locations: any[] = []): any[] {
    return locations.filter((location) => {
        const { latitude, longitude } = getMarketplaceLocationCoordinates(location);
        return Number.isFinite(latitude) && Number.isFinite(longitude);
    });
}

export function getMarketplaceLocationCoordinates(location: any): { latitude: number; longitude: number } {
    return {
        latitude: Number(location?.latitude ?? location?.getAttribute?.('latitude')),
        longitude: Number(location?.longitude ?? location?.getAttribute?.('longitude')),
    };
}

export function getLocationFallbackState(permission: string, hasStoredOrManualLocation: boolean): 'ready' | 'request' | 'manual' {
    if (hasStoredOrManualLocation || permission === 'granted') return 'ready';
    if (permission === 'denied' || permission === 'blocked' || permission === 'unavailable') return 'manual';
    return 'request';
}

export function shouldAcceptMarketplaceRequest(requestId: number, latestRequestId: number): boolean {
    return requestId === latestRequestId;
}
