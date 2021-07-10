import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Image, ImageBackground, ActivityIndicator } from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { EventRegister } from 'react-native-event-listeners';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faShoppingCart, faTrash, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import tailwind from '../../tailwind';
import Storefront from '@fleetbase/storefront';
import { formatCurrency, isLastIndex, useStorefrontSdk } from '../../utils';

const StorefrontCartScreen = ({ navigation, route }) => {
    const { info, loadedCart } = route.params;
    const storefront = useStorefrontSdk();
    const [cart, setCart] = useState(loadedCart);
    const [products, setProducts] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const editCartItem = async (cartItem) => {
        let product;

        // check cache for product
        if (products[cartItem.product_id]) {
            product = products[cartItem.product_id];
        } else {
            product = await storefront.products.findRecord(cartItem.product_id);
        }

        return navigation.navigate('CartItemScreen', { attributes: product.serialize(), cartItemAttributes: cartItem });
    };

    const preloadCartItems = async (cart) => {
        const contents = cart.contents();

        for (let i = 0; i < contents.length; i++) {
            const cartItem = contents[i];
            const product = await storefront.products.findRecord(cartItem.product_id);

            if (product) {
                products[product.id] = product;
            }
        }

        setProducts(products);
    };

    const updateCart = (cart) => {
        setCart(cart);
        EventRegister.emit('cart.changed', cart);
    };

    const getCart = () => {
        return storefront.cart.retrieve(getUniqueId()).then((cart) => {
            updateCart(cart);

            return cart;
        });
    };

    const refreshCart = () => {
        setIsLoading(true);

        return getCart().then((cart) => {
            setIsLoading(false);

            return cart;
        });
    };

    const removeFromCart = (cartItem) => {
        cart.remove(cartItem.id).then((cart) => {
            updateCart(cart);
        });
    };

    const emptyCart = () => {
        getCart().then((cart) => {
            cart.empty().then((cart) => {
                updateCart(cart);
            });
        });
    };

    const calculateSubtotal = () => {
        let subtotal = 0;

        cart.contents().forEach((cartItem) => {
            subtotal += cartItem.subtotal;
        });

        return subtotal;
    };

    if (!cart && !isLoading) {
        getCart();
    }

    useEffect(() => {
        // Listen for cart changed event
        const cartChangedListener = EventRegister.addEventListener('cart.changed', (cart) => {
            setCart(cart);

            if (Object.keys(products).length === 0) {
                preloadCartItems(cart);
            }
        });

        return () => {
            // Remove cart.changed event listener
            EventRegister.removeEventListener(cartChangedListener);
        };
    }, []);

    return (
        <View style={tailwind(`h-full ${cart && cart.isEmpty ? 'bg-white' : ''}`)}>
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
            {!cart && (
                <View style={tailwind('mt-20 flex items-center justify-center')}>
                    <View style={tailwind('flex items-center justify-center my-6 w-60 h-60')}>
                        <ActivityIndicator />
                    </View>
                </View>
            )}
            {cart && (
                <SwipeListView
                    data={cart.contents()}
                    keyExtractor={(item) => item.id}
                    style={tailwind(`h-full ${isLoading ? 'opacity-50' : ''}`)}
                    onRefresh={refreshCart}
                    refreshing={isLoading}
                    renderItem={({ item, index }) => (
                        <View key={index} style={tailwind(`${isLastIndex(cart.contents(), index) ? '' : 'border-b'} border-gray-100 p-4 bg-white`)}>
                            <View style={tailwind('flex flex-1 flex-row justify-between')}>
                                <View style={tailwind('flex flex-row items-start')}>
                                    <View>
                                        <View style={tailwind('rounded-md border border-gray-300 flex items-center justify-center w-7 h-7 mr-3')}>
                                            <Text style={tailwind('font-semibold text-blue-500 text-xs')}>{item.quantity}x</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={tailwind('mr-3')} onPress={() => editCartItem(item)}>
                                        <View>
                                            <Image source={{ uri: item.product_image_url }} style={tailwind('w-16 h-16')} />
                                        </View>
                                    </TouchableOpacity>
                                    <View style={tailwind('w-36')}>
                                        <TouchableOpacity onPress={() => editCartItem(item)}>
                                            <View>
                                                <Text style={tailwind('text-base font-semibold -mt-1')} numberOfLines={1}>
                                                    {item.name}
                                                </Text>
                                                <Text style={tailwind('text-xs text-gray-500 -mt-1 mb-1')}>{item.description}</Text>
                                                <View>
                                                    {item.variants.map((variant) => (
                                                        <View key={variant.id}>
                                                            <Text style={tailwind('text-xs')}>{variant.name}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                                <View>
                                                    {item.addons.map((addon) => (
                                                        <View key={addon.id}>
                                                            <Text style={tailwind('text-xs')}>+ {addon.name}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={tailwind('mt-2')} onPress={() => editCartItem(item)}>
                                            <Text style={tailwind('text-blue-600 text-xs font-semibold')}>Edit</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={tailwind('flex items-end')}>
                                    <Text style={tailwind('font-semibold text-xs')}>{formatCurrency(item.subtotal / 100, cart.getAttribute('currency'))}</Text>
                                    {item.quantity > 1 && (
                                        <View>
                                            <Text numberOfLines={1} style={tailwind('text-gray-400 text-xs')}>
                                                (each {formatCurrency(item.subtotal / item.quantity / 100, cart.getAttribute('currency'))})
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}
                    renderHiddenItem={({ item, index }) => (
                        <View style={tailwind('flex flex-1 items-center bg-white flex-1 flex-row justify-end')}>
                            <TouchableOpacity onPress={() => editCartItem(item)} style={tailwind('flex bg-blue-300 w-28 h-full items-center justify-center')}>
                                <View>
                                    <FontAwesomeIcon icon={faPencilAlt} size={22} style={tailwind('text-blue-900')} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => removeFromCart(item)} style={tailwind('flex bg-red-300 w-28 h-full items-center justify-center')}>
                                <View>
                                    <FontAwesomeIcon icon={faTrash} size={22} style={tailwind('text-red-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                    rightOpenValue={-256}
                    stopRightSwipe={-256}
                    disableRightSwipe={true}
                    ListHeaderComponent={
                        cart.isNotEmpty && (
                            <View style={tailwind('bg-gray-100')}>
                                <View style={tailwind('px-4 py-2 bg-white mb-2')}>
                                    <View>
                                        <Text style={tailwind('text-lg font-bold mb-2')}>{cart.getAttribute('total_items')} items in your cart</Text>
                                        {cart.isNotEmpty && (
                                            <TouchableOpacity style={tailwind('mb-2')} onPress={emptyCart}>
                                                <Text style={tailwind('underline text-red-400 text-xs font-semibold')}>Remove All Items</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                                <View style={tailwind('pb-2')}>
                                    <View style={tailwind('flex flex-row items-center justify-between px-4 py-2')}>
                                        <View>
                                            <Text style={tailwind('font-semibold text-gray-400')}>Cart Summary</Text>
                                        </View>
                                        <View>
                                            <TouchableOpacity style={tailwind('mt-2')} onPress={() => navigation.navigate('Home')}>
                                                <Text style={tailwind('text-blue-500 text-xs font-semibold')}>Add more</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )
                    }
                    ListEmptyComponent={
                        <View style={tailwind('h-full w-full bg-white flex items-center justify-center')}>
                            <View style={tailwind('flex items-center justify-center w-full px-8')}>
                                <View style={tailwind('flex items-center justify-center my-6 rounded-full bg-gray-100 w-60 h-60')}>
                                    <FontAwesomeIcon icon={faShoppingCart} size={88} style={tailwind('text-gray-600')} />
                                </View>
                                <View style={tailwind('flex items-center justify-center mb-10')}>
                                    <Text style={tailwind('font-bold text-xl mb-2 text-center text-gray-800')}>Your Cart is Empty</Text>
                                    <Text style={tailwind('w-52 text-center text-gray-600 font-semibold')}>Looks like you haven't added anything to your cart yet.</Text>
                                </View>
                                <TouchableOpacity style={tailwind('w-full')} onPress={() => navigation.navigate('Home')}>
                                    <View style={tailwind('flex items-center justify-center rounded-md px-8 py-2 bg-white border border-blue-500 shadow-sm')}>
                                        <Text style={tailwind('font-semibold text-blue-500 text-lg')}>Start Shopping</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    }
                    ListFooterComponent={
                        cart.isNotEmpty && (
                            <View style={tailwind('bg-gray-100 pt-2')}>
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
                            </View>
                        )
                    }
                />
            )}
        </View>
    );
};

export default StorefrontCartScreen;
