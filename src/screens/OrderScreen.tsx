import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ScrollView, SafeAreaView } from 'react-native';
import { Separator, Button, Image, Stack, Text, YStack, XStack, useTheme } from 'tamagui';
import { Order } from '@fleetbase/sdk';
import { Store } from '@fleetbase/storefront';
import { adapter as fleetbaseAdapter } from '../hooks/use-fleetbase';
import { format as formatDate, formatDistance, add } from 'date-fns';
import { formatCurrency } from '../utils/format';
import { loadPersistedResource } from '../utils';
import LiveOrderRoute from '../components/LiveOrderRoute';
import useStorefrontInfo from '../hooks/use-storefront-info';
import { adapter as storefrontAdapter } from '../hooks/use-storefront';
import useStorage from '../hooks/use-storage';
import PlaceCard from '../components/PlaceCard';
import OrderItems from '../components/OrderItems';
import OrderTotal from '../components/OrderTotal';
import Badge from '../components/Badge';
import useSocketClusterClient from '../hooks/use-socket-cluster-client';

const OrderScreen = ({ route }) => {
    const params = route.params || {};
    const theme = useTheme();
    const { info } = useStorefrontInfo();
    const { listen } = useSocketClusterClient();
    const [order, setOrder] = useState(new Order(params.order, fleetbaseAdapter));
    const [distanceMatrix, setDistanceMatrix] = useState();
    const [store, setStore] = useStorage(`${order.getAttribute('meta.storefront_id')}`, info);
    const isPickup = order.getAttribute('meta.is_pickup');
    const isEnroute = order.getAttribute('status') === 'driver_enroute';
    const listenerRef = useRef();

    const getDistanceMatrix = useCallback(async () => {
        try {
            const distanceMatrix = await order.getDistanceAndTime();
            setDistanceMatrix(distanceMatrix);
        } catch (err) {
            console.error('Error loading order distance matrix:', err);
        }
    }, [order]);

    const reloadOrder = useCallback(async () => {
        console.log('[order]', order);
        try {
            // const order = await order.reload();
            // setOrder(order);
        } catch (err) {
            console.error('Error reloading order:', err);
        }
    }, [order]);

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
        if (!order || listenerRef.current) {
            return;
        }

        const listenForUpdates = async () => {
            const listener = await listen(`order.${order.id}`, (event) => {
                reloadOrder();
                getDistanceMatrix();
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
    }, [listen, order]);

    return (
        <YStack flex={1} bg='$background'>
            <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
                <YStack width='100%' height={400} borderBottomWidth={1} borderColor='$borderColorWithShadow'>
                    <LiveOrderRoute order={order} zoom={4} />
                </YStack>
                <YStack space='$2'>
                    <YStack mt='$4' px='$4' py='$2' alignItems='center' justifyContent='center' space='$2'>
                        <Image mb='$2' width={80} height={80} bg='white' source={{ uri: `data:image/png;base64,${order.getAttribute('tracking_number.qr_code')}` }} />
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
                                    Order arriving in {formatDistance(new Date(), add(new Date(), { seconds: distanceMatrix.time }))}
                                </Text>
                            </YStack>
                        )}
                    </YStack>
                    <YStack px='$4' py='$2'>
                        <XStack px='$4' py='$3' bg='$surface' borderRadius='$4' borderWidth={1} borderColor='$borderColorWithShadow'>
                            <YStack mr='$3'>
                                <Image source={{ uri: store.logo_url }} width={40} height={40} borderRadius='$4' />
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
                            name={isPickup ? 'Pickup Location' : 'Delivery Location'}
                            headerComponent={
                                <Text mb='$2' fontSize='$5' color='$textPrimary' fontWeight='bold'>
                                    {isPickup ? 'Pickup Location' : 'Delivery Location'}
                                </Text>
                            }
                        />
                    </YStack>
                    <YStack px='$4' py='$2'>
                        <YStack space='$2' px='$4' py='$3' bg='$surface' borderRadius='$4' borderWidth={1} borderColor='$borderColorWithShadow'>
                            <Text color='$textPrimary' fontSize='$5' fontWeight='bold'>
                                Order Notes
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
