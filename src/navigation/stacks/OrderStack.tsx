import BackButton from '../../components/BackButton';
import { PortalHost } from '@gorhom/portal';
import { getTheme } from '../../utils';
import { translate as t } from '../../utils/localize';
import { screenSlot } from '../../extensions';

export const Order = {
    screen: screenSlot('order.detail'),
    // The tracking screen draws its own close button over the map.
    options: { headerShown: false },
};

// Reviews can be written from a delivered order and read from there.
export const StoreReviews = { screen: screenSlot('reviews.list'), options: { headerShown: false } };
export const WriteReview = { screen: screenSlot('reviews.write'), options: { presentation: 'modal', headerShown: false } };

export const Receipt = {
    screen: screenSlot('order.receipt'),
    options: ({ navigation, route }) => {
        const params = route.params ?? {};
        return {
            presentation: 'modal',
            title: params.order.id,
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerShadowVisible: false,
            headerLeft: () => {
                return <BackButton onPress={() => navigation.goBack()} />;
            },
        };
    },
};

export const OrderModal = {
    screen: screenSlot('order.detail'),
    // Opened from a push notification; the tracking screen draws its own close button.
    options: { presentation: 'modal', headerShown: false },
};

export const OrderHistory = {
    screen: screenSlot('order.history'),
    options: ({ navigation }) => {
        return {
            title: t('OrderHistoryScreen.orderHistory'),
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerShadowVisible: false,
            headerLeft: () => {
                return <BackButton onPress={() => navigation.goBack()} mr='$3' />;
            },
            headerRight: () => {
                return <PortalHost name='LoadingIndicatorPortal' />;
            },
        };
    },
};

const OrderStack = {
    Order,
    Receipt,
    OrderHistory,
    StoreReviews,
    WriteReview,
};

export default OrderStack;
