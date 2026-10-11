/**
 * Chat between a customer and the driver delivering their order
 * (storefront/v1/orders/{id}/chat), sent with the customer token:
 *
 * - GET  orders/{id}/chat                 the chat with its latest messages
 *        409 driver_not_assigned          no driver yet
 * - GET  orders/{id}/chat/messages?before&limit   older messages
 * - POST orders/{id}/chat/messages        { content?, files? }   423 chat_closed once the order ends
 * - POST orders/{id}/chat/read            mark the driver's messages read
 *
 * New messages arrive on the chat's socket channel (`chat.{id}`) as `chat_message.*`
 * events; the app re-reads the latest page when one arrives.
 */

export type ChatRequest = (path: string, options?: { method?: 'GET' | 'POST'; query?: Record<string, any>; body?: Record<string, any> }) => Promise<any>;

export type ChatAttachment = { id: string; url: string; type: string | null };

export type ChatMessage = {
    id: string;
    content: string;
    mine: boolean;
    senderName: string | null;
    attachments: ChatAttachment[];
    read: boolean;
    createdAt: string | null;
    /** Sent from this device and not confirmed yet, or failed to send. */
    state?: 'sending' | 'failed';
};

export type ChatParticipant = { id: string; role: 'customer' | 'driver'; name: string | null; avatarUrl: string | null; online: boolean };

export type OrderChat = {
    id: string;
    channel: string | null;
    orderId: string | null;
    status: 'open' | 'closed';
    participants: ChatParticipant[];
    messages: ChatMessage[];
    unread: number;
};

export const QUICK_REPLIES = ['comingDown', 'leaveAtDoor', 'callOnArrival', 'whereAreYou'] as const;
export const MAX_CHAT_PHOTOS = 4;

export function parseChatMessage(json: any): ChatMessage {
    return {
        id: String(json?.id ?? ''),
        content: String(json?.content ?? ''),
        mine: json?.is_mine === true,
        senderName: json?.sender?.name ?? null,
        attachments: (Array.isArray(json?.attachments) ? json.attachments : [])
            .filter((attachment: any) => typeof attachment?.url === 'string')
            .map((attachment: any) => ({ id: String(attachment.id ?? attachment.url), url: attachment.url, type: attachment.type ?? null })),
        read: json?.read === true,
        createdAt: json?.created_at ?? null,
    };
}

export function parseChat(json: any): OrderChat {
    return {
        id: String(json?.id ?? ''),
        channel: typeof json?.channel === 'string' ? json.channel : null,
        orderId: json?.order ?? null,
        status: json?.status === 'closed' ? 'closed' : 'open',
        participants: (Array.isArray(json?.participants) ? json.participants : []).map((participant: any) => ({
            id: String(participant?.id ?? ''),
            role: participant?.role === 'customer' ? 'customer' : 'driver',
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

export async function fetchChat(request: ChatRequest, orderId: string): Promise<OrderChat> {
    return parseChat(await request(`orders/${encodeURIComponent(orderId)}/chat`));
}

export async function fetchOlderMessages(request: ChatRequest, orderId: string, beforeId: string, limit = 30): Promise<ChatMessage[]> {
    const json = await request(`orders/${encodeURIComponent(orderId)}/chat/messages`, { query: { before: beforeId, limit } });
    return (Array.isArray(json?.messages) ? json.messages : []).map(parseChatMessage).filter((message: ChatMessage) => message.id);
}

export async function sendChatMessage(request: ChatRequest, orderId: string, { content = '', photos = [] }: { content?: string; photos?: { data: string; type: string }[] }): Promise<ChatMessage> {
    const body: Record<string, any> = {};
    if (content.trim()) body.content = content.trim().slice(0, 2000);
    if (photos.length) body.files = photos.slice(0, MAX_CHAT_PHOTOS);
    const json = await request(`orders/${encodeURIComponent(orderId)}/chat/messages`, { method: 'POST', body });
    return parseChatMessage(json?.message);
}

export async function markChatRead(request: ChatRequest, orderId: string): Promise<void> {
    await request(`orders/${encodeURIComponent(orderId)}/chat/read`, { method: 'POST' });
}

/** The driver taking part in the chat, if any. */
export function chatDriver(chat: OrderChat | null): ChatParticipant | null {
    return chat?.participants.find((participant) => participant.role === 'driver') ?? null;
}
