import CheckoutScreen from '../../screens/CheckoutScreen';
import StripeCheckoutScreen from '../../screens/StripeCheckoutScreen';
import QPayCheckoutScreen from '../../screens/QPayCheckoutScreen';
import PaypalCheckoutScreen from '../../screens/PaypalCheckoutScreen';
import BackButton from '../../components/BackButton';
import { StripeCheckoutProvider } from '../../contexts/StripeCheckoutContext';
import { getTheme } from '../../utils';
import { useLanguage } from '../../contexts/LanguageContext';

export const Checkout = {
    screen: CheckoutScreen,
    options: ({ route, navigation }) => {
        const { t } = useLanguage();
        return {
            title: t('CheckoutScreen.checkout'),
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
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
        const { t } = useLanguage();
        return {
            title: t('CheckoutScreen.checkout'),
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
        };
    },
};

export const QPayCheckout = {
    screen: QPayCheckoutScreen,
    options: ({ route, navigation }) => {
        const { t } = useLanguage();
        return {
            title: t('CheckoutScreen.checkout'),
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
        };
    },
};

export const PaypalCheckout = {
    screen: PaypalCheckoutScreen,
    options: ({ route, navigation }) => {
        const { t } = useLanguage();
        return {
            title: t('CheckoutScreen.checkout'),
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
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
