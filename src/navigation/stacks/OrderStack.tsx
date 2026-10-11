import { screenSlot } from '../../extensions';

export const Order = {
    screen: screenSlot('order.detail'),
    // The tracking screen draws its own close button over the map.
    options: { headerShown: false },
};

// Reviews can be written from a delivered order and read from there.
export const StoreReviews = { screen: screenSlot('reviews.list'), options: { headerShown: false } };
export const WriteReview = { screen: screenSlot('reviews.write'), options: { presentation: 'modal', headerShown: false } };

export const OrderChat = { screen: screenSlot('order.chat'), options: { headerShown: false } };

export const Receipt = {
    screen: screenSlot('order.receipt'),
    // The receipt draws its own header with back and share.
    options: { presentation: 'modal', headerShown: false },
};

export const OrderModal = {
    screen: screenSlot('order.detail'),
    // Opened from a push notification; the tracking screen draws its own close button.
    options: { presentation: 'modal', headerShown: false },
};

export const OrderHistory = {
    screen: screenSlot('order.history'),
    options: { headerShown: false },
};

const OrderStack = {
    Order,
    Receipt,
    OrderHistory,
    StoreReviews,
    WriteReview,
    OrderChat,
};

export default OrderStack;
