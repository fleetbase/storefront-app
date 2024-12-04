import CheckoutScreen from '../../screens/CheckoutScreen';
import StripeCheckoutScreen from '../../screens/StripeCheckoutScreen';
import QPayCheckoutScreen from '../../screens/QPayCheckoutScreen';
import BackButton from '../../components/BackButton';

export const Checkout = {
    screen: CheckoutScreen,
};

export const StripeCheckout = {
    screen: StripeCheckoutScreen,
    options: ({ route, navigation }) => {
        return {
            title: 'Checkout',
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
        };
    },
};

export const QPayCheckout = {
    screen: QPayCheckoutScreen,
    options: ({ route, navigation }) => {
        return {
            title: 'Checkout',
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
        };
    },
};

const CheckoutStack = {
    Checkout,
    StripeCheckout,
    QPayCheckout,
};

export default CheckoutStack;
