import { Collection, Place, ServiceQuote } from '@fleetbase/sdk';
import { Cart, DeliveryServiceQuote, Store, StoreLocation } from '@fleetbase/storefront';
import { faArrowLeft, faCashRegister, faChevronRight, faExclamationTriangle, faMoneyBillWave, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import config from 'config';
import { useCustomer, useFleetbase, useMountedState, useStorefront } from 'hooks';
import QpayPaymentSheet from 'interface/QpayPaymentSheet';
import { CheckoutDeliveryMap } from 'interface/widgets';
import React, { createRef, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ActionSheet from 'react-native-actions-sheet';
import { EventRegister } from 'react-native-event-listeners';
import FastImage from 'react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkInfoService } from 'services';
import tailwind from 'tailwind';
import { calculatePercentage, formatCurrency, logError, translate } from 'utils';
import { useResourceCollection, useResourceStorage } from 'utils/Storage';
const { STRIPE_KEY, APP_IDENTIFIER } = config;
let isStripeInitialized = false;

const { addEventListener, removeEventListener, emit } = EventRegister;
const isPaymentGatewayResource = (gateway) => typeof gateway === 'object' && gateway?.resource === 'payment-gateway';

const CheckoutScreen = ({ navigation, route }) => {
    const storefront = useStorefront();
    const fleetbase = useFleetbase();
    const isMounted = useMountedState();
    const actionSheetRef = createRef();

    const StorefrontAdapter = storefront.getAdapter();
    const FleetbaseAdapter = fleetbase.getAdapter();

    const { info, serializedCart, isPickupOrder, isTipping, isTippingDriver, tipAmount, deliveryTipAmount, quote } = route.params;

    const isNetwork = info.is_network === true;
    const store = new Store(info, StorefrontAdapter);
    const insets = useSafeAreaInsets();

    let stores, setStores, storeLocations, setStoreLocations, storeLocationIds, storeIds, origin;

    const [customer, setCustomer] = useCustomer();
    const [paymentSheetError, setPaymentSheetError] = useState(false);
    const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
    const [deliverTo, setDeliverTo] = useResourceStorage('deliver_to', Place, FleetbaseAdapter);
    const [storeLocation, setStoreLocation] = useResourceStorage('store_location', StoreLocation, StorefrontAdapter);
    const [cart, setCart] = useResourceStorage('cart', Cart, StorefrontAdapter, new Cart(serializedCart));
    const [isLoading, setIsLoading] = useState(false);
    const [qpayInvoice, setQPayInvoice] = useState(null);
    const [qpayPaymentSheet, setQpayPaymentSheet] = useState(null);
    const [isFetchingServiceQuote, setIsFetchingServiceQuote] = useState(false);
    const [serviceQuote, setServiceQuote] = useState(new DeliveryServiceQuote(quote));
    const [serviceQuoteError, setServiceQuoteError] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState({ image: '', label: '' });
    const [checkoutToken, setCheckoutToken] = useState(null);
    const [gateway, setGateway] = useState(null);
    const [gatewayOptions, setGatewayOptions] = useState(new Collection());
    const [tip, setTip] = useState(tipAmount ?? 0);
    const [deliveryTip, setDeliveryTip] = useState(deliveryTipAmount ?? 0);

    const { initPaymentSheet, presentPaymentSheet, confirmPaymentSheetPayment } = useStripe();

    const isInvalidDeliveryPlace = !(deliverTo instanceof Place);

    const networkStoreLocations = cart
        .contents()
        .map((cartItem) => cartItem?.store_location_id)
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index);

    // delivery origin
    origin = storeLocation?.id ? new Place(storeLocation.getAttribute('place')) : null;

    useEffect(() => {
        // TODO: Get the Stripe config from the network or store's payment gateway config
        try {
            if (STRIPE_KEY && !isStripeInitialized) {
                initStripe({
                    publishableKey: STRIPE_KEY,
                    merchantIdentifier: APP_IDENTIFIER,
                    setReturnUrlSchemeOnAndroid: true,
                });

                isStripeInitialized = true;
            }
        } catch (error) {
            console.log('Error initializing stripe', error);
        }
    }, []);

    if (isNetwork) {
        [stores, setStores] = useResourceCollection(`checkout_network_stores`, Store, StorefrontAdapter);
        [storeLocations, setStoreLocations] = useResourceCollection(`checkout_network_store_locations`, StoreLocation, StorefrontAdapter);

        // store ids for this order
        storeIds = cart
            .contents()
            .map((cartItem) => cartItem.store_id)
            .filter((id, index, arr) => arr.indexOf(id) === index);

        // storelocation ids for this order
        storeLocationIds = cart
            .contents()
            .map((cartItem) => cartItem.store_location_id)
            .filter((id, index, arr) => arr.indexOf(id) === index);

        // create delivery origins
        origin = storeLocations?.map((sl) => new Place(sl.getAttribute('place')));
    }

    const [gatewayDetails, setGatewayDetails] = useState({
        cash: {
            name: translate('Cart.CheckoutScreen.gatewayDetails.cash.title'),
            icon: <FontAwesomeIcon icon={faMoneyBillWave} size={26} style={tailwind('text-green-400')} />,
            description: translate('Cart.CheckoutScreen.gatewayDetails.cash.description'),
        },
    });

    const canPlaceOrder = (() => {
        let isGatewayValid = isPaymentGatewayResource(gateway);

        if (isGatewayValid && gateway.isStripeGateway) {
            isGatewayValid = isGatewayValid && !!paymentMethod?.label;
        }

        if (isPickupOrder) {
            return !isLoading && typeof customer?.serialize === 'function' && cart instanceof Cart && cart.contents().length > 0 && isGatewayValid;
        }

        return !isLoading && typeof customer?.serialize === 'function' && !isInvalidDeliveryPlace && cart instanceof Cart && cart.contents().length > 0 && isGatewayValid;
    })();

    const formattedTip = (() => {
        if (typeof tip === 'string' && tip.endsWith('%')) {
            const tipAmount = formatCurrency(calculatePercentage(parseInt(tip), cart.subtotal()), cart.getAttribute('currency'));

            return `${tip} (${tipAmount})`;
        }

        return formatCurrency(tip, cart.getAttribute('currency'));
    })();

    const formattedDeliveryTip = (() => {
        if (typeof deliveryTip === 'string' && deliveryTip.endsWith('%')) {
            const tipAmount = formatCurrency(calculatePercentage(parseInt(deliveryTip), cart.subtotal()), cart.getAttribute('currency'));

            return `${deliveryTip} (${tipAmount})`;
        }

        return formatCurrency(deliveryTip, cart.getAttribute('currency'));
    })();

    const openLink = async (url, errorMessage = null) => {
        // Checking if the link is supported for links with custom URL scheme.
        const supported = await Linking.canOpenURL(url).catch(logError);

        if (supported) {
            // Opening the link with some app, if the URL scheme is "http" the web link should be opened
            // by some browser in the mobile
            await Linking.openURL(url).catch(logError);
        } else {
            Alert.alert(errorMessage ?? `Unable to open link!`);
        }
    };

    const updateCart = (cart) => {
        setCart(cart);
        emit('cart.updated', cart);
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
                logError(error, '[ Error initializing checkout token! ]');
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
                applePay: false,
                merchantCountryCode: 'US',
                style: 'alwaysLight',
                googlePay: false,
                testEnv: true,
                returnURL: 'com.fleetbase.storefront://stripe-redirect',
            });

            if (!error) {
                setPaymentSheetEnabled(true);
            } else {
                setPaymentSheetError(error.localizedMessage);
                logError(error, '[ Error enabling stripe payment sheet! ]');
            }

            if (paymentOption) {
                setPaymentMethod(paymentOption);
            }
        } catch (error) {
            logError(error, '[ Error initializing stripe payment intent! ]');
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const setupQpayGateway = async (gateway, c = null) => {
        const currentCustomer = c ?? customer;

        if (!currentCustomer || !isPaymentGatewayResource(gateway)) {
            return null;
        }

        const options = getOrderOptions();

        const { token, invoice } = await storefront.checkout.initialize(currentCustomer, cart, serviceQuote, gateway, options).catch((error) => {
            logError(error, '[ Error initializing checkout token! ]');
        });

        setQPayInvoice(invoice);
        gateway.setCheckoutToken(token);
    };

    const setupCashGateway = async (gateway, c = null) => {
        const currentCustomer = c ?? customer;
        if (!currentCustomer || !isPaymentGatewayResource(gateway)) {
            return null;
        }
        const options = getOrderOptions({ cash: true });

        const response = await storefront.checkout.initialize(currentCustomer, cart, serviceQuote, gateway, options).catch((error) => {
            logError(error, '[ Error initializing checkout token! ]');
        });

        if (response.error) {
            return null;
        }

        const { token } = response;

        if (!token) {
            return null;
        }

        gateway.setCheckoutToken(token);
    };

    const setupGateways = useCallback(async (gateways, c = null) => {
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

            if (gateway.type === 'qpay') {
                await setupQpayGateway(gateway, c);
            }

            if (!gatewayDetails[gateway.type]) {
                gatewayDetails[gateway.type] = {
                    name: gateway.getAttribute('name'),
                    icon: <FontAwesomeIcon icon={faCashRegister} size={26} style={tailwind('text-blue-500')} />,
                    description: gateway.getAttribute('description') ?? `${gateway.type} payment gateway`,
                };
            }

            _gateways.pushObject(gateway);
        }

        setGatewayOptions(_gateways);
        setGatewayDetails(gatewayDetails);
    });

    const fetchGateways = useCallback((c = null) => {
        store
            .getPaymentGateways()
            .then((gateways) => setupGateways(gateways, c))
            .catch((error) => {
                logError(error, '[ Error fetching payment gateways! ]');
            });
    });

    const choosePaymentOption = async () => {
        actionSheetRef.current?.show();
    };

    const selectPaymentGateway = (gateway) => {
        setGateway(gateway);
        setCheckoutToken(gateway.getCheckoutToken());
        actionSheetRef.current?.setModalVisible(false);

        console.log('[ 💰 Checkout token set: ]', gateway.getCheckoutToken());

        // stripe must present payment sheet
        if (gateway.isStripeGateway) {
            setTimeout(() => {
                selectStripePaymentMethod();
            }, 300);
        }
    };

    const selectStripePaymentMethod = async () => {
        const { error, paymentOption } = await presentPaymentSheet({
            confirmPayment: false,
        });

        if (error) {
            logError(error, '[ Error loading stripe payment sheet! ]');
        } else if (paymentOption) {
            setPaymentMethod({
                label: paymentOption.label,
                image: paymentOption.image,
            });
        } else {
            setPaymentMethod(null);
        }
    };

    const completeStripeOrder = async () => {
        const { error } = await confirmPaymentSheetPayment();

        if (error) {
            return setIsLoading(false);
        } else {
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
                    logError(error, '[ Failed to capture order! ]');
                });
        }
    };

    const completeCashOrder = () => {
        return storefront.checkout
            .captureOrder(checkoutToken)
            .then((order) => {
                cart.empty().then((cart) => {
                    updateCart(cart);
                });
                navigation.navigate('OrderCompleted', { serializedOrder: order.serialize() });
            })
            .catch(logError)
            .finally(() => {
                setIsLoading(false);
            });
    };

    const completeQpayOrder = async () => {
        await qpayPaymentSheet?.show();
        setIsLoading(false);
    };

    const placeOrder = () => {
        setIsLoading(true);

        if (gateway?.type === 'qpay') {
            return completeQpayOrder();
        }

        if (gateway?.isStripeGateway) {
            return completeStripeOrder();
        }

        if (gateway?.isCashGateway) {
            return completeCashOrder();
        }

        setIsLoading(false);
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

        if (!cart || (!cart) instanceof Cart || !storeLocation || (!storeLocation) instanceof StoreLocation || !customerLocation) {
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

        if (isNetwork) {
            // Load store locations from the network
            NetworkInfoService.getStoreLocations({ ids: storeLocationIds }).then(setStoreLocations).catch(logError);

            // Load stores from the network
            NetworkInfoService.getStores({ ids: storeIds }).then(setStores).catch(logError);
        }

        // Listen for customer updated event
        const customerUpdatedListener = EventRegister.addEventListener('customer.updated', (customer) => {
            fetchGateways(customer);
        });

        // Listen for changes to cart
        const cartChanged = addEventListener('cart.updated', (cart) => {
            setCart(cart);
            getDeliveryQuote();
        });

        // Listen for changes to customer delivery location
        const locationChanged = addEventListener('location.updated', (place) => {
            // update delivery quote
            getServiceQuoteFor(place);
        });

        return () => {
            removeEventListener(customerUpdatedListener);
            removeEventListener(cartChanged);
            removeEventListener(locationChanged);
        };
    }, [isMounted]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            getDeliveryQuote();
        });

        return unsubscribe;
    }, [isMounted]);

    const renderSelectedPaymentMethod = (selectedGateway) => {
        return selectedGateway.isStripeGateway ? (
            <View>
                <View style={tailwind('flex flex-row justify-between')}>
                    {isLoading && !paymentMethod?.label && <ActivityIndicator color={`rgba(31, 41, 55, .5)`} />}
                    {!isLoading && !paymentMethod?.label && <Text>{translate('Cart.CheckoutScreen.noPaymentMethodLabelText')}</Text>}
                    {paymentMethod?.label !== null && (
                        <View style={tailwind('flex flex-row items-center')}>
                            <FastImage
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
        ) : (
            <View style={tailwind('flex flex-row')}>
                <View style={tailwind('w-10')}>{gatewayDetails[selectedGateway?.type]?.icon}</View>
                <View>
                    <Text style={tailwind('font-bold text-base mb-1')}>{gatewayDetails[selectedGateway?.type]?.name}</Text>
                    <Text>{gatewayDetails[selectedGateway?.type]?.description}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[tailwind('w-full h-full bg-white relative'), { marginTop: insets.top }]}>
            <ActionSheet containerStyle={tailwind('h-80')} gestureEnabled={true} bounceOnOpen={true} ref={actionSheetRef}>
                <View>
                    <View style={tailwind('px-5 py-1 flex flex-row items-center justify-between')}>
                        <Text style={tailwind('text-lg font-bold')}>{translate('Cart.CheckoutScreen.selectPaymentMethodActionSheetTitle')}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                actionSheetRef.current?.hide();
                            }}>
                            <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                                <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View style={tailwind('h-full px-5 pt-4')}>
                        {gatewayOptions?.map((gateway) => (
                            <TouchableOpacity key={gateway.id} onPress={() => selectPaymentGateway(gateway)} style={tailwind('rounded-md bg-gray-50 p-2 mb-4')}>
                                <View style={tailwind('flex flex-row')}>
                                    <View style={tailwind('w-10')}>{gatewayDetails[gateway?.type]?.icon}</View>
                                    <View>
                                        <Text style={tailwind('font-bold text-base mb-1')}>{gatewayDetails[gateway?.type]?.name}</Text>
                                        <Text>{gatewayDetails[gateway?.type]?.description}</Text>
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
                    <Text style={tailwind('text-xl font-semibold')}>{translate('Cart.CheckoutScreen.checkoutLabelText')}</Text>
                </View>
            </View>

            <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                <View style={tailwind('p-4')}>
                    {!customer && (
                        <View style={tailwind('p-4 rounded-md bg-red-50 mb-4')}>
                            <View style={tailwind('flex flex-col overflow-hidden')}>
                                <View style={tailwind('flex flex-row items-center mb-3 w-full')}>
                                    <FontAwesomeIcon icon={faExclamationTriangle} size={14} style={tailwind('text-red-500 mr-2')} />
                                    <Text style={tailwind('text-red-600 text-sm font-semibold')} numberOfLines={1}>
                                        {translate('Cart.CheckoutScreen.loginToCheckoutWarningText')}
                                    </Text>
                                </View>
                                <TouchableOpacity style={tailwind('w-full')} disabled={isLoading} onPress={login}>
                                    <View style={tailwind('btn border border-red-100 bg-red-100 w-full')}>
                                        <Text style={tailwind('font-semibold text-red-900')}>{translate('Cart.CheckoutScreen.loginButtonText')}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {!isPickupOrder && <CheckoutDeliveryMap info={info} origin={origin} destination={deliverTo} wrapperStyle={tailwind('mb-4')} />}
                    {!isPickupOrder && (
                        <TouchableOpacity
                            style={tailwind('p-4 rounded-md bg-gray-50 mb-4')}
                            disabled={!customer}
                            onPress={() => navigation.navigate('CheckoutSavedPlaces', { useLeftArrow: true })}>
                            <View style={tailwind('flex flex-row justify-between')}>
                                <View>
                                    <View style={tailwind('flex flex-row items-center mb-3')}>
                                        <Text style={tailwind('font-semibold text-base')}>{translate('Cart.CheckoutScreen.addressLabelText')}</Text>
                                        {isInvalidDeliveryPlace && <FontAwesomeIcon icon={faExclamationTriangle} style={tailwind('text-red-400 ml-1')} />}
                                    </View>
                                    {deliverTo && (
                                        <View>
                                            {deliverTo.isAttributeFilled('name') && <Text style={tailwind('font-semibold')}>{deliverTo.getAttribute('name')}</Text>}
                                            <Text>{deliverTo.getAttribute('street1') ?? deliverTo.getAttribute('postal_code') ?? deliverTo.getAttribute('district')}</Text>
                                            {deliverTo.isAttributeFilled('street2') && <Text>{deliverTo.getAttribute('street2')}</Text>}
                                            <Text>
                                                {deliverTo.getAttribute('city')}, {deliverTo.getAttribute('country')} {deliverTo.getAttribute('postal_code')}
                                            </Text>
                                            {deliverTo.isAttributeFilled('phone') && <Text>{deliverTo.getAttribute('phone')}</Text>}
                                        </View>
                                    )}
                                    {!deliverTo && (
                                        <View>
                                            <Text style={tailwind('font-semibold')}>{translate('Cart.CheckoutScreen.selectAddressLabelText')}</Text>
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

                    <TouchableOpacity
                        style={tailwind(`p-4 rounded-md bg-gray-50 mb-4 ${gatewayOptions?.length === 0 ? 'opacity-50' : ''}`)}
                        disabled={isLoading || gatewayOptions?.length === 0}
                        onPress={choosePaymentOption}>
                        <View style={tailwind('flex flex-row justify-between')}>
                            <View>
                                <View style={tailwind('flex flex-row justify-between mb-3')}>
                                    <View>
                                        <Text style={tailwind('font-semibold text-base')}>{translate('Cart.CheckoutScreen.paymentMethodLabelText')}</Text>
                                    </View>
                                </View>

                                {gateway === null ? (
                                    <View>
                                        <View style={tailwind('flex flex-row justify-between')}>
                                            <Text>{translate('Cart.CheckoutScreen.selectPaymentMethodLabelText')}</Text>
                                        </View>
                                    </View>
                                ) : (
                                    renderSelectedPaymentMethod(gateway)
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
                                    <Text style={tailwind('font-semibold text-base')}>
                                        {translate('Cart.CheckoutScreen.cartLabelText', { cartUniqueItemsCount: cart.getAttribute('total_unique_items') })}
                                    </Text>
                                </View>
                                <View style={tailwind('flex flex-row justify-between')}>
                                    <View style={tailwind('flex-1 flex flex-row')}>
                                        {cart.contents().map((cartItem, index) => (
                                            <View key={index} style={tailwind('mr-2 flex items-center justify-center w-20')}>
                                                <View style={tailwind('border border-gray-200 flex items-center justify-center w-16 h-16 mb-2')}>
                                                    <FastImage source={{ uri: cartItem.product_image_url }} style={tailwind('w-10 h-10')} />
                                                </View>
                                                <Text style={tailwind('text-center text-xs mb-1')} numberOfLines={1}>
                                                    {cartItem.name}
                                                </Text>
                                                <Text style={tailwind('text-center text-xs')} numberOfLines={1}>
                                                    x{cartItem.quantity} {formatCurrency(cartItem.subtotal, cart.getAttribute('currency'))}
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
                        <Text style={tailwind('font-semibold text-base')}>{translate('Cart.CheckoutScreen.orderSummaryLabelText')}</Text>
                    </View>
                    <View style={tailwind('pb-40')}>
                        <View style={tailwind('flex flex-row items-center justify-between py-2')}>
                            <Text>{translate('Cart.CheckoutScreen.subtotalLabelText')}</Text>
                            <Text>{formatCurrency(cart.subtotal(), cart.getAttribute('currency'))}</Text>
                        </View>
                        {!isPickupOrder && (
                            <View style={tailwind('flex flex-row items-center justify-between py-2')}>
                                <Text>{translate('Cart.CheckoutScreen.deliveryFeeLabelText')}</Text>
                                <Text>{isFetchingServiceQuote ? <ActivityIndicator /> : formatCurrency(serviceQuote.getAttribute('amount'), cart.getAttribute('currency'))}</Text>
                            </View>
                        )}
                        {tip !== 0 && (
                            <View style={tailwind('flex flex-row items-center justify-between py-2')}>
                                <Text>{translate('Cart.CheckoutScreen.tipLabelText')}</Text>
                                <Text>{formattedTip}</Text>
                            </View>
                        )}
                        {deliveryTip !== 0 && !isPickupOrder && (
                            <View style={tailwind('flex flex-row items-center justify-between py-2')}>
                                <Text>{translate('Cart.CheckoutScreen.deliveryTipLabelText')}</Text>
                                <Text>{formattedDeliveryTip}</Text>
                            </View>
                        )}
                        <View style={tailwind('flex flex-row items-center justify-between mt-2 pt-4 border-t-2 border-gray-900')}>
                            <Text style={tailwind('font-semibold')}>{translate('Cart.CheckoutScreen.orderTotalLabelText')}</Text>
                            <Text style={tailwind('font-semibold')}>{formatCurrency(calculateTotal(), cart.getAttribute('currency'))}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={tailwind('absolute w-full bottom-7')}>
                <View style={tailwind('w-full bg-white shadow-sm px-4 py-6')}>
                    <View style={tailwind('flex flex-row justify-between mb-2')}>
                        <View>
                            <Text style={tailwind('text-gray-400')}>{translate('Cart.CheckoutScreen.orderTotalLabelText')}</Text>
                            <Text style={tailwind('font-bold text-base')}>{formatCurrency(calculateTotal(), cart.getAttribute('currency'))}</Text>
                        </View>
                        <TouchableOpacity onPress={placeOrder} disabled={!canPlaceOrder}>
                            <View
                                style={tailwind(
                                    `flex flex-row items-center justify-center rounded-md px-8 py-2 bg-white bg-green-500 border border-green-500 ${
                                        isLoading || !canPlaceOrder ? 'bg-opacity-50 border-opacity-50' : ''
                                    }`
                                )}>
                                {isLoading && <ActivityIndicator color={'rgba(6, 78, 59, .5)'} style={tailwind('mr-2')} />}
                                <Text style={tailwind(`font-semibold text-white text-lg ${isLoading ? 'text-opacity-50' : ''}`)}>
                                    {translate('Cart.CheckoutScreen.submitOrderButtonText')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <QpayPaymentSheet invoice={qpayInvoice} onPress={(bank) => openLink(bank.link, `Unable to open ${bank.name} app!`)} onReady={setQpayPaymentSheet} />
        </View>
    );
};

export default CheckoutScreen;
