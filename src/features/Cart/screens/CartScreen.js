import { Collection, Place } from '@fleetbase/sdk';
import { Cart, DeliveryServiceQuote, Store, StoreLocation } from '@fleetbase/storefront';
import { faCalendarCheck, faPencilAlt, faShoppingCart, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useCart, useLocale, useMountedState } from 'hooks';
import useFleetbase, { adapter as FleetbaseAdapter } from 'hooks/use-fleetbase';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { EventRegister } from 'react-native-event-listeners';
import FastImage from 'react-native-fast-image';
import { SwipeListView } from 'react-native-swipe-list-view';
import tailwind from 'tailwind';
import { formatCurrency, isLastIndex, logError, stripHtml, translate } from 'utils';
import { calculatePercentage } from 'utils/Calculate';
import { useResourceCollection, useResourceStorage } from 'utils/Storage';
import CartCheckoutPanel from '../components/CartCheckoutPanel';
import CartFooter from '../components/CartFooter';
import CartHeader from '../components/CartHeader';

const { emit, addEventListener, removeEventListener } = EventRegister;
const { isArray } = Array;

const invoke = (fn, ...params) => {
    if (typeof fn === 'function') {
        return fn(...params);
    }

    return null;
};

const RenderCartReloadView = ({ isLoading, isEmptying, onRefresh }) => (
    <View style={tailwind(`mt-20 flex items-center justify-center ${isLoading || isEmptying ? 'opacity-50' : ''}`)}>
        <View style={tailwind('flex items-center justify-center my-6 w-60 h-60')}>
            <ActivityIndicator />
            <TouchableOpacity style={tailwind('w-full mt-10')} onPress={() => invoke(onRefresh)}>
                <View style={tailwind('flex items-center justify-center text-center rounded-md px-3 py-2 bg-white border border-blue-500 shadow-sm')}>
                    <Text style={tailwind('font-semibold text-blue-500 text-lg text-center')}>{translate('Cart.CartScreen.reloadCartButtonText')}</Text>
                </View>
            </TouchableOpacity>
        </View>
    </View>
);

const RenderEmptyCartView = ({ onShopForMore }) => (
    <View style={tailwind('w-full bg-white flex items-center justify-center')}>
        <View style={tailwind('flex items-center justify-center w-full px-8')}>
            <View style={tailwind('flex items-center justify-center my-6 rounded-full bg-gray-100 w-60 h-60')}>
                <FontAwesomeIcon icon={faShoppingCart} size={88} style={tailwind('text-gray-600')} />
            </View>
            <View style={tailwind('flex items-center justify-center mb-10')}>
                <Text style={tailwind('font-bold text-xl mb-2 text-center text-gray-800')}>{translate('Cart.CartScreen.emptyStateTitle')}</Text>
                <Text style={tailwind('w-52 text-center text-gray-600 font-semibold')}>{translate('Cart.CartScreen.emptyStateSubtitle')}</Text>
            </View>
            <TouchableOpacity style={tailwind('w-full')} onPress={() => invoke(onShopForMore)}>
                <View style={tailwind('flex items-center justify-center rounded-md px-8 py-2 bg-white border border-blue-500 shadow-sm')}>
                    <Text style={tailwind('font-semibold text-blue-500 text-lg')}>{translate('Cart.CartScreen.goToBrowserButtonText')}</Text>
                </View>
            </TouchableOpacity>
        </View>
    </View>
);

const RenderCartItemActions = ({ item, index, onRemoveFromCart, onEditCartItem }) => (
    <View style={tailwind('flex flex-1 items-center bg-white flex-1 flex-row justify-end')}>
        <TouchableOpacity onPress={() => invoke(onEditCartItem, item)} style={tailwind('flex bg-blue-500 w-28 h-full items-center justify-center')}>
            <View>
                <FontAwesomeIcon icon={faPencilAlt} size={22} style={tailwind('text-white')} />
            </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => invoke(onRemoveFromCart, item)} style={tailwind('flex bg-red-500 w-28 h-full items-center justify-center')}>
            <View>
                <FontAwesomeIcon icon={faTrash} size={22} style={tailwind('text-white')} />
            </View>
        </TouchableOpacity>
    </View>
);

