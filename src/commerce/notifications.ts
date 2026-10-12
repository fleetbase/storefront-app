/**
 * The customer's notification inbox (storefront/v1/notifications), sent with the
 * customer token:
 *
 * - GET    notifications?limit&offset&unread&type
 * - GET    notifications/unread-count            { count }
 * - PUT    notifications/{id}/read
 * - PUT    notifications/read-all
 * - DELETE notifications/{id}
 * - GET    notifications/preferences             { order_updates, promotions }
 * - PUT    notifications/preferences
 *
 * Each item is `{ id, type, title, body, image, data, is_read, created_at }`; `data` holds
 * the ids that say where tapping it should go.
 */

export type Request = (path: string, data?: Record<string, any>, method?: 'GET' | 'PUT' | 'DELETE') => Promise<any>;

export type NotificationKind = 'order' | 'chat' | 'offer' | 'other';

/** Where tapping a notification goes: a route and its params, or an external link. */
export type NotificationTarget = { route: string; params: Record<string, any> } | { url: string } | null;

export type InboxItem = {
    id: string;
    kind: NotificationKind;
    type: string;
    title: string;
    body: string;
    imageUrl: string | null;
    read: boolean;
    createdAt: string | null;
    target: NotificationTarget;
};

export type Preferences = { order_updates: boolean; promotions: boolean };
export const DEFAULT_PREFERENCES: Preferences = { order_updates: true, promotions: true };

const OFFER_TYPES = ['campaign', 'promotional', 'promotion'];

export function notificationKind(type: string, data: Record<string, any>): NotificationKind {
    if (type === 'order_chat_message') return 'chat';
    if (OFFER_TYPES.includes(type)) return 'offer';
    if (data.order_id || type.startsWith('order_')) return 'order';
    return 'other';
}

/** The screen a notification opens, from its type and the ids in its data. */
export function notificationTarget(kind: NotificationKind, data: Record<string, any>): NotificationTarget {
    if (kind === 'chat' && data.order_id) return { route: 'OrderChat', params: { orderId: data.order_id } };
    if (kind === 'order' && data.order_id) return { route: 'Order', params: { orderId: data.order_id } };
    if (kind === 'offer') {
        const id = data.action_id;
        switch (data.action) {
            case 'promotion':
                return id || data.promotion_id ? { route: 'Offer', params: { offerId: id ?? data.promotion_id } } : null;
            case 'store':
                return id ? { route: 'NetworkStore', params: { storeId: id } } : null;
            case 'product':
                return id ? { route: 'Product', params: { productId: id, storeId: data.store_id } } : null;
            case 'category':
                return id ? { route: 'NetworkCategory', params: { categoryId: id } } : null;
            case 'url':
                return typeof data.action_url === 'string' && /^https?:\/\//.test(data.action_url) ? { url: data.action_url } : null;
        }
        if (data.promotion_id) return { route: 'Offer', params: { offerId: data.promotion_id } };
        if (data.store_id) return { route: 'NetworkStore', params: { storeId: data.store_id } };
    }
    return null;
}

/**
 * Where a tapped push goes. Push payloads carry the same keys as the inbox data, except
 * order updates, which send the order's public id as `id`.
 */
export function targetFromPush(payload: Record<string, any> | null | undefined): NotificationTarget {
    const data = { ...(payload ?? {}) };
    if (!data.order_id && typeof data.id === 'string' && data.id.startsWith('order_')) data.order_id = data.id;
    const type = String(data.type ?? '');
    return notificationTarget(notificationKind(type, data), data);
}

export function parseNotification(json: any): InboxItem {
    const data = json?.data && typeof json.data === 'object' ? json.data : {};
    const type = String(json?.type ?? 'notification');
    const kind = notificationKind(type, data);
    return {
        id: String(json?.id ?? ''),
        kind,
        type,
        title: String(json?.title ?? ''),
        body: String(json?.body ?? ''),
        imageUrl: typeof json?.image === 'string' && json.image ? json.image : null,
        read: json?.is_read === true,
        createdAt: json?.created_at ?? null,
        target: notificationTarget(kind, data),
    };
}

/** "today" for notifications from the viewer's current day, "earlier" otherwise. */
export function dayGroup(createdAt: string | null, now: Date): 'today' | 'earlier' {
    if (!createdAt) return 'earlier';
    const at = new Date(createdAt);
    return at.toDateString() === now.toDateString() ? 'today' : 'earlier';
}

export async function fetchInbox(request: Request, { limit = 25, offset = 0, kind = 'all' }: { limit?: number; offset?: number; kind?: 'all' | 'orders' | 'offers' } = {}): Promise<InboxItem[]> {
    const json = await request('notifications', { limit, offset });
    const items = (Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []).map(parseNotification).filter((item: InboxItem) => item.id);
    if (kind === 'orders') return items.filter((item: InboxItem) => item.kind === 'order' || item.kind === 'chat');
    if (kind === 'offers') return items.filter((item: InboxItem) => item.kind === 'offer');
    return items;
}

export async function fetchUnreadCount(request: Request): Promise<number> {
    const json = await request('notifications/unread-count');
    const count = Number(json?.count);
    return Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
}

export async function markRead(request: Request, id: string): Promise<void> {
    await request(`notifications/${encodeURIComponent(id)}/read`, {}, 'PUT');
}

export async function markAllRead(request: Request): Promise<void> {
    await request('notifications/read-all', {}, 'PUT');
}

export async function deleteNotification(request: Request, id: string): Promise<void> {
    await request(`notifications/${encodeURIComponent(id)}`, {}, 'DELETE');
}

function parsePreferences(json: any): Preferences {
    return { order_updates: json?.order_updates !== false, promotions: json?.promotions !== false };
}

export async function fetchPreferences(request: Request): Promise<Preferences> {
    return parsePreferences(await request('notifications/preferences'));
}

export async function updatePreferences(request: Request, changes: Partial<Preferences>): Promise<Preferences> {
    return parsePreferences(await request('notifications/preferences', changes, 'PUT'));
}
