import StripeCheckoutScreen from '../../screens/StripeCheckoutScreen';
import QPayCheckoutScreen from '../../screens/QPayCheckoutScreen';
import PaypalCheckoutScreen from '../../screens/PaypalCheckoutScreen';
import BackButton from '../../components/BackButton';
import { StripeCheckoutProvider } from '../../contexts/StripeCheckoutContext';
import { getTheme } from '../../utils';
import { translate as t } from '../../utils/localize';
import { screenSlot } from '../../extensions';

export const Checkout = {
    screen: screenSlot('checkout'),
    // The checkout layout draws its own header.
    options: { headerShown: false },
};

export const StripeCheckout = {
    screen: (props) => {
        return (
            <StripeCheckoutProvider>
                <StripeCheckoutScreen {...props} />
            </StripeCheckoutProvider>
        );
    },
    // The checkout layout draws its own header.
    options: { headerShown: false },
};

export const QPayCheckout = {
    screen: QPayCheckoutScreen,
    // The checkout layout draws its own header.
    options: { headerShown: false },
};

export const PaypalCheckout = {
    screen: PaypalCheckoutScreen,
    options: ({ route, navigation }) => {
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
