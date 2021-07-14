import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Image, ImageBackground, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeListView } from 'react-native-swipe-list-view';
import { EventRegister } from 'react-native-event-listeners';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faExclamationTriangle, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, isLastIndex } from '../../utils';
import { useResourceStorage } from '../../utils/storage';
import useStorefrontSdk, { adapter as StorefrontAdapter } from '../../utils/use-storefront-sdk';
import { adapter as FleetbaseAdapter } from '../../utils/use-fleetbase-sdk';
import { getCustomer } from '../../utils/customer';
import { Cart, StoreLocation, DeliveryServiceQuote } from '@fleetbase/storefront';
import { Place, ServiceQuote } from '@fleetbase/sdk';
import tailwind from '../../tailwind';
import Header from './Header';

const { addEventListener, removeEventListener } = EventRegister;

const StorefrontCheckoutScreen = ({ navigation, route }) => {
    const storefront = useStorefrontSdk();
    const customer = getCustomer();
    const insets = useSafeAreaInsets();
    const { info, serializedCart, quote } = route.params;
    const [deliverTo, setDeliverTo] = useResourceStorage('deliver_to', Place, FleetbaseAdapter);
    const [storeLocation, setStoreLocation] = useResourceStorage('store_location', StoreLocation, StorefrontAdapter);
    const [cart, setCart] = useResourceStorage('cart', Cart, StorefrontAdapter, new Cart(serializedCart || {}));
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingServiceQuote, setIsFetchingServiceQuote] = useState(false);
    const [serviceQuote, setServiceQuote] = useState(new DeliveryServiceQuote(quote || {}));

    const isInvalidDeliveryPlace = !(deliverTo instanceof Place);

    const getDeliveryQuote = (place = null) => {
        const quote = new DeliveryServiceQuote(StorefrontAdapter);

        /**
            or

            DeliveryServiceQuote.getFromCart(StorefrontAdapter, storeLocation, deliverTo, cart).then((serviceQuote) => {
                ...
            });
         */

        setIsFetchingServiceQuote(true);
        quote.fromCart(storeLocation, place || deliverTo, cart).then((serviceQuote) => {
            setServiceQuote(serviceQuote);
            setIsFetchingServiceQuote(false);
        });
    };

    const calculateTotal = () => {
        const subtotal = cart.subtotal();

        return serviceQuote instanceof DeliveryServiceQuote ? subtotal + serviceQuote.getAttribute('amount') : subtotal;
    };

    useEffect(() => {
        const cartChanged = addEventListener('cart.changed', (cart) => {
            setCart(cart);
            getDeliveryQuote();
        });

        const locationChanged = addEventListener('deliver_to.changed', (place) => {
            // update delivery quote
            getDeliveryQuote(place);
        });

        return () => {
            removeEventListener(cartChanged);
            removeEventListener(locationChanged);
        };
    }, []);

    return (
        <View style={[tailwind('w-full h-full bg-white relative'), { paddingTop: insets.top }]}>
            <View style={tailwind('flex flex-row items-center justify-between p-4')}>
                <View style={tailwind('flex flex-row items-center')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>Checkout</Text>
                </View>
            </View>

            <ScrollView>
                <View style={tailwind('p-4')}>
                    <View style={tailwind('p-4 rounded-md bg-gray-50 mb-4')}>
                        <View style={tailwind('flex flex-row justify-between mb-3')}>
                            <Text style={tailwind('font-semibold text-base')}>Delivery Address</Text>
                            {isInvalidDeliveryPlace && <FaIcon icon={faExclamationTriangle} style={tailwind('text-red-500')} />}
                        </View>
                        <View style={tailwind('flex flex-row justify-between')}>
                            <View>
                                <Text style={tailwind('font-semibold')}>{deliverTo.getAttribute('name')}</Text>
                                <Text>{deliverTo.getAttribute('street1')}</Text>
                                {deliverTo.isAttributeFilled('street2') && <Text>{deliverTo.getAttribute('street2')}</Text>}
                                <Text>
                                    {deliverTo.getAttribute('city')}, {deliverTo.getAttribute('country')} {deliverTo.getAttribute('postal_code')}
                                </Text>
                                {deliverTo.isAttributeFilled('phone') && <Text>{deliverTo.getAttribute('phone')}</Text>}
                            </View>
                            <View style={tailwind('flex items-center justify-center')}>
                                <TouchableOpacity onPress={() => navigation.navigate('CheckoutSavedPlaces', { useLeftArrow: true })}>
                                    <FontAwesomeIcon icon={faChevronRight} style={tailwind('text-gray-400')} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    <View style={tailwind('p-4 rounded-md bg-gray-50 mb-4')}>
                        <View style={tailwind('flex flex-row justify-between mb-3')}>
                            <Text style={tailwind('font-semibold text-base')}>Payment Method</Text>
                        </View>
                        <View style={tailwind('flex flex-row justify-between')}>
                            <View></View>
                            <View style={tailwind('flex items-center justify-center')}>
                                <TouchableOpacity>
                                    <FontAwesomeIcon icon={faChevronRight} style={tailwind('text-gray-400')} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    <View style={tailwind('p-4 rounded-md bg-gray-50 mb-4')}>
                        <View style={tailwind('flex flex-row justify-between mb-3')}>
                            <Text style={tailwind('font-semibold text-base')}>Cart ({cart.getAttribute('total_unique_items')})</Text>
                        </View>
                        <View style={tailwind('flex flex-row justify-between')}>
                            <View style={tailwind('flex-1 flex flex-row')}>
                                {cart.contents().map((cartItem, index) => (
                                    <View key={index} style={tailwind('mr-2 flex items-center justify-center w-16')}>
                                        <View style={tailwind('border border-gray-200 flex items-center justify-center w-16 h-16 mb-2')}>
                                            <Image source={{ uri: cartItem.product_image_url }} style={tailwind('w-10 h-10')} />
                                        </View>
                                        <Text style={tailwind('text-center text-xs mb-1')} numberOfLines={1}>
                                            {cartItem.name}
                                        </Text>
                                        <Text style={tailwind('text-center text-xs')} numberOfLines={1}>
                                            x{cartItem.quantity}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            <View style={tailwind('flex items-center justify-center')}>
                                <TouchableOpacity>
                                    <FontAwesomeIcon icon={faChevronRight} style={tailwind('text-gray-400')} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
                <View style={tailwind('p-4 w-full h-full bg-gray-50')}>
                    <View style={tailwind('flex flex-row justify-between mb-3')}>
                        <Text style={tailwind('font-semibold text-base')}>Order Summary</Text>
                    </View>
                    <View style={tailwind('pb-40')}>
                        <View style={tailwind('flex flex-row items-center justify-between py-2')}>
                            <Text>Subtotal</Text>
                            <Text>{formatCurrency(cart.subtotal() / 100, cart.getAttribute('currency'))}</Text>
                        </View>
                        <View style={tailwind('flex flex-row items-center justify-between py-2')}>
                            <Text>Delivery Fee</Text>
                            <Text>{isFetchingServiceQuote ? <ActivityIndicator /> : serviceQuote.formattedAmount}</Text>
                        </View>
                        <View style={tailwind('flex flex-row items-center justify-between mt-2 pt-4 border-t-2 border-gray-900')}>
                            <Text style={tailwind('font-semibold')}>Order Total</Text>
                            <Text  style={tailwind('font-semibold')}>{formatCurrency(calculateTotal() / 100, cart.getAttribute('currency'))}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={tailwind('absolute w-full bottom-0')}>
                <View style={tailwind('w-full bg-white shadow-sm px-4 py-6')}>
                    <View style={tailwind('flex flex-row justify-between mb-2')}>
                        <View>
                            <Text style={tailwind('text-gray-400')}>Total</Text>
                            <Text style={tailwind('font-bold text-base')}>{formatCurrency(calculateTotal() / 100, cart.getAttribute('currency'))}</Text>
                        </View>
                        <TouchableOpacity>
                            <View style={tailwind('flex items-center justify-center rounded-md px-8 py-2 bg-white bg-green-500 border border-green-500')}>
                                <Text style={tailwind('font-semibold text-white text-lg')}>Place Order</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default StorefrontCheckoutScreen;
