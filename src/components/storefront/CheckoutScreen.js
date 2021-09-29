import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Image, ImageBackground, ActivityIndicator, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeListView } from 'react-native-swipe-list-view';
import { EventRegister } from 'react-native-event-listeners';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faExclamationTriangle, faChevronRight, faTimes } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, isLastIndex } from '../../utils';
import { useResourceStorage } from '../../utils/storage';
import useStorefrontSdk, { adapter as StorefrontAdapter } from '../../utils/use-storefront-sdk';
import { adapter as FleetbaseAdapter } from '../../utils/use-fleetbase-sdk';
import { useCustomer } from '../../utils/customer';
import { Cart, StoreLocation, DeliveryServiceQuote, Customer } from '@fleetbase/storefront';
import { Place, ServiceQuote } from '@fleetbase/sdk';
import { useStripe } from '@stripe/stripe-react-native';
import tailwind from '../../tailwind';
import Header from './Header';

const { addEventListener, removeEventListener, emit } = EventRegister;
// put your gateway code here
const GATEWAY_CODE = 'stripe';

const StorefrontCheckoutScreen = ({ navigation, route }) => {
    const storefront = useStorefrontSdk();
    const insets = useSafeAreaInsets();
    const { initPaymentSheet, presentPaymentSheet, confirmPaymentSheetPayment } = useStripe();
    const { info, serializedCart, isPickupOrder, isTipping, isTippingDriver, tip, deliveryTip, quote } = route.params;
    const [deliverTo, setDeliverTo] = useResourceStorage('deliver_to', Place, FleetbaseAdapter);
    const [storeLocation, setStoreLocation] = useResourceStorage('store_location', StoreLocation, StorefrontAdapter);
    const [cart, setCart] = useResourceStorage('cart', Cart, StorefrontAdapter, new Cart(serializedCart || {}));
    const [isLoading, setIsLoading] = useState(false);
    const [paymentSheetError, setPaymentSheetError] = useState(false);
    const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
    const [isFetchingServiceQuote, setIsFetchingServiceQuote] = useState(false);
    const [isSelectingPaymentMethod, setIsSelectingPaymentMethod] = useState(false);
    const [shouldShowModalBg, setShouldShowModalBg] = useState(false);
    const [serviceQuote, setServiceQuote] = useState(new DeliveryServiceQuote(quote || {}));
    const [serviceQuoteError, setServiceQuoteError] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState({ image: '', label: '' });
    const [checkoutToken, setCheckoutToken] = useState(null);
    const [customer, setCustomer] = useCustomer();

    const codEnabled = info?.options?.cod_enabled === true;
    const pickupEnabled = info?.options?.pickup_enabled === true;
    const tipsEnabled = info?.options?.tips_enabled === true;
    const deliveryTipsEnabled = info?.options?.delivery_tips_enabled === true;
    const taxEnabled = info?.options?.tax_enabled === true;
    const taxPercentage = info?.options?.tax_percentage ?? 0;
    const isInvalidDeliveryPlace = !(deliverTo instanceof Place);

    const canPlaceOrder = (() => {
        if (isPickupOrder) {
            return !isLoading && typeof customer?.serialize === 'function' && cart instanceof Cart && cart.contents().length > 0 && paymentSheetEnabled && paymentMethod?.label;
        }

        return (
            !isLoading &&
            typeof customer?.serialize === 'function' &&
            !isInvalidDeliveryPlace &&
            cart instanceof Cart &&
            cart.contents().length > 0 &&
            paymentSheetEnabled &&
            paymentMethod?.label
        );
    })();
    const deliveryFee = (() => {
        let deliveryFee = <ActivityIndicator />;

        if (!isFetchingServiceQuote && serviceQuote instanceof ServiceQuote) {
            deliveryFee = serviceQuote.formattedAmount;
        }

        if (serviceQuoteError) {
            deliveryFee = <Text style={tailwind('text-red-500')}>{serviceQuoteError}</Text>;
        }

        return deliveryFee;
    })();

    const updateCart = (cart) => {
        setCart(cart);
        emit('cart.changed', cart);
    };

    const login = () => navigation.navigate('LoginScreen', { redirectTo: 'CheckoutScreen' });

    const fetchBeforeCheckout = async () => {
        if (!customer) {
            // user needs to login first
            // return login();
            return;
        }

        // order options can include pickup, or cash
        const orderOptions = {};

        if (isPickupOrder) {
            orderOptions.pickup = true;
        }

        const { paymentIntent, ephemeralKey, customerId, token } = await storefront.checkout.initialize(customer, cart, serviceQuote, GATEWAY_CODE, orderOptions).catch((error) => {
            console.log('[Error initializing checkout token!]', error);
            Alert.alert(error.message, null, () => navigation.goBack());
        });

        setCheckoutToken(token);

        return {
            paymentIntent,
            ephemeralKey,
            customerId,
        };
    };

    const initializePaymentSheet = async () => {
        setIsLoading(true);

        try {
            const { paymentIntent, ephemeralKey, customerId } = await fetchBeforeCheckout();

            const { error, paymentOption } = await initPaymentSheet({
                customerId,
                customerEphemeralKeySecret: ephemeralKey,
                paymentIntentClientSecret: paymentIntent,
                customFlow: true,
                merchantDisplayName: info.name,
                applePay: true,
                merchantCountryCode: 'US',
                style: 'alwaysLight',
                googlePay: true,
                testEnv: true,
            });

            if (!error) {
                setPaymentSheetEnabled(true);
            } else {
                setPaymentSheetError(error.localizedMessage);
                console.log('[Error enabling stripe payment sheet!]', error);
            }

            if (paymentOption) {
                setPaymentMethod(paymentOption);
            }
        } catch (error) {
            console.log('error', error);
        } finally {
            setIsLoading(false);
        }
    };

    const choosePaymentOption = async () => {
        const { error, paymentOption } = await presentPaymentSheet({
            confirmPayment: false,
        });

        if (error) {
            console.log('[Error loading stripe payment sheet!]', error);
        } else if (paymentOption) {
            setPaymentMethod({
                label: paymentOption.label,
                image: paymentOption.image,
            });
        } else {
            setPaymentMethod(null);
        }
    };

    const placeOrder = async () => {
        setIsLoading(true);
        const { error } = await confirmPaymentSheetPayment();

        if (error) {
            console.log(`Error code: ${error.code}`, error.message);
            setIsLoading(false);
        } else {
            console.log('Success', 'The payment was confirmed successfully!');

            setPaymentSheetEnabled(false);
            storefront.checkout
                .captureOrder(checkoutToken)
                .then((order) => {
                    setIsLoading(false);
                    cart.empty().then((cart) => {
                        updateCart(cart);
                    });
                    navigation.navigate('OrderCompleted', { serializedOrder: order.serialize() });
                })
                .catch((error) => {
                    console.log('[Failed to capture order!]', error);
                });
        }
    };

    const getDeliveryQuote = () => {
        const quote = new DeliveryServiceQuote(StorefrontAdapter);

        /**
            or

            DeliveryServiceQuote.getFromCart(StorefrontAdapter, storeLocation, deliverTo, cart).then((serviceQuote) => {
                ...
            });
         */

        let customerLocation = deliverTo;

        /**
            ! If customer location is not saved in fleetbase just send the location coordinates !
        */
        if (!customerLocation?.id) {
            customerLocation = customerLocation?.coordinates;
        }

        if (!cart || !cart instanceof Cart || !storeLocation || !storeLocation instanceof StoreLocation || !customerLocation) {
            return;
        }

        setIsFetchingServiceQuote(true);
        setServiceQuoteError(false);

        quote
            .fromCart(storeLocation, customerLocation, cart)
            .then((serviceQuote) => {
                setServiceQuote(serviceQuote);
                setIsFetchingServiceQuote(false);
            })
            .catch((error) => {
                console.log('[Error fetching service quote!]', error);
                setIsFetchingServiceQuote(false);
                setServiceQuoteError(error.message);
            });
    };

    const calculateTotal = () => {
        const subtotal = cart.subtotal();

        if (isPickupOrder) {
            return subtotal;
        }

        return serviceQuote instanceof DeliveryServiceQuote ? subtotal + serviceQuote.getAttribute('amount') : subtotal;
    };

    const hidePaymentMethodSelection = () => {
        setShouldShowModalBg(false);
        setIsSelectingPaymentMethod(false);
    };

    const showPaymentMethodSelection = () => {
        setIsSelectingPaymentMethod(true);

        setTimeout(() => {
            setShouldShowModalBg(true);
        }, 600);
    };

    useEffect(() => {
        initializePaymentSheet();

        // Listen for customer created event
        const customerUpdatedListener = EventRegister.addEventListener('customer.updated', (customer) => {
            setCustomer(customer);
            initializePaymentSheet();
        });

        // Listen for changes to cart
        const cartChanged = addEventListener('cart.changed', (cart) => {
            setCart(cart);
            getDeliveryQuote();
        });

        // Listen for changes to customer delivery location
        const locationChanged = addEventListener('deliver_to.changed', (place) => {
            // update delivery quote
            getDeliveryQuote();
        });

        return () => {
            removeEventListener(customerUpdatedListener);
            removeEventListener(cartChanged);
            removeEventListener(locationChanged);
        };
    }, []);

    return (
        <View style={[tailwind('w-full h-full bg-white relative'), { paddingTop: insets.top }]}>
            <Modal animationType={'slide'} transparent={true} visible={isSelectingPaymentMethod} onRequestClose={hidePaymentMethodSelection}>
                <View style={tailwind(`${shouldShowModalBg ? 'bg-gray-900 bg-opacity-30' : ''} w-full h-full`)}>
                    <View style={[tailwind('w-full h-full flex items-center justify-center'), { marginTop: 500 }]}>
                        <View style={tailwind('bg-white rounded-t-3xl shadow-sm rounded-md w-full h-full')}>
                            <View style={tailwind('p-4 flex bg-gray-50 rounded-t-3xl')}>
                                <TouchableOpacity style={tailwind('mb-2')} onPress={hidePaymentMethodSelection}>
                                    <View style={tailwind('rounded-full bg-red-50 w-10 h-10 flex items-center justify-center')}>
                                        <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                    </View>
                                </TouchableOpacity>
                                <Text style={tailwind('text-lg font-bold')}>Select your payment method</Text>
                            </View>
                            <View style={tailwind('h-full')}></View>
                        </View>
                    </View>
                </View>
            </Modal>

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
                    {!customer && (
                        <View style={tailwind('p-4 rounded-md bg-red-50 mb-4')}>
                            <View style={tailwind('flex flex-col overflow-hidden')}>
                                <View style={tailwind('flex flex-row items-center mb-3 w-full')}>
                                    <FontAwesomeIcon icon={faExclamationTriangle} size={14} style={tailwind('text-red-500 mr-2')} />
                                    <Text style={tailwind('text-red-600 text-sm font-semibold')} numberOfLines={1}>
                                        You must login or signup to checkout
                                    </Text>
                                </View>
                                <TouchableOpacity style={tailwind('w-full')} disabled={isLoading} onPress={login}>
                                    <View style={tailwind('btn border border-red-100 bg-red-100 w-full')}>
                                        <Text style={tailwind('font-semibold text-red-900')}>Login</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {!isPickupOrder && (
                        <TouchableOpacity style={tailwind('p-4 rounded-md bg-gray-50 mb-4')} onPress={() => navigation.navigate('CheckoutSavedPlaces', { useLeftArrow: true })}>
                            <View style={tailwind('flex flex-row justify-between')}>
                                <View>
                                    <View style={tailwind('flex flex-row justify-between mb-3')}>
                                        <Text style={tailwind('font-semibold text-base')}>Delivery Address</Text>
                                        {isInvalidDeliveryPlace && <FontAwesomeIcon icon={faExclamationTriangle} style={tailwind('text-red-500')} />}
                                    </View>
                                    {deliverTo && (
                                        <View>
                                            <Text style={tailwind('font-semibold')}>{deliverTo.getAttribute('name')}</Text>
                                            <Text>{deliverTo.getAttribute('street1')}</Text>
                                            {deliverTo.isAttributeFilled('street2') && <Text>{deliverTo.getAttribute('street2')}</Text>}
                                            <Text>
                                                {deliverTo.getAttribute('city')}, {deliverTo.getAttribute('country')} {deliverTo.getAttribute('postal_code')}
                                            </Text>
                                            {deliverTo.isAttributeFilled('phone') && <Text>{deliverTo.getAttribute('phone')}</Text>}
                                        </View>
                                    )}
                                </View>
                                <View style={tailwind('flex justify-center')}>
                                    <View style={tailwind('flex items-end justify-center w-12')}>
                                        <FontAwesomeIcon icon={faChevronRight} style={tailwind('text-gray-400')} />
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* <TouchableOpacity onPress={showPaymentMethodSelection}>
                        <Text>Select a payment method</Text>
                    </TouchableOpacity> */}

                    <TouchableOpacity style={tailwind('p-4 rounded-md bg-gray-50 mb-4')} onPress={choosePaymentOption}>
                        <View style={tailwind('flex flex-row justify-between')}>
                            <View>
                                <View style={tailwind('flex flex-row justify-between mb-3')}>
                                    <View>
                                        <Text style={tailwind('font-semibold text-base')}>Payment Method</Text>
                                    </View>
                                </View>

                                <View style={tailwind('flex flex-row justify-between')}>
                                    {isLoading && !paymentMethod?.label && <ActivityIndicator color={`rgba(31, 41, 55, .5)`} />}
                                    {!isLoading && !paymentMethod?.label && <Text>No payment method</Text>}
                                    {paymentMethod?.label !== null && (
                                        <View style={tailwind('flex flex-row items-center')}>
                                            <Image
                                                source={{
                                                    uri: `data:image/png;base64,${paymentMethod?.image}`,
                                                }}
                                                style={[{ width: 35, height: 22, marginRight: 10 }]}
                                            />
                                            <Text>{paymentMethod?.label}</Text>
                                        </View>
                                    )}
                                </View>
                                {paymentSheetError !== false && (
                                    <View style={tailwind('mt-2 bg-red-50 px-2 py-1 w-9/12 flex flex-row')}>
                                        <FontAwesomeIcon icon={faExclamationTriangle} size={14} style={tailwind('text-red-500 mr-1')} />
                                        <Text style={tailwind('text-red-500')} numberOfLines={1}>
                                            {paymentSheetError}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={tailwind('flex justify-center')}>
                                <View style={tailwind('flex items-end justify-center w-12')}>
                                    <FontAwesomeIcon icon={faChevronRight} style={tailwind('text-gray-400')} />
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={tailwind('p-4 rounded-md bg-gray-50 mb-4')}>
                        <View style={tailwind('flex flex-row justify-between')}>
                            <View>
                                <View style={tailwind('flex flex-row justify-between mb-3')}>
                                    <Text style={tailwind('font-semibold text-base')}>Cart ({cart.getAttribute('total_unique_items')})</Text>
                                </View>
                                <View style={tailwind('flex flex-row justify-between')}>
                                    <View style={tailwind('flex-1 flex flex-row')}>
                                        {cart.contents().map((cartItem, index) => (
                                            <View key={index} style={tailwind('mr-2 flex items-center justify-center w-20')}>
                                                <View style={tailwind('border border-gray-200 flex items-center justify-center w-16 h-16 mb-2')}>
                                                    <Image source={{ uri: cartItem.product_image_url }} style={tailwind('w-10 h-10')} />
                                                </View>
                                                <Text style={tailwind('text-center text-xs mb-1')} numberOfLines={1}>
                                                    {cartItem.name}
                                                </Text>
                                                <Text style={tailwind('text-center text-xs')} numberOfLines={1}>
                                                    x{cartItem.quantity} {formatCurrency(cartItem.subtotal / 100, cart.getAttribute('currency'))}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                            <View style={tailwind('flex justify-center')}>
                                <View style={tailwind('flex items-end justify-center w-12')}>
                                    <FontAwesomeIcon icon={faChevronRight} style={tailwind('text-gray-400')} />
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
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
                        {!isPickupOrder && (
                            <View style={tailwind('flex flex-row items-center justify-between py-2')}>
                                <Text>Delivery Fee</Text>
                                <Text>{isFetchingServiceQuote ? <ActivityIndicator /> : serviceQuote.formattedAmount}</Text>
                            </View>
                        )}
                        <View style={tailwind('flex flex-row items-center justify-between mt-2 pt-4 border-t-2 border-gray-900')}>
                            <Text style={tailwind('font-semibold')}>Order Total</Text>
                            <Text style={tailwind('font-semibold')}>{formatCurrency(calculateTotal() / 100, cart.getAttribute('currency'))}</Text>
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
                        <TouchableOpacity onPress={placeOrder} disabled={!canPlaceOrder}>
                            <View
                                style={tailwind(
                                    `flex flex-row items-center justify-center rounded-md px-8 py-2 bg-white bg-green-500 border border-green-500 ${
                                        isLoading || !canPlaceOrder ? 'bg-opacity-50 border-opacity-50' : ''
                                    }`
                                )}
                            >
                                {isLoading && <ActivityIndicator color={'rgba(6, 78, 59, .5)'} style={tailwind('mr-2')} />}
                                <Text style={tailwind(`font-semibold text-white text-lg ${isLoading ? 'text-opacity-50' : ''}`)}>Place Order</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default StorefrontCheckoutScreen;
