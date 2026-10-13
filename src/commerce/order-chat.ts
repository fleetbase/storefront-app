/**
 * Order chats (storefront/v1/orders/{id}/chat), sent with the customer token. An order has
 * two threads for the customer:
 *
 * - the driver thread (no `kind`): the customer, the driver and any store staff who join;
 *   it opens once a driver is assigned (409 driver_not_assigned before that).
 * - the store thread (`kind=customer`): the customer and the store's staff; open from the
 *   moment the order is placed.
 *
 * - GET  orders/{id}/chat[?kind]                    the chat with its latest messages
 * - GET  orders/{id}/chat/messages?before&limit[&kind]   older messages
 * - POST orders/{id}/chat/messages  { content?, files?, kind? }   423 chat_closed once the order ends
 * - POST orders/{id}/chat/read      { kind? }       mark the other side's messages read
 * - POST orders/{id}/address-change-request  { message, place? }   ask the store to change the drop-off
 *
 * Participants and senders carry a role (customer, driver, store or system). System
 * messages (`meta.system`, `meta.kind` such as `order_updated`) are notices from the order
 * itself, shown centred rather than as someone's bubble.
 *
 * New messages arrive on the chat's socket channel (`chat.{id}`) as `chat_message.*`
 * events; the app re-reads the latest page when one arrives.
 */

import { ApiError } from './http';

export type ChatRequest = (path: string, options?: { method?: 'GET' | 'POST'; query?: Record<string, any>; body?: Record<string, any> }) => Promise<any>;

/** Which thread: the store's (`customer`) or the driver's (the default, sent without a kind). */
export type ChatKind = 'customer' | 'driver';

export type ChatRole = 'customer' | 'driver' | 'store' | 'system';

export type ChatAttachment = { id: string; url: string; type: string | null };

export type ChatMessage = {
    id: string;
    content: string;
    mine: boolean;
    senderName: string | null;
    /** Who sent it; null when the server doesn't say (older servers). */
    senderRole: ChatRole | null;
    /** A notice from the order itself (an update, an address change request …). */
    system: boolean;
    systemKind: string | null;
    attachments: ChatAttachment[];
    read: boolean;
    createdAt: string | null;
    /** Sent from this device and not confirmed yet, or failed to send. */
    state?: 'sending' | 'failed';
};

export type ChatParticipant = { id: string; role: ChatRole; name: string | null; avatarUrl: string | null; online: boolean };

export type OrderChat = {
    id: string;
    channel: string | null;
    orderId: string | null;
    kind: ChatKind;
    status: 'open' | 'closed';
    participants: ChatParticipant[];
    messages: ChatMessage[];
    unread: number;
};

export const QUICK_REPLIES = ['comingDown', 'leaveAtDoor', 'callOnArrival', 'whereAreYou'] as const;
/** Quick replies for the store thread: things to ask the store rather than the driver. */
export const STORE_QUICK_REPLIES = ['changeAddress', 'whereIsOrder', 'pleaseCall'] as const;

export function quickReplies(kind: ChatKind): readonly string[] {
    return kind === 'customer' ? STORE_QUICK_REPLIES : QUICK_REPLIES;
}

const ROLES: ChatRole[] = ['customer', 'driver', 'store', 'system'];

/** A role from the API. Participants without one are drivers (servers before store chat). */
function role(value: unknown, fallback: ChatRole | null): ChatRole | null {
    return ROLES.includes(value as ChatRole) ? (value as ChatRole) : fallback;
}

const flag = (value: unknown): boolean => value === true || value === 1 || value === '1' || value === 'true';
export const MAX_CHAT_PHOTOS = 4;

export function parseChatMessage(json: any): ChatMessage {
    const system = flag(json?.meta?.system) || json?.sender?.role === 'system';
    return {
        id: String(json?.id ?? ''),
        content: String(json?.content ?? ''),
        mine: json?.is_mine === true && !system,
        senderName: json?.sender?.name ?? null,
        senderRole: system ? 'system' : role(json?.sender?.role, null),
        system,
        systemKind: typeof json?.meta?.kind === 'string' ? json.meta.kind : null,
        attachments: (Array.isArray(json?.attachments) ? json.attachments : [])
            .filter((attachment: any) => typeof attachment?.url === 'string')
            .map((attachment: any) => ({ id: String(attachment.id ?? attachment.url), url: attachment.url, type: attachment.type ?? null })),
        read: json?.read === true,
        createdAt: json?.created_at ?? null,
    };
}

export function parseChat(json: any, requested: ChatKind = 'driver'): OrderChat {
    return {
        id: String(json?.id ?? ''),
        channel: typeof json?.channel === 'string' ? json.channel : null,
        orderId: json?.order ?? null,
        kind: json?.kind === 'customer' ? 'customer' : json?.kind === 'driver' || json?.kind === 'group' ? 'driver' : requested,
        status: json?.status === 'closed' ? 'closed' : 'open',
        participants: (Array.isArray(json?.participants) ? json.participants : []).map((participant: any) => ({
            id: String(participant?.id ?? ''),
            role: role(participant?.role, 'driver') as ChatRole,
            name: participant?.name ?? null,
            avatarUrl: participant?.avatar_url ?? null,
            online: participant?.is_online === true,
        })),
        messages: (Array.isArray(json?.messages) ? json.messages : []).map(parseChatMessage).filter((message: ChatMessage) => message.id),
        unread: Math.max(0, Number(json?.unread_count) || 0),
    };
}

