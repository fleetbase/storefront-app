import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ScrollView, RefreshControl, SafeAreaView } from 'react-native';
import { Separator, Button, Image, Stack, Text, YStack, XStack, useTheme } from 'tamagui';
import MapView, { Marker } from 'react-native-maps';
import { Order } from '@fleetbase/sdk';
import { Store } from '@fleetbase/storefront';
import { adapter as fleetbaseAdapter } from '../hooks/use-fleetbase';
import { format as formatDate, formatDistance, add } from 'date-fns';
import { formatCurrency } from '../utils/format';
import { loadPersistedResource } from '../utils';
import LiveOrderRoute from '../components/LiveOrderRoute';
import LivePickupRoute from '../components/LivePickupRoute';
import useStorefrontInfo from '../hooks/use-storefront-info';
import { adapter as storefrontAdapter } from '../hooks/use-storefront';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import useStorage from '../hooks/use-storage';
import PlaceCard from '../components/PlaceCard';
import PlaceMapView from '../components/PlaceMapView';
import OrderItems from '../components/OrderItems';
import OrderTotal from '../components/OrderTotal';
import AlertPromptBox from '../components/AlertPromptBox';
import Badge from '../components/Badge';
import useSocketClusterClient from '../hooks/use-socket-cluster-client';
import FastImage from 'react-native-fast-image';

