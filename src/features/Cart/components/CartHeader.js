import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { translate } from 'utils';
import { useLocale } from 'hooks';
import tailwind from 'tailwind';

const CartHeader = ({ style, wrapperStyle, cart, storeCount, onPressAddMore, onEmptyCart }) => {
    const [locale] = useLocale();

    if (cart?.isEmpty) {
        return <View />;
    }

    return (
        <View style={[wrapperStyle]}>
            <View style={[tailwind('px-4 py-2 bg-white mb-2'), style]}>
                <View style={tailwind('flex flex-row items-start justify-between')}>
                    <View style={tailwind('flex-1')}>
                        <Text style={tailwind(`text-lg font-bold ${storeCount ? '' : 'mb-2'}`)}>{translate('Cart.components.CartHeader.title', { cartItemsCount: cart.getAttribute('total_items') })}</Text>
                        {storeCount > 0 && <Text style={tailwind('text-sm text-gray-400 font-bold mb-2')}>{translate('Cart.components.CartHeader.multiCartVendorsSubtitle', { storeCount })}</Text>}
                        {cart.isNotEmpty && (
                            <TouchableOpacity style={tailwind('mb-2')} onPress={onEmptyCart}>
                                <Text style={tailwind('underline text-red-400 text-sm font-semibold')}>{translate('Cart.components.CartHeader.removeAllItemsButtonText')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
            <View style={tailwind('pb-2')}>
                <View style={tailwind('flex flex-row items-center justify-between px-4 py-2')}>
                    <View>
                        <Text style={tailwind('font-semibold text-gray-400')}>{translate('Cart.components.CartHeader.cartSummaryLabelText')}</Text>
                    </View>
                    <View>
                        <TouchableOpacity style={tailwind('mt-2')} onPress={onPressAddMore}>
                            <Text style={tailwind('text-blue-500 text-sm font-semibold')}>{translate('Cart.components.CartHeader.addMoreButtonText')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default CartHeader;
