import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { formatCurrency, translate } from 'utils';
import { useLocale } from 'hooks';
import { CartTotalView } from 'ui';
import tailwind from 'tailwind';

const CartCheckoutPanel = ({ style, panelStyle, cart, total, serviceQuote, tip, deliveryTip, isTipping, isTippingDriver, isPickupOrder, isCheckoutDisabled }) => {
    if (cart?.isEmpty) {
        return <View />;
    }

    const navigation = useNavigation();
    const [locale] = useLocale();

    return (
        <View style={style}>
            <View style={[tailwind('w-full bg-white shadow-sm px-4 py-6 mb-7'), panelStyle]}>
                <View style={tailwind('flex flex-row justify-between mb-2')}>
                    <View>
                        <Text style={tailwind('text-gray-400')}>{translate('Cart.components.CartCheckoutPanel.cartTotalLabelText')}</Text>
                        <Text style={tailwind('font-bold text-base')}>{formatCurrency(total, cart.getAttribute('currency'))}</Text>
                    </View>
                    <TouchableOpacity
                        disabled={isCheckoutDisabled}
                        onPress={() =>
                            navigation.navigate('CheckoutScreen', {
                                serializedCart: cart.serialize(),
                                quote: serviceQuote?.serialize(),
                                isPickupOrder,
                                isTipping,
                                isTippingDriver,
                                tipAmount: isTipping ? tip : 0,
                                deliveryTipAmount: isTippingDriver ? deliveryTip : 0,
                            })
                        }
                    >
                        <View
                            style={tailwind(
                                `flex items-center justify-center rounded-md px-8 py-2 bg-white border border-green-600 ${isCheckoutDisabled ? 'bg-opacity-50 border-opacity-50' : ''}`
                            )}
                        >
                            <Text style={tailwind(`font-semibold text-green-600 text-lg ${isCheckoutDisabled ? 'text-opacity-50' : ''}`)}>
                                {translate('Cart.components.CartCheckoutPanel.checkoutButtonText')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default CartCheckoutPanel;
