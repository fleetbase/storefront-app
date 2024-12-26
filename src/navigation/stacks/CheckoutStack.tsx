import CheckoutScreen from '../../screens/CheckoutScreen';
import StripeCheckoutScreen from '../../screens/StripeCheckoutScreen';
import QPayCheckoutScreen from '../../screens/QPayCheckoutScreen';
import PaypalCheckoutScreen from '../../screens/PaypalCheckoutScreen';
import BackButton from '../../components/BackButton';
import { StripeCheckoutProvider } from '../../contexts/StripeCheckoutContext';
import { getTheme } from '../../utils';

export const Checkout = {
    screen: CheckoutScreen,
    options: ({ route, navigation }) => {
        return {
            title: 'Checkout',
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
        };
    },
};

export const StripeCheckout = {
    screen: (props) => {
        return (
            <StripeCheckoutProvider>
                <StripeCheckoutScreen {...props} />
            </StripeCheckoutProvider>
        );
    },
    options: ({ route, navigation }) => {
        return {
            title: 'Checkout',
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
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
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
        };
    },
};

export const PaypalCheckout = {
    screen: PaypalCheckoutScreen,
    options: ({ route, navigation }) => {
        return {
            title: 'Checkout',
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
        };
    },
};

const CheckoutStack = {
    Checkout,
    StripeCheckout,
    QPayCheckout,
    PaypalCheckout,
};

export default CheckoutStack;
