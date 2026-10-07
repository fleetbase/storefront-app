import { ApiError, apiRequest } from '../../src/commerce/http';
import { chatDriver, fetchChat, fetchOlderMessages, markChatRead, mergeMessages, parseChat, parseChatMessage, sendChatMessage } from '../../src/commerce/order-chat';

const message = (id: string, createdAt: string | null, extra: Record<string, any> = {}) => ({ id, content: `m-${id}`, is_mine: false, sender: { name: 'Ravi K.' }, attachments: [], read: false, created_at: createdAt, ...extra });

const chatJson = {
    id: 'chat_1',
    channel: 'chat.chat_1',
    order: 'order_1',
    status: 'open',
    participants: [
        { id: 'p1', role: 'customer', name: 'Ada B.', avatar_url: null, is_online: true },
        { id: 'p2', role: 'driver', name: 'Ravi K.', avatar_url: 'https://cdn.test/r.jpg', is_online: false },
    ],
    messages: [message('m1', '2026-10-07T06:00:00Z'), message('', null)],
    unread_count: 2,
};

describe('order chat', () => {
    test('parses the chat and its messages', () => {
        const chat = parseChat(chatJson);
        expect(chat).toMatchObject({ id: 'chat_1', channel: 'chat.chat_1', orderId: 'order_1', status: 'open', unread: 2 });
        expect(chat.messages.map((entry) => entry.id)).toEqual(['m1']);
        expect(chatDriver(chat)).toEqual({ id: 'p2', role: 'driver', name: 'Ravi K.', avatarUrl: 'https://cdn.test/r.jpg', online: false });
        expect(chatDriver(null)).toBeNull();
        expect(parseChat({ status: 'closed', participants: [{ role: 'x' }] })).toMatchObject({ status: 'closed', channel: null, unread: 0, participants: [{ id: '', role: 'driver', name: null, avatarUrl: null, online: false }] });
        expect(parseChatMessage({ id: 'm2', is_mine: true, read: true, attachments: [{ id: 'f1', url: 'https://cdn.test/p.jpg', type: 'image/jpeg' }, { id: 'f2' }, { url: 'https://cdn.test/q.jpg' }] })).toEqual({
            id: 'm2',
            content: '',
            mine: true,
            senderName: null,
            attachments: [
                { id: 'f1', url: 'https://cdn.test/p.jpg', type: 'image/jpeg' },
                { id: 'https://cdn.test/q.jpg', url: 'https://cdn.test/q.jpg', type: null },
            ],
            read: true,
            createdAt: null,
        });
    });

    test('merges messages, keeping local ones last until confirmed', () => {
        const a = parseChatMessage(message('a', '2026-10-07T06:00:00Z'));
        const b = parseChatMessage(message('b', '2026-10-07T06:01:00Z'));
        const pending = { ...parseChatMessage(message('local-1', null)), state: 'sending' as const };
        const merged = mergeMessages([b, pending], [a, { ...b, read: true }]);
        expect(merged.map((entry) => entry.id)).toEqual(['a', 'b', 'local-1']);
        expect(merged[1].read).toBe(true);
        expect(mergeMessages([], [parseChatMessage(message('x', null)), a]).map((entry) => entry.id)).toEqual(['a', 'x']);
    });

    test('calls the chat endpoints', async () => {
        const request = jest.fn();
        request.mockResolvedValueOnce(chatJson);
        expect((await fetchChat(request, 'order 1')).id).toBe('chat_1');
        request.mockResolvedValueOnce({ messages: [message('m0', '2026-10-07T05:00:00Z'), message('', null)] });
        expect((await fetchOlderMessages(request, 'order_1', 'm1')).map((entry) => entry.id)).toEqual(['m0']);
        request.mockResolvedValueOnce(null);
        expect(await fetchOlderMessages(request, 'order_1', 'm1', 10)).toEqual([]);
        request.mockResolvedValueOnce({ message: message('m9', '2026-10-07T06:05:00Z', { is_mine: true }) });
        expect((await sendChatMessage(request, 'order_1', { content: '  Tower B  ', photos: [1, 2, 3, 4, 5].map((n) => ({ data: `d${n}`, type: 'image/jpeg' })) })).mine).toBe(true);
        request.mockResolvedValueOnce({ message: message('m10', null) });
        await sendChatMessage(request, 'order_1', {});
        request.mockResolvedValueOnce({ read: 2 });
        await markChatRead(request, 'order_1');
        expect(request.mock.calls).toEqual([
            ['orders/order%201/chat'],
            ['orders/order_1/chat/messages', { query: { before: 'm1', limit: 30 } }],
            ['orders/order_1/chat/messages', { query: { before: 'm1', limit: 10 } }],
            ['orders/order_1/chat/messages', { method: 'POST', body: { content: 'Tower B', files: [1, 2, 3, 4].map((n) => ({ data: `d${n}`, type: 'image/jpeg' })) } }],
            ['orders/order_1/chat/messages', { method: 'POST', body: {} }],
            ['orders/order_1/chat/read', { method: 'POST' }],
        ]);
    });
});

describe('apiRequest', () => {
    const original = (globalThis as any).fetch;
    afterEach(() => {
        (globalThis as any).fetch = original;
    });
    const target = { host: 'https://api.test', namespace: 'storefront/v1', headers: { Authorization: 'Bearer key' } };

    test('sends JSON and returns the body', async () => {
        (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: 1 }) });
        expect(await apiRequest(target, 'orders/1/chat', { query: { before: 'm1', limit: 30, empty: '', none: null }, headers: { 'Customer-Token': 't' } })).toEqual({ ok: 1 });
        expect((globalThis as any).fetch).toHaveBeenCalledWith('https://api.test/storefront/v1/orders/1/chat?before=m1&limit=30', { method: 'GET', headers: { Authorization: 'Bearer key', 'Customer-Token': 't', Accept: 'application/json' } });
        await apiRequest(target, 'orders/1/chat/messages', { method: 'POST', body: { content: 'hi' } });
        expect((globalThis as any).fetch).toHaveBeenLastCalledWith('https://api.test/storefront/v1/orders/1/chat/messages', { method: 'POST', headers: { Authorization: 'Bearer key', Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'hi' }) });
    });

    test('keeps the status and reason of refusals', async () => {
        (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 409, statusText: 'Conflict', json: () => Promise.resolve({ error: 'No driver yet', reason: 'driver_not_assigned' }) });
        await expect(apiRequest(target, 'x')).rejects.toMatchObject({ name: 'ApiError', status: 409, reason: 'driver_not_assigned', message: 'No driver yet' });
        (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error', json: () => Promise.reject(new Error('html')) });
        await expect(apiRequest(target, 'x')).rejects.toMatchObject({ status: 500, reason: null, message: 'Server Error' });
        (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({ errors: ['Not yours'] }) });
        await expect(apiRequest(target, 'x')).rejects.toMatchObject({ status: 403, message: 'Not yours' });
        (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('offline'));
        await expect(apiRequest(target, 'x')).rejects.toMatchObject({ status: 0, reason: 'network', message: 'offline' });
        (globalThis as any).fetch = jest.fn().mockRejectedValue({});
        await expect(apiRequest(target, 'x')).rejects.toMatchObject({ reason: 'network', message: 'Network request failed' });
        await expect(apiRequest({}, 'x')).rejects.toBeInstanceOf(ApiError);
    });
});
