import { getArray, setArray, setBool } from '../hooks/use-storage';

export function addOrderToHistoryCache(customerId, order, limit = 25) {
    if (!customerId || !order) return;

    const key = `${customerId}_orders`;
    const existing = getArray(key) || [];
    const serialized = typeof order.serialize === 'function' ? order.serialize() : order;

    // de-dupe by id
    const withoutDupes = existing.filter((o) => o.id !== serialized.id);

    // prepend new order
    const next = [serialized, ...withoutDupes].slice(0, limit);

    setArray(key, next);
}

// mark that remote history should be refreshed later
export function markOrderHistoryDirty(customerId) {
    if (!customerId) return;
    setBool(`${customerId}_orders_dirty`, true);
}