const RenderCartItem = ({ item, index, cart, onEditCartItem, calculateCartItemRowHeight }) => (
    <View
        key={index}
        style={[
            tailwind(`${isLastIndex(cart.contents(), index) ? '' : 'border-b'} border-gray-100 p-4 bg-white`),
            { height: typeof calculateCartItemRowHeight === 'function' ? calculateCartItemRowHeight(item) : 200 },
        ]}>
        <View style={tailwind('flex flex-1 flex-row justify-between')}>
            <View style={tailwind('flex flex-row items-start')}>
                <View>
                    <View style={tailwind('rounded-md border border-gray-300 flex items-center justify-center w-7 h-7 mr-3')}>
                        <Text style={tailwind('font-semibold text-blue-500 text-sm')}>{item.quantity}x</Text>
                    </View>
                </View>
                <View style={tailwind('flex flex-row items-start')}>
                    <View style={tailwind('mr-3')}>
                        <View>
                            <FastImage source={{ uri: item.product_image_url }} style={tailwind('w-16 h-16')} />
                        </View>
                    </View>
                    <View style={tailwind('w-36')}>
                        <View>
                            <View>
                                <Text style={tailwind('text-lg font-semibold -mt-1')} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text style={tailwind('text-xs text-gray-500')} numberOfLines={1}>
                                    {stripHtml(item.description) ?? 'No description'}
                                </Text>
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
                                {item.scheduled_at && (
                                    <View style={tailwind('flex flex-row items-center mt-1')}>
                                        <FontAwesomeIcon icon={faCalendarCheck} size={12} style={tailwind('text-green-600 mr-1')} />
                                        <Text style={tailwind('text-xs font-semibold text-green-600')}>{format(new Date(item.scheduled_at), 'MMM do K:mmbbb')}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity style={tailwind('mt-2')} onPress={() => invoke(onEditCartItem, item)}>
                            <Text style={tailwind('text-blue-600 text-sm font-semibold')}>{translate('terms.edit')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <View style={tailwind('flex items-end')}>
                <Text style={tailwind('font-semibold text-sm')}>{formatCurrency(item.subtotal, cart.getAttribute('currency'))}</Text>
                {item.quantity > 1 && (
                    <View>
                        <Text numberOfLines={1} style={tailwind('text-gray-400 text-sm')}>
                            {translate('Cart.CartScreen.quantityExplenation', { cost: formatCurrency(item.subtotal / item.quantity, cart.getAttribute('currency')) })}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    </View>
);

const CartScreen = ({ navigation, route }) => {
    const storefront = useStorefront();
    const fleetbase = useFleetbase();
    const isMounted = useMountedState();
    const [locale] = useLocale();

    const { info, data } = route.params;
    const isNetwork = info.is_network === true;

    // declare stores and setStores from state
    let stores, setStores, storeLocations, setStoreLocations;

    const [deliverTo, setDeliverTo] = useResourceStorage('deliver_to', Place, FleetbaseAdapter);
    const [storeLocation, setStoreLocation] = useResourceStorage('store_location', StoreLocation, StorefrontAdapter);
    const [cart, setCart] = useCart();
    const [products, setProducts] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isEmptying, setIsEmptying] = useState(false);
    const [isFetchingServiceQuote, setIsFetchingServiceQuote] = useState(false);
    const [isPickupOrder, setIsPickupOrder] = useState(false);
    const [isTipping, setIsTipping] = useState(false);
    const [isTippingDriver, setIsTippingDriver] = useState(false);
    const [tip, setTip] = useState(100);
    const [deliveryTip, setDeliveryTip] = useState(100);
    const [serviceQuote, setServiceQuote] = useState(null);
    const [serviceQuoteError, setServiceQuoteError] = useState(false);
    const [yOffset, setYoffset] = useState(0);
    const [flatListScrollEnabled, setFlatListScrollEnabled] = useState(true);

    // if network load in stores to group cart items if multi store checkout is enabled
    if (isNetwork) {
        [stores, setStores] = useResourceCollection('network_stores', Store, StorefrontAdapter);
        [storeLocations, setStoreLocations] = useResourceCollection('network_store_locations', StoreLocation, StorefrontAdapter, new Collection());
    }

    const codEnabled = info?.options?.cod_enabled === true;
    const pickupEnabled = info?.options?.pickup_enabled === true;
    const tipsEnabled = info?.options?.tips_enabled === true;
    const deliveryTipsEnabled = info?.options?.delivery_tips_enabled === true;
    const taxEnabled = info?.options?.tax_enabled === true;
    const hasOptions = pickupEnabled || tipsEnabled || deliveryTipsEnabled;
    const taxPercentage = info?.options?.tax_percentage ?? 0;
    const isCartLoaded = cart && cart instanceof Cart && cart.isLoaded;

    const isCheckoutDisabled = (() => {
        if (isPickupOrder) {
            return isLoading || isEmptying;
        }

        return isFetchingServiceQuote || isLoading || isEmptying || serviceQuoteError !== false;
    })();

    const networkStores = (stores ?? []).filter((store) => {
        const ids = cart.contents().map((cartItem) => cartItem?.store_id);

        return ids.includes(store.id);
    });

    const networkStoreLocations = cart
        .contents()
        .map((cartItem) => cartItem?.store_location_id)
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index);

    const getDeliveryQuote = () => {
        return getServiceQuoteFor(deliverTo);
    };

    const getServiceQuoteFor = (customerLocation) => {
        const quote = new DeliveryServiceQuote(storefront.getAdapter());

        /**
            or

            DeliveryServiceQuote.getFromCart(storefront.getAdapter(), storeLocation, deliverTo, cart).then((serviceQuote) => {
                ...
            });
        */

        /**
            ! If customer location is not saved in fleetbase just send the location coordinates !
        */
        if (!customerLocation?.id) {
            customerLocation = customerLocation?.coordinates;
        }

        if (!cart || (!cart) instanceof Cart || (!isNetwork && (!storeLocation || (!storeLocation) instanceof StoreLocation)) || !customerLocation) {
            return;
        }

        setIsFetchingServiceQuote(true);
        setServiceQuoteError(false);

        quote
            .fetchServiceQuotesFromCart(isNetwork ? networkStoreLocations : storeLocation, customerLocation, cart)
            .then((serviceQuote) => {
                setServiceQuote(serviceQuote);
                setIsFetchingServiceQuote(false);
            })
            .catch((error) => {
                logError(error, '[ Error fetching service quote! ]');
                setIsFetchingServiceQuote(false);
                setServiceQuoteError(error.message);
            });
    };

    const calculateTotal = useCallback(() => {
        let subtotal = cart.subtotal();

        if (cart.isEmpty) {
            return 0;
        }

        if (isTipping) {
            if (typeof tip === 'string' && tip.endsWith('%')) {
                subtotal += calculatePercentage(parseInt(tip), cart.subtotal());
            } else {
                subtotal += tip;
            }
        }

        if (isTippingDriver && !isPickupOrder) {
            if (typeof deliveryTip === 'string' && deliveryTip.endsWith('%')) {
                subtotal += calculatePercentage(parseInt(deliveryTip), cart.subtotal());
            } else {
                subtotal += deliveryTip;
            }
        }

        if (isPickupOrder) {
            return subtotal;
        }

        return serviceQuote instanceof DeliveryServiceQuote ? subtotal + serviceQuote.getAttribute('amount') : subtotal;
    });

    const getStore = useCallback((id) => {
        if (!isArray(stores)) {
            return null;
        }

        return stores.find((store) => store?.id === id);
    });

    const getStoreLocation = useCallback((id) => {
        if (!isArray(storeLocations)) {
            return null;
        }

        return storeLocations.find((storeLocation) => storeLocation?.id === id);
    });

    const editCartItem = useCallback(async (cartItem) => {
        let product;

        // get store if applicable
        const store = getStore(cartItem?.store_id);

        // get store location too
        const storeLocation = getStoreLocation(cartItem?.store_location_id);

        // check cache for product
        if (products[cartItem.product_id]) {
            product = products[cartItem.product_id];
        } else {
            product = await storefront.products.findRecord(cartItem.product_id).catch((error) => {
                logError(error, '[ Error fetching product record! ]');
            });
        }

        return navigation.navigate('CartItemScreen', {
            attributes: product.serialize(),
            selectedStoreLocation: storeLocation?.serialize(),
            cartItemAttributes: cartItem,
            store: store?.serialize(),
        });
    });

    const preloadCartItems = useCallback(async (cart) => {
        const contents = cart.contents();

        for (let i = 0; i < contents.length; i++) {
            const cartItem = contents[i];
            const product = await storefront.products.findRecord(cartItem.product_id);

            if (product) {
                products[product.id] = product;
            }
        }

        setProducts(products);
    });

    const getCart = useCallback(() => {
        return storefront.cart
            .retrieve(getUniqueId())
            .then((cart) => {
                if (cart instanceof Cart) {
                    setCart(cart);
                    getDeliveryQuote();

                    return cart;
                }

                throw new Error('Cart failed to load via SDK!');
            })
            .catch((error) => {
                logError(error, '[ Error fetching cart! ]');
            });
    });

    const refreshCart = useCallback(() => {
        setIsLoading(true);

        return getCart().then((cart) => {
            setIsLoading(false);
            setFlatListScrollEnabled(true);

            return cart;
        });
    });

    const removeFromCart = useCallback((cartItem) => {
        setIsEmptying(true);

        return cart
            .remove(cartItem.id)
            .then(setCart)
            .catch(logError)
            .finally(() => {
                setFlatListScrollEnabled(true);
                setIsEmptying(false);
            });
    });

    const emptyCart = useCallback(() => {
        // create action
        const emptyCartAction = (cart) => {
            setIsEmptying(true);

            return cart
                .empty()
                .then(setCart)
                .catch(logError)
                .finally(() => {
                    setFlatListScrollEnabled(true);
                    setIsEmptying(false);
                });
        };

        if (cart instanceof Cart) {
            return emptyCartAction(cart);
        }

        return getCart().then(emptyCartAction);
    });

    const calculateCartItemRowHeight = useCallback((cartItem) => {
        let height = 112;

        height += cartItem.variants.length * 12;
        height += cartItem.addons.length * 12;

        if (cartItem.scheduled_at) {
            height += 12;
        }

        return height;
    });

    const shopForMore = useCallback(() => {
        if (info.is_store) {
            return navigation.navigate('Browser');
        }

        if (info.is_network) {
            return navigation.navigate('ExploreScreen');
        }
    });

    // useEffect(() => {
    //     // if network load stores
    //     if (info.is_network) {
    //         NetworkInfoService.getStores().then((stores) => {
    //             setStores(stores);
    //         });
    //     }

    //     const cartChanged = addEventListener('cart.updated', (cart) => {
    //         if (Object.keys(products).length === 0) {
    //             preloadCartItems(cart);
    //         }
    //         getDeliveryQuote();
    //     });

    //     const locationChanged = addEventListener('location.updated', (place) => {
    //         // update state in cart
    //         setDeliverTo(place);
    //         // update delivery quote
    //         getServiceQuoteFor(place);
    //     });

    //     const customerSignedOut = addEventListener('customer.signedout', () => {
    //         refreshCart();
    //     });

    //     return () => {
    //         removeEventListener(cartChanged);
    //         removeEventListener(customerSignedOut);
    //         removeEventListener(locationChanged);
    //     };
    // }, [isMounted]);

    useFocusEffect(
        useCallback(() => {
            getCart();
        }, [])
    );

    return (
        <View style={tailwind(`h-full ${cart?.isEmpty ? 'bg-white' : 'bg-white'}`)}>
            <CartCheckoutPanel
                cart={cart}
                total={calculateTotal()}
                serviceQuote={serviceQuote}
                tip={tip}
                deliveryTip={deliveryTip}
                isTipping={isTipping}
                isTippingDriver={isTippingDriver}
                isPickupOrder={isPickupOrder}
                isCheckoutDisabled={isCheckoutDisabled}
                style={tailwind('z-30 absolute w-full bottom-0')}
            />
            {info.is_store ? (
                <SwipeListView
                    data={cart.contents() ?? []}
                    keyExtractor={(item) => item.id}
                    style={tailwind(`h-full ${isLoading || isEmptying ? 'opacity-50' : ''}`)}
                    onRefresh={refreshCart}
                    refreshing={isLoading}
                    renderItem={({ item, index }) => (
                        <RenderCartItem item={item} index={index} cart={cart} onEditCartItem={editCartItem} calculateCartItemRowHeight={calculateCartItemRowHeight} />
                    )}
                    renderHiddenItem={({ item, index }) => <RenderCartItemActions item={item} index={index} onRemoveFromCart={removeFromCart} onEditCartItem={editCartItem} />}
                    rightOpenValue={-256}
                    stopRightSwipe={-256}
                    disableRightSwipe={true}
                    ListHeaderComponent={<CartHeader cart={cart} storeCount={networkStores?.length ?? 0} onEmptyCart={emptyCart} onPressAddMore={shopForMore} />}
                    ListEmptyComponent={<RenderEmptyCartView onShopForMore={shopForMore} />}
                    ListFooterComponent={
                        <CartFooter
                            cart={cart}
                            info={info}
                            total={calculateTotal()}
                            tip={tip}
                            deliveryTip={deliveryTip}
                            isTipping={isTipping}
                            isTippingDriver={isTippingDriver}
                            isPickupOrder={isPickupOrder}
                            serviceQuote={serviceQuote}
                            isFetchingServiceQuote={isFetchingServiceQuote}
                            serviceQuoteError={serviceQuoteError}
                            onSetIsPickupOrder={setIsPickupOrder}
                            onSetDeliveryTip={setDeliveryTip}
                            onSetIsTipping={setIsTipping}
                            onSetIsTippingDriver={setIsTippingDriver}
                            onSetTip={setTip}
                        />
                    }
                />
            ) : (
                <FlatList
                    data={networkStores}
                    style={tailwind(`h-full ${isLoading || isEmptying ? 'opacity-50' : ''}`)}
                    onRefresh={refreshCart}
                    refreshing={isLoading}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={flatListScrollEnabled}
                    renderItem={({ item }) => {
                        const contents = cart.contents().filter((cartItem) => cartItem.store_id === item.id);

                        return (
                            <View key={item.id}>
                                <View style={tailwind('flex px-4 py-2 bg-gray-100')}>
                                    <TouchableOpacity onPress={() => navigation.navigate('StoreScreen', { data: item.serialize() })} style={tailwind('flex flex-row items-center')}>
                                        <View style={tailwind('mr-3')}>
                                            <View style={tailwind('border border-white rounded-md')}>
                                                <FastImage source={{ uri: item.getAttribute('logo_url') }} style={tailwind('h-10 w-10 rounded-md')} />
                                            </View>
                                        </View>
                                        <View style={tailwind('flex items-center')}>
                                            <Text style={tailwind('font-semibold text-gray-400')}>{item.getAttribute('name')}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                                <SwipeListView
                                    data={contents}
                                    keyExtractor={(item) => item.id}
                                    style={tailwind(`${isLoading || isEmptying ? 'opacity-50' : ''}`)}
                                    refreshing={isLoading}
                                    renderItem={({ item, index }) => (
                                        <RenderCartItem item={item} index={index} cart={cart} onEditCartItem={editCartItem} calculateCartItemRowHeight={calculateCartItemRowHeight} />
                                    )}
                                    renderHiddenItem={({ item, index }) => (
                                        <RenderCartItemActions item={item} index={index} onRemoveFromCart={removeFromCart} onEditCartItem={editCartItem} />
                                    )}
                                    rightOpenValue={-256}
                                    stopRightSwipe={-256}
                                    disableRightSwipe={true}
                                    onRowOpen={() => setFlatListScrollEnabled(false)}
                                    onRowDidOpen={() => setFlatListScrollEnabled(true)}
                                    onRowClose={() => setFlatListScrollEnabled(true)}
                                />
                            </View>
                        );
                    }}
                    ListEmptyComponent={<RenderEmptyCartView onShopForMore={shopForMore} />}
                    ListHeaderComponent={
                        <CartHeader cart={cart} storeCount={networkStores?.length ?? 0} onEmptyCart={emptyCart} onPressAddMore={shopForMore} style={tailwind('border-b border-gray-100')} />
                    }
                    ListFooterComponent={
                        <CartFooter
                            cart={cart}
                            info={info}
                            total={calculateTotal()}
                            tip={tip}
                            deliveryTip={deliveryTip}
                            isTipping={isTipping}
                            isTippingDriver={isTippingDriver}
                            isPickupOrder={isPickupOrder}
                            serviceQuote={serviceQuote}
                            isFetchingServiceQuote={isFetchingServiceQuote}
                            serviceQuoteError={serviceQuoteError}
                            onSetIsPickupOrder={setIsPickupOrder}
                            onSetDeliveryTip={setDeliveryTip}
                            onSetIsTipping={setIsTipping}
                            onSetIsTippingDriver={setIsTippingDriver}
                            onSetTip={setTip}
                        />
                    }
                />
            )}
        </View>
    );
};

export default CartScreen;
