import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { Button, Image, Stack, Text, YStack, XStack, useTheme } from 'tamagui';
import { Order } from '@fleetbase/sdk';
import { adapter as fleetbaseAdapter } from '../hooks/use-fleetbase';
import { format as formatDate, formatDistance, add } from 'date-fns';
import { titleize, foodTruckDisplayName } from '../utils/format';
import { isArray, getFoodTruckById } from '../utils';
import LiveOrderRoute from '../components/LiveOrderRoute';
import LivePickupRoute from '../components/LivePickupRoute';
import useStorefrontInfo from '../hooks/use-storefront-info';
import useStorefront from '../hooks/use-storefront';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import useStorage from '../hooks/use-storage';
import PlaceCard from '../components/PlaceCard';
import OrderItems from '../components/OrderItems';
import OrderTotal from '../components/OrderTotal';
import AlertPromptBox from '../components/AlertPromptBox';
import Badge from '../components/Badge';
import useSocketClusterClient from '../hooks/use-socket-cluster-client';
import FastImage from 'react-native-fast-image';

const OrderScreen = ({ route }) => {
    const params = route.params || {};
    const theme = useTheme();
    const navigation = useNavigation();
    const { customer } = useAuth();
    const { storefront, adapter: storefrontAdapter } = useStorefront();
    const { info } = useStorefrontInfo();
    const { listen } = useSocketClusterClient();
    const { t } = useLanguage();

    // --- State
    const [order, setOrder] = useState(() => new Order(params.order, fleetbaseAdapter));
    const [foodTruck, setFoodTruck] = useState();
    const [distanceMatrix, setDistanceMatrix] = useState();
    const [refreshing, setRefreshing] = useState(false);

    // Persisted store (seed with info if applicable)
    const storeId = useMemo(() => order.getAttribute('meta.storefront_id'), [order]);
    const [store, setStore] = useStorage(`${storeId}`, info);

    // --- Refs
    const distanceLoadedRef = useRef(false);
    const listenerRef = useRef();
    const orderRef = useRef(order);
    const statusRef = useRef(order.getAttribute('status'));

    // --- Derived
    const isPickup = useMemo(() => !!order.getAttribute('meta.is_pickup'), [order]);
    const status = useMemo(() => order.getAttribute('status'), [order]);
    const isPickupReady = useMemo(() => isPickup && status === 'pickup_ready', [isPickup, status]);
    const isEnroute = useMemo(() => status === 'driver_enroute', [status]);
    const foodTruckId = useMemo(() => order.getAttribute('meta.food_truck_id'), [order]);
    const paymentGateway = useMemo(() => order.getAttribute('payload.payment_method'), [order]);
    const usedQpay = useMemo(() => paymentGateway === 'qpay', [paymentGateway]);

    const pickupName = useMemo(() => {
        if (foodTruck) return foodTruckDisplayName(foodTruck);
        return order.getAttribute('payload.pickup.name');
    }, [foodTruck, order]);

    const qrCodeBase64 = useMemo(() => order.getAttribute('tracking_number.qr_code'), [order]);
    const qrSource = useMemo(() => (qrCodeBase64 ? { uri: `data:image/png;base64,${qrCodeBase64}` } : undefined), [qrCodeBase64]);

    const canRenderRoute = useMemo(() => {
        if (!order) return false;

        const pickup = order.getAttribute('payload.pickup');
        const dropoff = order.getAttribute('payload.dropoff');
        const isPickupOrder = !!order.getAttribute('meta.is_pickup');
        const ftId = order.getAttribute('meta.food_truck_id');

        // Tune this to how LiveOrderRoute/LivePickupRoute behaves,
        // but be stricter than "truthy object"
        if (isPickupOrder) {
            return !!pickup;
        }

        // Food truck origin + dropoff OR pickup is usually required
        if (ftId) {
            return (!!dropoff || !!pickup) && foodTruck;
        }

        // Standard delivery: need at least pickup + dropoff
        return !!pickup && !!dropoff;
    }, [order, foodTruck]);

    // --- Actions
    const confirmOrderPickup = useCallback(async () => {
        try {
            await customer.performAuthorizedRequest('orders/picked-up', { order: order.id }, 'PUT');
            await reloadOrder();
        } catch (err) {
            console.error('Error confirming order pickup:', err);
        }
    }, [customer, order.id /* reloadOrder is defined below, add dep via inline fn or after definition */]);

    const getDistanceMatrix = useCallback(async () => {
        if (distanceLoadedRef.current) return;
        try {
            const matrix = await order.getDistanceAndTime?.();
            if (matrix) {
                setDistanceMatrix(matrix);
                distanceLoadedRef.current = true;
            }
        } catch (err) {
            console.error('Error loading order distance matrix:', err);
        }
    }, [order]);

    const reloadOrder = useCallback(async (options = {}) => {
        if (options.refresh) setRefreshing(true);

        try {
            const reloaded = await orderRef.current.reload();
            setOrder(reloaded);
            statusRef.current = reloaded.getAttribute('status');
            distanceLoadedRef.current = false;
        } catch (err) {
            console.error('Error reloading order:', err);
        } finally {
            setRefreshing(false);
        }
    }, []);

    // Wire confirmOrderPickup after reloadOrder defined to keep hook deps correct
    // (redefine with correct deps)
    const confirmPickup = useCallback(async () => {
        try {
            await customer.performAuthorizedRequest('orders/picked-up', { order: order.id }, 'PUT');
            await reloadOrder();
        } catch (err) {
            console.error('Error confirming order pickup:', err);
        }
    }, [customer, order.id, reloadOrder]);

    const getStoreOrderedFrom = useCallback(async () => {
        if (store) return; // already loaded via storage
        if (info?.is_store) {
            setStore(info);
            return;
        }
        try {
            if (storeId) {
                const lookup = await storefrontAdapter.get(`lookup/${storeId}`);
                setStore(lookup);
            }
        } catch (err) {
            console.error('Unable to lookup store ordered from:', err);
        }
    }, [info, setStore, store, storeId, storefrontAdapter]);

    const fetchFoodTruck = useCallback(async () => {
        if (!storefront || !foodTruckId) return;

        // try cache
        const cached = getFoodTruckById(foodTruckId);
        if (cached) setFoodTruck(cached);

        try {
            const ft = await storefront.foodTrucks.queryRecord({
                public_id: foodTruckId,
                with_deleted: true,
            });
            setFoodTruck(isArray(ft) && ft.length ? ft[0] : ft);
        } catch (error) {
            console.error('Error fetching food truck:', error);
        }
    }, [storefront, foodTruckId]);

    // --- Effects
    useEffect(() => {
        getStoreOrderedFrom();
    }, [getStoreOrderedFrom]);

    useEffect(() => {
        fetchFoodTruck();
    }, [fetchFoodTruck]);

    useEffect(() => {
        if (!distanceLoadedRef.current) {
            getDistanceMatrix();
        }
    }, [getDistanceMatrix, order]);

    useEffect(() => {
        // Prevent duplicate listeners
        if (listenerRef.current) return;

        let stopped = false;
        const listenForUpdates = async () => {
            try {
                const listener = await listen(`order.${order.id}`, (event) => {
                    // Only reload when status actually changes (use ref to avoid stale closures)
                    const nextStatus = event?.data?.status;
                    if (nextStatus && statusRef.current !== nextStatus) {
                        reloadOrder();
                    }
                });
                if (!stopped && listener) {
                    listenerRef.current = listener;
                }
            } catch (e) {
                console.error('Socket listen error:', e);
            }
        };

        listenForUpdates();

        return () => {
            stopped = true;
            if (listenerRef.current) {
                listenerRef.current.stop?.();
                listenerRef.current = null;
            }
        };
    }, [listen, order.id, reloadOrder]);

    // Keep statusRef in sync when `order` changes
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        orderRef.current = order;
    }, [order]);

    const onRefresh = useCallback(() => reloadOrder({ refresh: true }), [reloadOrder]);

    // --- Render
    return (
        <YStack flex={1} bg='$background'>
            <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                <YStack width='100%' height={400} borderBottomWidth={1} borderColor='$borderColorWithShadow'>
                    {canRenderRoute && (
                        <YStack flex={1}>{isPickup ? <LivePickupRoute order={order} zoom={4} /> : <LiveOrderRoute order={order} zoom={4} customOrigin={foodTruck ?? foodTruckId} />}</YStack>
                    )}
                </YStack>

                <YStack space='$2'>
                    {/* Header / QR / Meta */}
                    <YStack mt='$4' px='$4' py='$2' alignItems='center' justifyContent='center' space='$2'>
                        {qrSource ? <Image mb='$2' width={80} height={80} bg='white' padding='$1' source={qrSource} /> : null}

                        <Text fontSize='$8' fontWeight='bold'>
                            {order.id}
                        </Text>

                        <Text fontSize='$4' color='$textSecondary'>
                            {formatDate(order.createdAt, `PP 'at' p`)}
                        </Text>

                        <Badge status={status}>{t(`orderStatuses.${status}`, { defaultValue: titleize(status) })}</Badge>

                        {usedQpay && (
                            <YStack mt='$1'>
                                <Button bg='$white' borderWidth={1} borderColor='$borderColor' size={35} onPress={() => navigation.navigate('Receipt', { order: order.serialize() })}>
                                    <Button.Icon>
                                        <Image width={20} height={20} bg='white' source={require('../../assets/images/payment-logos/ebarimt.png')} />
                                    </Button.Icon>
                                    <Button.Text color='$black'>{t('ReceiptScreen.title')}</Button.Text>
                                </Button>
                            </YStack>
                        )}

                        {isEnroute && distanceMatrix?.time ? (
                            <YStack>
                                <Text fontSize='$4' color='$primary'>
                                    {t('OrderScreen.orderArrivingIn', {
                                        eta: formatDistance(new Date(), add(new Date(), { seconds: distanceMatrix.time })),
                                    })}
                                </Text>
                            </YStack>
                        ) : null}

                        <AlertPromptBox
                            show={isPickupReady}
                            promptTitle={t('OrderScreen.orderReadyForPickup')}
                            prompt={t('OrderScreen.orderReadyForPickupPrompt')}
                            confirmTitle={t('OrderScreen.orderPickedUp')}
                            confirmMessage={t('OrderScreen.orderPickedUpConfirmMessage')}
                            confirmAlertButtonText={t('OrderScreen.yes')}
                            confirmButtonText={t('OrderScreen.confirmPickup')}
                            colorScheme='green'
                            onConfirm={confirmPickup}
                            mt='$2'
                        />
                    </YStack>

                    {/* Store / Pickup summary */}
                    <YStack px='$4' py='$2'>
                        <XStack px='$4' py='$3' bg='$surface' borderRadius='$4' borderWidth={1} borderColor='$borderColorWithShadow'>
                            <YStack mr='$3'>
                                {store?.logo_url ? (
                                    <FastImage source={{ uri: store.logo_url }} style={{ width: 40, height: 40, borderRadius: 6 }} />
                                ) : (
                                    <Stack width={40} height={40} borderRadius={6} bg='$backgroundFocus' />
                                )}
                            </YStack>

                            <YStack>
                                <Text color='$textPrimary' fontSize='$5' fontWeight='bold'>
                                    {store?.name ?? ''}
                                </Text>
                                <Text color='$textSecondary' fontSize='$4'>
                                    {pickupName ?? ''}
                                </Text>
                                <Text color='$textSecondary' fontSize='$4'>
                                    {order.getAttribute('payload.pickup.street1') ?? ''}
                                </Text>
                            </YStack>
                        </XStack>
                    </YStack>

                    {/* Place card */}
                    <YStack px='$4' py='$2'>
                        <PlaceCard
                            place={isPickup ? order.getAttribute('payload.pickup') : order.getAttribute('payload.dropoff')}
                            mapViewHeight={100}
                            name={isPickup ? t('OrderScreen.pickupLocation') : t('OrderScreen.deliveryLocation')}
                            headerComponent={
                                <Text mb='$2' fontSize='$5' color='$textPrimary' fontWeight='bold'>
                                    {isPickup ? t('OrderScreen.pickupLocation') : t('OrderScreen.deliveryLocation')}
                                </Text>
                            }
                        />
                    </YStack>

                    {/* Notes */}
                    <YStack px='$4' py='$2'>
                        <YStack space='$2' px='$4' py='$3' bg='$surface' borderRadius='$4' borderWidth={1} borderColor='$borderColorWithShadow'>
                            <Text color='$textPrimary' fontSize='$5' fontWeight='bold'>
                                {t('OrderScreen.orderNotes')}
                            </Text>
                            <Text color='$textSecondary' fontSize='$4'>
                                {order.getAttribute('notes') ?? 'N/A'}
                            </Text>
                        </YStack>
                    </YStack>

                    {/* Items / Total */}
                    <YStack px='$4' py='$2'>
                        <OrderItems order={order} />
                    </YStack>
                    <YStack px='$4' py='$2'>
                        <OrderTotal order={order} />
                    </YStack>
                </YStack>

                {/* Spacer for scroll breathing room */}
                <YStack width='100%' height={200} />
            </ScrollView>
        </YStack>
    );
};

export default OrderScreen;
