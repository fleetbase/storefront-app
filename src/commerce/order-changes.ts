/**
 * Live changes to an order the customer is following.
 *
 * The store (or the operator) can edit an order after it is placed: a new drop-off, items
 * added, removed or substituted, a new time, notes or totals. Each edit is broadcast as
 * `order.changed` on the order's channels (`order.{public_id}`, `customer.{public_id}` …):
 *
 *   { id, changes: ["dropoff", "items", "contact", "schedule", "notes", "total", "cod_amount"],
 *     summary: "Drop-off changed to 8 Marina View · Iced Latte 2→1", dropoff, cod_amount,
 *     total, currency, changed_by, changed_at }
 *
 * and the customer gets a push `{ type: "order_updated", id }` whose body is the summary.
 */

export type OrderChangeKind = 'dropoff' | 'items' | 'contact' | 'schedule' | 'notes' | 'total' | 'cod_amount';

export type OrderChange = {
    orderId: string | null;
    changes: string[];
    summary: string | null;
    dropoffChanged: boolean;
    total: number | null;
    currency: string | null;
    changedBy: string | null;
    changedAt: string | null;
};

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** The event name of a socket message (`{ event, data }`), or null. */
export function socketEventName(message: any): string | null {
    return text(message?.event) ?? text(message?.type);
}

/** An `order.changed` socket message as a change, or null for any other event. */
export function parseOrderChanged(message: any): OrderChange | null {
    if (socketEventName(message) !== 'order.changed') return null;
    const data = message?.data && typeof message.data === 'object' ? message.data : {};
    const changes = (Array.isArray(data.changes) ? data.changes : []).map((change: unknown) => String(change));
    const total = Number(data.total);
    return {
        orderId: text(data.id),
        changes,
        summary: text(data.summary),
        dropoffChanged: changes.includes('dropoff'),
        total: data.total !== null && data.total !== undefined && Number.isFinite(total) ? total : null,
        currency: text(data.currency),
        changedBy: text(data.changed_by),
        changedAt: text(data.changed_at),
    };
}

/** Push types that mean "this order changed, reload it". */
const ORDER_UPDATE_PUSHES = ['order_updated', 'order_changed'];

/**
 * The order a foreground push is about, when it should refresh that order (an update or
 * any other order event), else null. Push payloads carry the order's public id as `id`
 * (or `order_id`).
 */
export function pushedOrderId(payload: Record<string, any> | null | undefined): string | null {
    if (!payload) return null;
    const id = text(payload.order_id) ?? (typeof payload.id === 'string' && payload.id.startsWith('order_') ? payload.id : null);
    if (!id) return null;
    const type = String(payload.type ?? '');
    return ORDER_UPDATE_PUSHES.includes(type) || type.startsWith('order_') || !type ? id : null;
}

/** Whether a dropoff moved: compares the coordinates of two payload places. */
export function placeMoved(before: any, after: any): boolean {
    const point = (place: any): string | null => {
        const coordinates = place?.location?.coordinates;
        if (Array.isArray(coordinates) && coordinates.length >= 2) return `${Number(coordinates[0]).toFixed(6)},${Number(coordinates[1]).toFixed(6)}`;
        if (place?.latitude != null && place?.longitude != null) return `${Number(place.longitude).toFixed(6)},${Number(place.latitude).toFixed(6)}`;
        return text(place?.id) ?? text(place?.address);
    };
    return point(before) !== point(after);
}

/** Statuses after which the order has left the store with the driver. */
const DISPATCHED_PHASES = ['pickedUp', 'onTheWay', 'delivered', 'collected', 'canceled'];

/**
 * Whether the customer can still ask the store to change the drop-off from the order screen:
 * a delivery that hasn't been dispatched or finished. Later, the chat is the way to reach them.
 */
export function canRequestAddressChange({
    status,
    phase,
    isPickup,
    finished,
    canceled,
}: {
    status: unknown;
    phase: string;
    isPickup: boolean;
    finished: boolean;
    canceled: boolean;
}): boolean {
    if (isPickup || finished || canceled) return false;
    if (String(status ?? '').toLowerCase() === 'dispatched') return false;
    return !DISPATCHED_PHASES.includes(phase);
}
