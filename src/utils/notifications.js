export function isOrderNotification(notification) {
    return notification?.payload?.id?.startsWith('order_') || false;
}
