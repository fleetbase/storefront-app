import { targetFromPush, dayGroup, deleteNotification, fetchInbox, fetchPreferences, fetchUnreadCount, markAllRead, markRead, notificationTarget, parseNotification, updatePreferences } from '../../src/commerce/notifications';

const order = { id: 'n1', type: 'order_dispatched', title: 'On the way', body: 'Ravi picked up your order.', image: null, data: { order_id: 'order_1', store_id: 'store_1' }, is_read: false, created_at: '2026-10-07T06:00:00Z' };
const chat = { id: 'n2', type: 'order_chat_message', title: 'Ravi sent a message', body: 'At the lobby', data: { order_id: 'order_1', chat_id: 'chat_1' }, is_read: true };
const campaign = { id: 'n3', type: 'campaign', title: 'Weekday flowers', body: '10% off', image: 'https://cdn.test/f.jpg', data: { campaign_id: 'c1', promotion_id: 'promo_1', action: 'promotion' } };

describe('notifications', () => {
    test('parses inbox items and works out where they go', () => {
        expect(parseNotification(order)).toEqual({ id: 'n1', kind: 'order', type: 'order_dispatched', title: 'On the way', body: 'Ravi picked up your order.', imageUrl: null, read: false, createdAt: '2026-10-07T06:00:00Z', target: { route: 'Order', params: { orderId: 'order_1' } } });
        expect(parseNotification(chat)).toMatchObject({ kind: 'chat', read: true, target: { route: 'OrderChat', params: { orderId: 'order_1' } } });
        expect(parseNotification(campaign)).toMatchObject({ kind: 'offer', imageUrl: 'https://cdn.test/f.jpg', target: { route: 'Offer', params: { offerId: 'promo_1' } } });
        expect(parseNotification({ id: 'n4', type: 'order_completed', data: null })).toMatchObject({ kind: 'order', target: null, title: '', body: '' });
        expect(parseNotification({ id: 'n5', type: 'account_notice' })).toMatchObject({ kind: 'other', target: null });
        expect(parseNotification(null)).toMatchObject({ id: '', type: 'notification' });
    });

    test('follows campaign actions', () => {
        expect(notificationTarget('offer', { action: 'promotion', action_id: 'promo_2' })).toEqual({ route: 'Offer', params: { offerId: 'promo_2' } });
        expect(notificationTarget('offer', { action: 'promotion' })).toBeNull();
        expect(notificationTarget('offer', { action: 'store', action_id: 'store_9' })).toEqual({ route: 'NetworkStore', params: { storeId: 'store_9' } });
        expect(notificationTarget('offer', { action: 'store' })).toBeNull();
        expect(notificationTarget('offer', { action: 'product', action_id: 'product_1', store_id: 'store_1' })).toEqual({ route: 'Product', params: { productId: 'product_1', storeId: 'store_1' } });
        expect(notificationTarget('offer', { action: 'product' })).toBeNull();
        expect(notificationTarget('offer', { action: 'category', action_id: 'cat_1' })).toEqual({ route: 'NetworkCategory', params: { categoryId: 'cat_1' } });
        expect(notificationTarget('offer', { action: 'category' })).toBeNull();
        expect(notificationTarget('offer', { action: 'url', action_url: 'https://shop.test/sale' })).toEqual({ url: 'https://shop.test/sale' });
        expect(notificationTarget('offer', { action: 'url', action_url: 'javascript:alert(1)' })).toBeNull();
        expect(notificationTarget('offer', { store_id: 'store_3' })).toEqual({ route: 'NetworkStore', params: { storeId: 'store_3' } });
        expect(notificationTarget('offer', {})).toBeNull();
        expect(notificationTarget('chat', {})).toBeNull();
    });

    test('reads push payloads', () => {
        expect(targetFromPush({ type: 'order_dispatched', id: 'order_9', order: 'uuid' })).toEqual({ route: 'Order', params: { orderId: 'order_9' } });
        expect(targetFromPush({ type: 'campaign', promotion_id: 'promo_1', action: 'promotion' })).toEqual({ route: 'Offer', params: { offerId: 'promo_1' } });
        expect(targetFromPush({ type: 'order_chat_message', order_id: 'order_2' })).toEqual({ route: 'OrderChat', params: { orderId: 'order_2' } });
        expect(targetFromPush({ type: 'promotional', store_id: 'store_1' })).toEqual({ route: 'NetworkStore', params: { storeId: 'store_1' } });
        expect(targetFromPush({ id: 'customer_1' })).toBeNull();
        expect(targetFromPush(null)).toBeNull();
    });

    test('groups by day', () => {
        const now = new Date(2026, 9, 7, 15, 0);
        expect(dayGroup(new Date(2026, 9, 7, 8, 0).toISOString(), now)).toBe('today');
        expect(dayGroup(new Date(2026, 9, 6, 23, 0).toISOString(), now)).toBe('earlier');
        expect(dayGroup(null, now)).toBe('earlier');
    });

    test('calls the inbox endpoints', async () => {
        const request = jest.fn();
        request.mockResolvedValueOnce([order, chat, campaign, { id: '' }]);
        expect((await fetchInbox(request)).map((item) => item.id)).toEqual(['n1', 'n2', 'n3']);
        request.mockResolvedValueOnce({ data: [order, chat, campaign] });
        expect((await fetchInbox(request, { kind: 'orders', offset: 25 })).map((item) => item.id)).toEqual(['n1', 'n2']);
        request.mockResolvedValueOnce([order, campaign]);
        expect((await fetchInbox(request, { kind: 'offers' })).map((item) => item.id)).toEqual(['n3']);
        request.mockResolvedValueOnce(null);
        expect(await fetchInbox(request)).toEqual([]);
        request.mockResolvedValueOnce({ count: 3 });
        expect(await fetchUnreadCount(request)).toBe(3);
        request.mockResolvedValueOnce({ count: 'x' });
        expect(await fetchUnreadCount(request)).toBe(0);
        request.mockResolvedValue({});
        await markRead(request, 'n 1');
        await markAllRead(request);
        await deleteNotification(request, 'n1');
        request.mockResolvedValueOnce({ order_updates: false });
        expect(await fetchPreferences(request)).toEqual({ order_updates: false, promotions: true });
        request.mockResolvedValueOnce({ order_updates: true, promotions: false });
        expect(await updatePreferences(request, { promotions: false })).toEqual({ order_updates: true, promotions: false });

        expect(request.mock.calls).toEqual([
            ['notifications', { limit: 25, offset: 0 }],
            ['notifications', { limit: 25, offset: 25 }],
            ['notifications', { limit: 25, offset: 0 }],
            ['notifications', { limit: 25, offset: 0 }],
            ['notifications/unread-count'],
            ['notifications/unread-count'],
            ['notifications/n%201/read', {}, 'PUT'],
            ['notifications/read-all', {}, 'PUT'],
            ['notifications/n1', {}, 'DELETE'],
            ['notifications/preferences'],
            ['notifications/preferences', { promotions: false }, 'PUT'],
        ]);
    });
});
