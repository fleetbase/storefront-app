import OrderScreen from '../../screens/OrderScreen';
import OrderHistoryScreen from '../../screens/OrderHistoryScreen';
import BackButton from '../../components/BackButton';
import { getTheme } from '../../utils';

export const Order = {
    screen: OrderScreen,
    options: ({ navigation, route }) => {
        const params = route.params ?? {};
        return {
            title: `Order ${params.order.id}`,
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
