import BackButton from '../../components/BackButton';
import HeaderButton from '../../components/HeaderButton';
import { PortalHost } from '@gorhom/portal';
import { getTheme } from '../../utils';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { translate as t } from '../../utils/localize';
import { screenSlot } from '../../extensions';

export const Order = {
    screen: screenSlot('order.detail'),
    // The tracking screen draws its own close button over the map.
    options: { headerShown: false },
};

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
    options: ({ navigation, route }) => {
        const params = route.params ?? {};
        return {
            presentation: 'modal',
            title: params.order.id,
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerStyle: {
                backgroundColor: getTheme('background'),
            },
            headerTransparent: false,
            headerShadowVisible: false,
            headerRight: () => {
                return <HeaderButton icon={faTimes} size={30} onPress={() => navigation.goBack()} />;
            },
        };
    },
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
};

export default OrderStack;
