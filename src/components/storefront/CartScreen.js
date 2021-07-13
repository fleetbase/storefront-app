import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Image, ImageBackground, ActivityIndicator } from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { EventRegister } from 'react-native-event-listeners';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faShoppingCart, faTrash, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, isLastIndex } from '../../utils';
import { useResourceStorage } from '../../utils/storage';
import useStorefrontSdk, { adapter as StorefrontAdapter } from '../../utils/use-storefront-sdk';
import { adapter as FleetbaseAdapter } from '../../utils/use-fleetbase-sdk';
import { Cart, StoreLocation, DeliveryServiceQuote } from '@fleetbase/storefront';
import { Place, ServiceQuote } from '@fleetbase/sdk';
import tailwind from '../../tailwind';
import Header from './Header';

const { emit, addEventListener, removeEventListener } = EventRegister;

const StorefrontCartScreen = ({ navigation, route }) => {
    const storefront = useStorefrontSdk();
    const { info, loadedCart } = route.params;
    const [deliverTo, setDeliverTo] = useResourceStorage('deliver_to', Place, FleetbaseAdapter);
    const [storeLocation, setStoreLocation] = useResourceStorage('store_location', StoreLocation, StorefrontAdapter);
    const [cart, setCart] = useResourceStorage('cart', Cart, StorefrontAdapter, new Cart(loadedCart || {}));
    const [products, setProducts] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingServiceQuote, setIsFetchingServiceQuote] = useState(true);
    const [serviceQuote, setServiceQuote] = useState(null);

    const getDeliveryQuote = () => {
        const quote = new DeliveryServiceQuote(StorefrontAdapter);

        /**
            or

            DeliveryServiceQuote.getFromCart(StorefrontAdapter, storeLocation, deliverTo, cart).then((serviceQuote) => {
                ...
            });
         */

        setIsFetchingServiceQuote(true);
        quote.fromCart(storeLocation, deliverTo, cart).then((serviceQuote) => {
            setServiceQuote(serviceQuote);
            setIsFetchingServiceQuote(false);
        });
    };

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
        emit('cart.changed', cart);
    };

    const getCart = () => {
        return storefront.cart.retrieve(getUniqueId()).then((cart) => {
            updateCart(cart);
            getDeliveryQuote();

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

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();

        return serviceQuote instanceof DeliveryServiceQuote ? subtotal + serviceQuote.getAttribute('amount') : subtotal;
    }

    useEffect(() => {
        getCart();

        const cartChanged = addEventListener('cart.changed', (cart) => {
            console.log('! [cart.changed]', cart);
            setCart(cart);
            getDeliveryQuote();

            if (Object.keys(products).length === 0) {
                preloadCartItems(cart);
            }
        });

        return () => {
            removeEventListener(cartChanged);
        };
    }, []);

    // if (cart) {
    //     console.log('[cart]', cart);

    //     if (!(cart instanceof Cart)) {
    //         console.log('cart is not an instance of Cart!');
    //     }

    //     if (cart instanceof Cart) {
    //         console.log('[cart contents]', cart.contents());
    //     }
    // }

    console.log('render()');

    return (
        <View style={tailwind(`h-full ${cart && cart.isEmpty ? 'bg-white' : ''}`)}>
            <Header info={info} />
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
                                            <Text style={tailwind('font-semibold text-blue-500 text-sm')}>{item.quantity}x</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={tailwind('flex flex-row items-start')} onPress={() => editCartItem(item)}>
                                        <View style={tailwind('mr-3')}>
                                            <View>
                                                <Image source={{ uri: item.product_image_url }} style={tailwind('w-16 h-16')} />
                                            </View>
                                        </View>
                                        <View style={tailwind('w-36')}>
                                            <View>
                                                <View>
                                                    <Text style={tailwind('text-lg font-semibold -mt-1')} numberOfLines={1}>
                                                        {item.name}
                                                    </Text>
                                                    <Text style={tailwind('text-sm text-gray-500 mb-1')}>{item.description}</Text>
                                                    <View>
                                                        {item.variants.map((variant) => (
                                                            <View key={variant.id}>
                                                                <Text style={tailwind('text-sm')}>{variant.name}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                    <View>
                                                        {item.addons.map((addon) => (
                                                            <View key={addon.id}>
                                                                <Text style={tailwind('text-sm')}>+ {addon.name}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            </View>
                                            <TouchableOpacity style={tailwind('mt-2')} onPress={() => editCartItem(item)}>
                                                <Text style={tailwind('text-blue-600 text-sm font-semibold')}>Edit</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                                <View style={tailwind('flex items-end')}>
                                    <Text style={tailwind('font-semibold text-sm')}>{formatCurrency(item.subtotal / 100, cart.getAttribute('currency'))}</Text>
                                    {item.quantity > 1 && (
                                        <View>
                                            <Text numberOfLines={1} style={tailwind('text-gray-400 text-sm')}>
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
                                                <Text style={tailwind('underline text-red-400 text-sm font-semibold')}>Remove All Items</Text>
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
                                                <Text style={tailwind('text-blue-500 text-sm font-semibold')}>Add more</Text>
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
                                <View style={tailwind('mt-2 mb-4 bg-white w-full')}>
                                    <View style={tailwind('flex flex-row items-center justify-between border-b border-gray-100 p-4')}>
                                        <View>
                                            <Text>Subtotal</Text>
                                        </View>
                                        <View>
                                            <Text style={tailwind('font-bold')}>{formatCurrency(calculateSubtotal() / 100, cart.getAttribute('currency'))}</Text>
                                        </View>
                                    </View>
                                    <View style={tailwind('flex flex-row items-center justify-between border-b border-gray-100 p-4')}>
                                        <View>
                                            <Text>Delivery Fee</Text>
                                        </View>
                                        <View>{isFetchingServiceQuote ? <ActivityIndicator /> : <Text style={tailwind('font-bold')}>{serviceQuote.formattedAmount}</Text>}</View>
                                    </View>
                                    <View style={tailwind('flex flex-row items-center justify-between border-b border-gray-100 p-4')}>
                                        <View>
                                            <Text style={tailwind('font-bold')}>Total</Text>
                                        </View>
                                        <View>
                                            <Text style={tailwind('font-bold')}>{formatCurrency(calculateTotal() / 100, cart.getAttribute('currency'))}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={tailwind('flex flex-row p-4')}>
                                    <TouchableOpacity style={tailwind('w-full')}>
                                        <View style={tailwind('flex items-center justify-center rounded-md px-8 py-2 bg-white border border-green-600')}>
                                            <Text style={tailwind('font-semibold text-green-600 text-lg')}>Checkout</Text>
                                        </View>
                                    </TouchableOpacity>
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