const time = (message: ChatMessage) => (message.createdAt ? new Date(message.createdAt).getTime() : Infinity);

/**
 * Messages merged by id and ordered oldest first. Server copies replace local ones;
 * messages still sending or failed stay at the end until they are confirmed.
 */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
    const byId = new Map<string, ChatMessage>();
    for (const message of current) byId.set(message.id, message);
    for (const message of incoming) byId.set(message.id, message);
    const all = [...byId.values()];
    const confirmed = all.filter((message) => !message.state).sort((a, b) => time(a) - time(b));
    const local = all.filter((message) => message.state);
    return [...confirmed, ...local];
}

/**
 * The store thread is asked for by kind (in the query, and in the body of a POST); the
 * driver thread is the chat's default and is requested exactly as before store chat.
 */
const isStore = (kind: ChatKind) => kind === 'customer';
const chatPath = (orderId: string, rest = '') => `orders/${encodeURIComponent(orderId)}/chat${rest}`;

/**
 * A server without store chat ignores `kind` and answers with the driver thread (or 409
 * before a driver is assigned). Its answer must not be shown as the store thread: the
 * customer would be writing to the driver.
 */
function isStoreThread(json: any): boolean {
    if (typeof json?.kind === 'string') return json.kind === 'customer';
    const participants = Array.isArray(json?.participants) ? json.participants : [];
    return !participants.some((participant: any) => participant?.role === 'driver' || participant?.role === undefined);
}

export async function fetchChat(request: ChatRequest, orderId: string, kind: ChatKind = 'driver'): Promise<OrderChat> {
    if (!isStore(kind)) return parseChat(await request(chatPath(orderId)), kind);
    const json = await request(chatPath(orderId), { query: { kind } });
    if (!isStoreThread(json)) throw new ApiError('Store chat is not available', 409, 'store_chat_unavailable');
    return parseChat(json, kind);
}

export async function fetchOlderMessages(request: ChatRequest, orderId: string, beforeId: string, limit = 30, kind: ChatKind = 'driver'): Promise<ChatMessage[]> {
    const json = await request(chatPath(orderId, '/messages'), { query: { before: beforeId, limit, ...(isStore(kind) ? { kind } : {}) } });
    return (Array.isArray(json?.messages) ? json.messages : []).map(parseChatMessage).filter((message: ChatMessage) => message.id);
}

export async function sendChatMessage(
    request: ChatRequest,
    orderId: string,
    { content = '', photos = [], kind = 'driver' }: { content?: string; photos?: { data: string; type: string }[]; kind?: ChatKind }
): Promise<ChatMessage> {
    const body: Record<string, any> = isStore(kind) ? { kind } : {};
    if (content.trim()) body.content = content.trim().slice(0, 2000);
    if (photos.length) body.files = photos.slice(0, MAX_CHAT_PHOTOS);
    const json = await request(chatPath(orderId, '/messages'), isStore(kind) ? { method: 'POST', query: { kind }, body } : { method: 'POST', body });
    return parseChatMessage(json?.message);
}

export async function markChatRead(request: ChatRequest, orderId: string, kind: ChatKind = 'driver'): Promise<void> {
    await request(chatPath(orderId, '/read'), isStore(kind) ? { method: 'POST', query: { kind }, body: { kind } } : { method: 'POST' });
}

/** The driver taking part in the chat, if any. */
export function chatDriver(chat: OrderChat | null): ChatParticipant | null {
    return chat?.participants.find((participant) => participant.role === 'driver') ?? null;
}

/** A store staff member taking part in the chat, if any. */
export function chatStore(chat: OrderChat | null): ChatParticipant | null {
    return chat?.participants.find((participant) => participant.role === 'store') ?? null;
}

/**
 * The name to show over someone else's message: the store's name for store staff (the
 * customer is talking to the store, not to whoever is on shift), the driver's own name.
 */
export function senderLabel(message: ChatMessage, { storeName, driverName }: { storeName: string | null; driverName: string | null }): string | null {
    if (message.mine || message.system) return null;
    if (message.senderRole === 'store') return storeName ?? message.senderName;
    if (message.senderRole === 'driver') return driverName ?? message.senderName;
    return message.senderName;
}

export type AddressChangeRequest = { message: string; place?: string | null };

/**
 * Asks the store to change the order's drop-off: a message, and optionally one of the
 * customer's saved places. The store sees it in the order chat and as an alert on the order.
 */
export async function requestAddressChange(request: ChatRequest, orderId: string, { message, place = null }: AddressChangeRequest): Promise<any> {
    const body: Record<string, any> = { message: message.trim().slice(0, 1000) };
    if (place) body.place = place;
    return request(`orders/${encodeURIComponent(orderId)}/address-change-request`, { method: 'POST', body });
}
