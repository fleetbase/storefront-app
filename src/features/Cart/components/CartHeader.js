import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import tailwind from 'tailwind';

const CartHeader = ({ style, wrapperStyle, cart, storeCount, onPressAddMore, onEmptyCart }) => {
    if (cart?.isEmpty) {
        return <View />;
    }

    return (
        <View style={[wrapperStyle]}>
            <View style={[tailwind('px-4 py-2 bg-white mb-2'), style]}>
                <View style={tailwind('flex flex-row items-start justify-between')}>
                    <View style={tailwind('flex-1')}>
                        <Text style={tailwind(`text-lg font-bold ${storeCount ? '' : 'mb-2'}`)}>{cart.getAttribute('total_items')} items in your cart</Text>
                        {storeCount > 0 && <Text style={tailwind('text-sm text-gray-400 font-bold mb-2')}>from {storeCount} vendors</Text>}
                        {cart.isNotEmpty && (
                            <TouchableOpacity style={tailwind('mb-2')} onPress={onEmptyCart}>
                                <Text style={tailwind('underline text-red-400 text-sm font-semibold')}>Remove All Items</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
            <View style={tailwind('pb-2')}>
                <View style={tailwind('flex flex-row items-center justify-between px-4 py-2')}>
                    <View>
                        <Text style={tailwind('font-semibold text-gray-400')}>Cart Summary</Text>
                    </View>
                    <View>
                        <TouchableOpacity style={tailwind('mt-2')} onPress={onPressAddMore}>
                            <Text style={tailwind('text-blue-500 text-sm font-semibold')}>Add more</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default CartHeader;
