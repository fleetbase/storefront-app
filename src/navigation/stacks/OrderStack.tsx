import OrderScreen from '../../screens/OrderScreen';
import OrderHistoryScreen from '../../screens/OrderHistoryScreen';
import BackButton from '../../components/BackButton';
import HeaderButton from '../../components/HeaderButton';
import { getTheme } from '../../utils';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

export const Order = {
    screen: OrderScreen,
    options: ({ navigation, route }) => {
        const params = route.params ?? {};
        return {
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
    screen: OrderScreen,
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
    screen: OrderHistoryScreen,
    options: ({ navigation }) => {
        return {
            title: 'Order History',
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

const OrderStack = {
    Order,
    OrderHistory,
};

export default OrderStack;
