import React, { useEffect, useState, createRef } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Image, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeListView } from 'react-native-swipe-list-view';
import ActionSheet from 'react-native-actions-sheet';
import { EventRegister } from 'react-native-event-listeners';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faExclamationTriangle, faChevronRight, faTimes, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';
import { faStripe } from '@fortawesome/free-brands-svg-icons';
import { formatCurrency, calculatePercentage, isLastIndex } from '../../utils';
import { useResourceStorage } from '../../utils/storage';
import useStorefrontSdk, { adapter as StorefrontAdapter } from '../../utils/use-storefront-sdk';
import { adapter as FleetbaseAdapter } from '../../utils/use-fleetbase-sdk';
import { useCustomer } from '../../utils/customer';
import { Cart, Store, StoreLocation, DeliveryServiceQuote, Customer } from '@fleetbase/storefront';
import { Place, ServiceQuote, Collection } from '@fleetbase/sdk';
import { useStripe } from '@stripe/stripe-react-native';
import tailwind from '../../tailwind';
import Header from './Header';

const { addEventListener, removeEventListener, emit } = EventRegister;
const actionSheetRef = createRef();

const gatewayDetails = {
    cash: {
        name: 'Cash',
        icon: <FontAwesomeIcon icon={faMoneyBillWave} size={26} style={tailwind('text-green-400')} />,
        description: 'Cash on delivery or pickup',
    },
    stripe: {
        name: 'Stripe',
        icon: <FontAwesomeIcon icon={faStripe} size={30} style={tailwind('text-indigo-400')} />,
        description: 'Pay by card, powered by Stripe',
    },
};

const isPaymentGatewayResource = (gateway) => typeof gateway === 'object' && gateway?.resource === 'payment-gateway';