const OrderScreen = ({ route }) => {
    const params = route.params || {};
    const theme = useTheme();
    const { customer } = useAuth();
    const { info } = useStorefrontInfo();
    const { listen } = useSocketClusterClient();
    const { t } = useLanguage();
    const [order, setOrder] = useState(new Order(params.order, fleetbaseAdapter));
    const [store, setStore] = useStorage(`${order.getAttribute('meta.storefront_id')}`, info);
    const [distanceMatrix, setDistanceMatrix] = useState();
    const [refreshing, setRefreshing] = useState(false);
    const distanceLoadedRef = useRef(false);
    const isPickup = order.getAttribute('meta.is_pickup');
    const isPickupReady = isPickup && order.getAttribute('status') === 'pickup_ready';
    const isEnroute = order.getAttribute('status') === 'driver_enroute';
    const listenerRef = useRef();
    const foodTruckId = order.getAttribute('meta.food_truck_id');

    const confirmOrderPickup = useCallback(async () => {
        try {
            await customer.performAuthorizedRequest('orders/picked-up', { order: order.id }, 'PUT');
            reloadOrder();
        } catch (err) {
            console.error('Error confirming order pickup:', err);
        }
    }, [order, customer]);

    const getDistanceMatrix = useCallback(async () => {
        if (distanceLoadedRef.current) return;
        try {
            const distanceMatrixData = await order.getDistanceAndTime();
            setDistanceMatrix(distanceMatrixData);
            distanceLoadedRef.current = true;
        } catch (err) {
            console.error('Error loading order distance matrix:', err);
        }
    }, [order]);

    const reloadOrder = useCallback(
        async (options = {}) => {
            if (options.refresh) {
                setRefreshing(true);
            }
            try {
                const reloadedOrder = await order.reload();
                setOrder(reloadedOrder);
                distanceLoadedRef.current = false;
            } catch (err) {
                console.error('Error reloading order:', err);
            } finally {
                setRefreshing(false);
            }
        },
        [order]
    );

    const getStoreOrderedFrom = async () => {
        if (info.is_store) {
            return setStore(info);
        }

        try {
            const lookup = await storefrontAdapter.get(`lookup/${order.getAttribute('meta.storefront_id')}`);
            setStore(lookup);
        } catch (err) {
            console.error('Unable to lookup store ordered from:', err);
            toast.err(err.message);
        }
    };

    useEffect(() => {
        if (!store) {
            getStoreOrderedFrom();
        }
    }, []);

    useEffect(() => {
        if (order && !distanceLoadedRef.current) {
            getDistanceMatrix();
        }
    }, [order, getDistanceMatrix]);

    useEffect(() => {
        if (listenerRef.current) {
            return;
        }

        const listenForUpdates = async () => {
            const listener = await listen(`order.${order.id}`, (event) => {
                // only reload order if status changed
                if (order.getAttribute('status') !== event.data.status) {
                    reloadOrder();
                }
            });
            if (listener) {
                listenerRef.current = listener;
            }
        };

        listenForUpdates();

        return () => {
            if (listenerRef.current) {
                listenerRef.current.stop();
            }
        };
    }, [listen, order.id]);

    return (
        <YStack flex={1} bg='$background'>
            <ScrollView
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reloadOrder({ refresh: true })} />}
            >
                <YStack width='100%' height={400} borderBottomWidth={1} borderColor='$borderColorWithShadow'>
                    {isPickup ? <LivePickupRoute order={order} zoom={4} /> : <LiveOrderRoute order={order} zoom={4} customOrigin={foodTruckId} />}
                </YStack>
                <YStack space='$2'>
                    <YStack mt='$4' px='$4' py='$2' alignItems='center' justifyContent='center' space='$2'>
                        <Image mb='$2' width={80} height={80} bg='white' padding='$1' source={{ uri: `data:image/png;base64,${order.getAttribute('tracking_number.qr_code')}` }} />
                        <Text fontSize='$8' fontWeight='bold'>
                            {order.id}
                        </Text>
                        <Text fontSize='$4' color='$textSecondary'>
                            {formatDate(order.createdAt, `PP 'at' p`)}
                        </Text>
                        <Badge status={order.getAttribute('status')} />
                        {isEnroute && (
                            <YStack>
                                <Text fontSize='$4' color='$primary'>
                                    {t('OrderScreen.orderArrivingIn', { eta: formatDistance(new Date(), add(new Date(), { seconds: distanceMatrix.time })) })}
                                </Text>
                            </YStack>
                        )}
                        <AlertPromptBox
                            show={isPickupReady}
                            promptTitle={t('OrderScreen.orderReadyForPickup')}
                            prompt={t('OrderScreen.orderReadyForPickupPrompt')}
                            confirmTitle={t('OrderScreen.orderPickedUp')}
                            confirmMessage={t('OrderScreen.orderPickedUpConfirmMessage')}
                            confirmAlertButtonText={t('OrderScreen.yes')}
                            confirmButtonText={t('OrderScreen.confirmPickup')}
                            confirmButtonText={t('OrderScreen.confirmPickup')}
                            colorScheme='green'
                            onConfirm={confirmOrderPickup}
                            mt='$2'
                        />
                    </YStack>
                    <YStack px='$4' py='$2'>
                        <XStack px='$4' py='$3' bg='$surface' borderRadius='$4' borderWidth={1} borderColor='$borderColorWithShadow'>
                            <YStack mr='$3'>
                                <FastImage source={{ uri: store.logo_url }} style={{ width: 40, height: 40, borderRadius: 6 }} />
                            </YStack>
                            <YStack>
                                <Text color='$textPrimary' fontSize='$5' fontWeight='bold'>
                                    {store.name}
                                </Text>
                                <Text color='$textSecondary' fontSize='$4'>
                                    {order.getAttribute('payload.pickup.name')}
                                </Text>
                                <Text color='$textSecondary' fontSize='$4'>
                                    {order.getAttribute('payload.pickup.street1')}
                                </Text>
                            </YStack>
                        </XStack>
                    </YStack>
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
                    <YStack px='$4' py='$2'>
                        <YStack space='$2' px='$4' py='$3' bg='$surface' borderRadius='$4' borderWidth={1} borderColor='$borderColorWithShadow'>
                            <Text color='$textPrimary' fontSize='$5' fontWeight='bold'>
                                {t('OrderScreen.orderNotes')}
                            </Text>
                            <Text color='$textSecondary' fontSize='$4'>
                                {order.getAttribute('notes', 'N/A') ?? 'N/A'}
                            </Text>
                        </YStack>
                    </YStack>
                    <YStack px='$4' py='$2'>
                        <OrderItems order={order} />
                    </YStack>
                    <YStack px='$4' py='$2'>
                        <OrderTotal order={order} />
                    </YStack>
                </YStack>
                <YStack width='100%' height={200} />
            </ScrollView>
        </YStack>
    );
};

export default OrderScreen;
