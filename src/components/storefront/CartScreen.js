import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, ScrollView, Text, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import tailwind from '../../tailwind';
import Storefront from '@fleetbase/storefront';
import { formatCurrency, isLastIndex } from '../../utils';

const StorefrontCartScreen = ({ navigation, route }) => {
    const { info, key } = route.params;
    const storefront = new Storefront(key, { host: 'https://v2api.fleetbase.engineering' });
    const [cart, setCart] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const getCart = () => {
        return storefront.cart.retrieve(getUniqueId()).then((cart) => {
            setCart(cart);

            return cart;
        });
    };

    const emptyCart = () => {
        setIsLoading(true);

        getCart().then((cart) => {
            cart.empty().then((cart) => {
                setIsLoading(false);
                setCart(cart);
            });
        });
    };

    const calculateSubtotal = () => {
        let subtotal = 0;

        cart.contents().forEach((lineItem) => {
            subtotal += lineItem.line_total;
        });

        return subtotal;
    };

    useEffect(() => getCart(), []);

    return (
        <View>
            <View style={tailwind('flex h-32 overflow-hidden')}>
                <ImageBackground source={{ uri: info.backdrop_url }} style={tailwind('flex-1 relative')} imageStyle={tailwind('bg-cover absolute -bottom-12')}>
                    <View style={tailwind('flex flex-row justify-between items-end w-full h-full p-2')}>
                        <View>
                            <View style={tailwind('rounded-full px-3 py-2 bg-gray-900')}>
                                <Text style={tailwind('text-white')}>{info.name}</Text>
                            </View>
                        </View>
                        <View></View>
                    </View>
                </ImageBackground>
            </View>
            {cart && (
                <View style={tailwind('bg-gray-100')}>
                    <View style={tailwind('px-4 py-2 bg-white mb-2')}>
                        <View>
                            <Text style={tailwind('text-lg font-bold mb-2')}>{cart.getAttribute('total_items')} items in your cart</Text>
                            <TouchableOpacity style={tailwind('mb-2')} onPress={emptyCart}>
                                <Text style={tailwind('underline text-red-400 text-xs font-semibold')}>Remove All Items</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView style={tailwind('pb-36')}>
                        <View style={tailwind('flex flex-row items-center justify-between px-4 py-2')}>
                            <View>
                                <Text style={tailwind('font-semibold text-gray-400')}>Cart Summary</Text>
                            </View>
                            <View>
                                <TouchableOpacity style={tailwind('mt-2')}>
                                    <Text style={tailwind('text-blue-500 text-xs font-semibold')}>Add more</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={tailwind('my-2 bg-white w-full')}>
                            {cart.contents().map((lineItem, index) => (
                                <View key={lineItem.id} style={tailwind(`${isLastIndex(cart.contents(), index) ? '' : 'border-b'} border-gray-100 p-4`)}>
                                    <View style={tailwind('flex flex-row justify-between')}>
                                        <View style={tailwind('flex flex-row items-start')}>
                                            <View>
                                                <View style={tailwind('rounded-md border border-gray-300 flex items-center justify-center w-7 h-7 mr-3')}>
                                                    <Text style={tailwind('font-semibold text-blue-500 text-xs')}>{lineItem.quantity}x</Text>
                                                </View>
                                            </View>
                                            <View style={tailwind('mr-3')}>
                                                <Image source={{ uri: lineItem.product_image_url }} style={tailwind('w-16 h-16')} />
                                            </View>
                                            <View style={tailwind('w-36')}>
                                                <Text style={tailwind('text-base font-semibold -mt-1')} numberOfLines={1}>
                                                    {lineItem.name}
                                                </Text>
                                                <Text style={tailwind('text-xs text-gray-500 -mt-1 mb-1')}>{lineItem.description}</Text>
                                                <View>
                                                    {lineItem.variants.map((variant) => (
                                                        <View key={variant.id}>
                                                            <Text style={tailwind('text-xs')}>{variant.name}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                                <View>
                                                    {lineItem.addons.map((addon) => (
                                                        <View key={addon.id}>
                                                            <Text style={tailwind('text-xs')}>+ {addon.name}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                                <TouchableOpacity style={tailwind('mt-2')}>
                                                    <Text style={tailwind('text-blue-600 text-xs font-semibold')}>Edit</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <View style={tailwind('flex items-end')}>
                                            <Text style={tailwind('font-semibold text-xs')}>{formatCurrency(lineItem.line_total / 100, cart.getAttribute('currency'))}</Text>
                                            {lineItem.quantity > 1 && (
                                                <View>
                                                    <Text numberOfLines={1} style={tailwind('text-gray-400 text-xs')}>
                                                        (each {formatCurrency(lineItem.line_total / lineItem.quantity / 100, cart.getAttribute('currency'))})
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                        <View style={tailwind('flex px-4 py-2')}>
                            <View>
                                <Text style={tailwind('font-semibold text-gray-400')}>Cost</Text>
                            </View>
                        </View>
                        <View style={tailwind('my-2 bg-white w-full')}>
                            <View style={tailwind('flex flex-row items-center justify-between border-b border-gray-100 p-4')}>
                                <View>
                                    <Text>Subtotal</Text>
                                </View>
                                <View>
                                    <Text style={tailwind('font-bold')}>{formatCurrency(calculateSubtotal() / 100, cart.getAttribute('currency'))}</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

export default StorefrontCartScreen;