const StorefrontCheckoutScreen = ({ navigation, route }) => {
    const storefront = useStorefrontSdk();
    const insets = useSafeAreaInsets();
    const { initPaymentSheet, presentPaymentSheet, confirmPaymentSheetPayment } = useStripe();
    const { info, serializedCart, isPickupOrder, isTipping, isTippingDriver, tipAmount, deliveryTipAmount, quote } = route.params;
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
    const [gateway, setGateway] = useState(null);
    const [gatewayOptions, setGatewayOptions] = useState(new Collection());
    const [tip, setTip] = useState(tipAmount ?? 0);
    const [deliveryTip, setDeliveryTip] = useState(deliveryTipAmount ?? 0);
    const [customer, setCustomer] = useCustomer();
    const store = new Store(info, StorefrontAdapter);

    const codEnabled = info?.options?.cod_enabled === true;
    const pickupEnabled = info?.options?.pickup_enabled === true;
    const tipsEnabled = info?.options?.tips_enabled === true;
    const deliveryTipsEnabled = info?.options?.delivery_tips_enabled === true;
    const taxEnabled = info?.options?.tax_enabled === true;
    const taxPercentage = info?.options?.tax_percentage ?? 0;
    const isInvalidDeliveryPlace = !(deliverTo instanceof Place);

    const canPlaceOrder = (() => {
        let isGatewayValid = isPaymentGatewayResource(gateway);

        if (isGatewayValid && gateway.isStripeGateway) {
            isGatewayValid = isGatewayValid && paymentMethod?.label;
        }

        if (isPickupOrder) {
            return !isLoading && typeof customer?.serialize === 'function' && cart instanceof Cart && cart.contents().length > 0 && isGatewayValid;
        }

        return !isLoading && typeof customer?.serialize === 'function' && !isInvalidDeliveryPlace && cart instanceof Cart && cart.contents().length > 0 && isGatewayValid;
    })();
    const deliveryFee = (() => {
        let deliveryFee = <ActivityIndicator />;

        if (!isFetchingServiceQuote && serviceQuote instanceof ServiceQuote) {
            deliveryFee = serviceQuote.formattedAmount;
        }

        if (serviceQuoteError) {
            deliveryFee = (
                <Text style={tailwind('text-red-500')} numberOfLines={1}>
                    {serviceQuoteError}
                </Text>
            );
        }

        return deliveryFee;
    })();
    const formattedTip = (() => {
        if (typeof tip === 'string' && tip.endsWith('%')) {
            const tipAmount = formatCurrency(calculatePercentage(parseInt(tip), cart.subtotal()) / 100, cart.getAttribute('currency'));

            return `${tip} (${tipAmount})`;
        }

        return formatCurrency(tip / 100, cart.getAttribute('currency'));
    })();
    const formattedDeliveryTip = (() => {
        if (typeof deliveryTip === 'string' && deliveryTip.endsWith('%')) {
            const tipAmount = formatCurrency(calculatePercentage(parseInt(deliveryTip), cart.subtotal()) / 100, cart.getAttribute('currency'));

            return `${deliveryTip} (${tipAmount})`;
        }

        return formatCurrency(deliveryTip / 100, cart.getAttribute('currency'));
    })();

    const updateCart = (cart) => {
        setCart(cart);
        emit('cart.changed', cart);
    };

    const login = () => {
        return navigation.navigate('LoginScreen', { redirectTo: 'CheckoutScreen' });
    };

    const getOrderOptions = (setOptions = {}) => {
        // order options can include pickup, or cash
        const orderOptions = {};

        if (isPickupOrder) {
            orderOptions.pickup = true;
        }

        if (isTipping) {
            orderOptions.tip = tip;
        }

        if (isTippingDriver && !isPickupOrder) {
            orderOptions.delivery_tip = deliveryTip;
        }

        if (isPaymentGatewayResource(gateway) && gateway.type === 'cash') {
            orderOptions.cash = true;
        }

        return { ...orderOptions, ...setOptions };
    };

    const setupStripeGateway = async (gateway, c = null) => {
        const currentCustomer = c ?? customer;

        // if no customer we can't setup the stripe gateway return null
        if (!currentCustomer || !isPaymentGatewayResource(gateway)) {
            return null;
        }

        // fetch payment intent
        const fetchPaymentIntent = async () => {
            const options = getOrderOptions();

            const { paymentIntent, ephemeralKey, customerId, token } = await storefront.checkout.initialize(currentCustomer, cart, serviceQuote, gateway, options).catch((error) => {
                console.log('[Error initializing checkout token!]', error);
            });

            if (!token) {
                return null;
            }

            // set the checkout token to the gateway
            gateway.setCheckoutToken(token);

            return {
                paymentIntent,
                ephemeralKey,
                customerId,
                token,
            };
        };

        // if payment sheet already enabled return null
        if (paymentSheetEnabled) {
            return null;
        }

        setIsLoading(true);

        try {
            const { paymentIntent, ephemeralKey, customerId, token } = await fetchPaymentIntent();

            if (!token) {
                return null;
            }

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
            console.log('[Error enabling stripe payment sheet!]', error);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const setupCashGateway = async (gateway, c = null) => {
        const currentCustomer = c ?? customer;

        if (!currentCustomer || !isPaymentGatewayResource(gateway)) {
            return null;
        }

        const options = getOrderOptions({ cash: true });

        const { token } = await storefront.checkout.initialize(currentCustomer, cart, serviceQuote, gateway, options).catch((error) => {
            console.log('[Error initializing checkout token!]', error);
        });

        if (!token) {
            return null;
        }

        gateway.setCheckoutToken(token);
    };

    const setupGateways = async (gateways, c = null) => {
        setGatewayOptions(gateways);

        const _gateways = new Collection();

        // setup each payment gateway
        // at this time we can only setup stripe/ and cash
        // store gateways with token to update state
        for (let i = 0; i < gateways.length; i++) {
            const gateway = gateways.objectAt(i);

            if (gateway.isStripeGateway) {
                await setupStripeGateway(gateway, c);
            }

            if (gateway.isCashGateway) {
                await setupCashGateway(gateway, c);
            }

            console.log('[Gateway has initial token set]', gateway.getCheckoutToken());

            _gateways.pushObject(gateway);
        }

        setGatewayOptions(gateways);
    };

    const fetchGateways = (c = null) => {        store
            .getPaymentGateways()
            .then((gateways) => setupGateways(gateways, c))
            .catch((error) => {
                console.log('[Error fetching payment gateways!]', error);
            });
    };

    const selectStripePaymentMethod = async () => {
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

    const choosePaymentOption = async () => {
        actionSheetRef.current?.setModalVisible();
    };

    const selectPaymentGateway = (gateway) => {
        setGateway(gateway);
        setCheckoutToken(gateway.getCheckoutToken());
        actionSheetRef.current?.setModalVisible(false);

        console.log('[💰 Checkout token set:]', gateway.getCheckoutToken());

        // stripe must present payment sheet
        if (gateway.isStripeGateway) {
            setTimeout(() => {
                selectStripePaymentMethod();
            }, 300);
        }
    };

    const completeStripeOrder = async () => {
        const { error } = await confirmPaymentSheetPayment();

        if (error) {
            console.log(`Error code: ${error.code}`, error.message);
            return setIsLoading(false);
        } else {
            console.log('Success', 'The payment was confirmed successfully!');

            setPaymentSheetEnabled(false);
            return storefront.checkout
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

    const completeCashOrder = () => {
        return storefront.checkout
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
    };

    const placeOrder = () => {
        setIsLoading(true);

        if (gateway.isStripeGateway) {
            return completeStripeOrder();
        }

        if (gateway.isCashGateway) {
            return completeCashOrder();
        }
    };

    const getDeliveryQuote = () => {
        return getServiceQuoteFor(deliverTo);
    };

    const getServiceQuoteFor = (customerLocation) => {
        const quote = new DeliveryServiceQuote(StorefrontAdapter);

        /**
            or

            DeliveryServiceQuote.getFromCart(StorefrontAdapter, storeLocation, deliverTo, cart).then((serviceQuote) => {
                ...
            });
         */

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
        let subtotal = cart.subtotal();

        if (tip) {
            if (typeof tip === 'string' && tip.endsWith('%')) {
                subtotal += calculatePercentage(parseInt(tip), cart.subtotal());
            } else {
                subtotal += tip;
            }
        }

        if (deliveryTip && !isPickupOrder) {
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
    };

    useEffect(() => {
        fetchGateways();

        // Listen for customer updated event
        const customerUpdatedListener = EventRegister.addEventListener('customer.updated', (customer) => {
            setCustomer(customer);
            fetchGateways(customer);
        });

        // Listen for changes to cart
        const cartChanged = addEventListener('cart.changed', (cart) => {
            setCart(cart);
        });

        // Listen for changes to customer delivery location
        const locationChanged = addEventListener('deliver_to.changed', (place) => {
            // update delivery quote
            getServiceQuoteFor(place);
        });

        return () => {
            removeEventListener(customerUpdatedListener);
            removeEventListener(cartChanged);
            removeEventListener(locationChanged);
        };
    }, []);

    return (
        <View style={[tailwind('w-full h-full bg-white relative'), { paddingTop: insets.top }]}>
            <ActionSheet containerStyle={tailwind('h-80')} gestureEnabled={true} bounceOnOpen={true} ref={actionSheetRef}>
                <View>
                    <View style={tailwind('p-5 flex flex-row items-center justify-between')}>
                        <Text style={tailwind('text-lg font-bold')}>Select your payment method</Text>
                        <TouchableOpacity
                            onPress={() => {
                                actionSheetRef.current?.setModalVisible(false);
                            }}
                        >
                            <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                                <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View style={tailwind('h-full px-5')}>
                        {gatewayOptions.map((gateway) => (
                            <TouchableOpacity key={gateway.id} onPress={() => selectPaymentGateway(gateway)} style={tailwind('rounded-md bg-gray-50 p-4 mb-4')}>
                                <View style={tailwind('flex flex-row')}>
                                    <View style={tailwind('w-10')}>{gatewayDetails[gateway.type].icon}</View>
                                    <View>
                                        <Text style={tailwind('font-bold text-base mb-1')}>{gatewayDetails[gateway.type].name}</Text>
                                        <Text>{gatewayDetails[gateway.type].description}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ActionSheet>

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
                        <TouchableOpacity style={tailwind('p-4 rounded-md bg-gray-50 mb-4')} disabled={!customer} onPress={() => navigation.navigate('CheckoutSavedPlaces', { useLeftArrow: true })}>
                            <View style={tailwind('flex flex-row justify-between')}>
                                <View>
                                    <View style={tailwind('flex flex-row items-center mb-3')}>
                                        <Text style={tailwind('font-semibold text-base')}>Delivery Address</Text>
                                        {isInvalidDeliveryPlace && <FontAwesomeIcon icon={faExclamationTriangle} style={tailwind('text-red-400 ml-1')} />}
                                    </View>
                                    {deliverTo && (
                                        <View>
                                            {deliverTo.isAttributeFilled('name') && <Text style={tailwind('font-semibold')}>{deliverTo.getAttribute('name')}</Text>}
                                            <Text>{deliverTo.getAttribute('street1')}</Text>
                                            {deliverTo.isAttributeFilled('street2') && <Text>{deliverTo.getAttribute('street2')}</Text>}
                                            <Text>
                                                {deliverTo.getAttribute('city')}, {deliverTo.getAttribute('country')} {deliverTo.getAttribute('postal_code')}
                                            </Text>
                                            {deliverTo.isAttributeFilled('phone') && <Text>{deliverTo.getAttribute('phone')}</Text>}
                                        </View>
                                    )}
                                    {!deliverTo && (
                                        <View>
                                            <Text style={tailwind('font-semibold')}>Select a delivery location</Text>
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

                    {/* <View style={tailwind('my-4 bg-gray-50 rounded-md p-4')}>
                        <Text numberOfLines={1}>Token: {checkoutToken}</Text>
                    </View> */}

                    <TouchableOpacity style={tailwind('p-4 rounded-md bg-gray-50 mb-4')} disabled={isLoading} onPress={choosePaymentOption}>
                        <View style={tailwind('flex flex-row justify-between')}>
                            <View>
                                <View style={tailwind('flex flex-row justify-between mb-3')}>
                                    <View>
                                        <Text style={tailwind('font-semibold text-base')}>Payment Method</Text>
                                    </View>
                                </View>

                                {gateway === null && (
                                    <View>
                                        <View style={tailwind('flex flex-row justify-between')}>
                                            <Text>Select payment method</Text>
                                        </View>
                                    </View>
                                )}

                                {gateway?.isCashGateway && (
                                    <View>
                                        <View style={tailwind('flex flex-row items-center')}>
                                            <FontAwesomeIcon icon={faMoneyBillWave} size={20} style={tailwind('text-green-400 mr-2')} />
                                            <Text>Cash</Text>
                                        </View>
                                    </View>
                                )}

                                {gateway?.isStripeGateway && (
                                    <View>
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
                                    </View>
                                )}
                            </View>
                            <View style={tailwind('flex justify-center')}>
                                <View style={tailwind('flex items-end justify-center w-12')}>
                                    <FontAwesomeIcon icon={faChevronRight} style={tailwind('text-gray-400')} />
                                </View>
                            </View>
                        </View>
                        {gateway?.isStripeGateway && paymentSheetError !== false && (
                            <View style={tailwind('mt-2 bg-red-50 px-2 py-1 flex flex-row')}>
                                <FontAwesomeIcon icon={faExclamationTriangle} size={14} style={tailwind('text-red-500 mr-1')} />
                                <Text style={tailwind('text-red-500')} numberOfLines={2}>
                                    {paymentSheetError}
                                </Text>
                            </View>
                        )}
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
                        {tip !== 0 && (
                            <View style={tailwind('flex flex-row items-center justify-between py-2')}>
                                <Text>Tip</Text>
                                <Text>{formattedTip}</Text>
                            </View>
                        )}
                        {deliveryTip !== 0 && !isPickupOrder && (
                            <View style={tailwind('flex flex-row items-center justify-between py-2')}>
                                <Text>Delivery Tip</Text>
                                <Text>{formattedDeliveryTip}</Text>
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
