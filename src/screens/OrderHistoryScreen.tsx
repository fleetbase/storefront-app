import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, FlatList, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faPencilAlt, faTrash, faStar } from '@fortawesome/free-solid-svg-icons';
import { Spinner, Separator, Text, XStack, YStack, useTheme } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { format as formatDate } from 'date-fns';
import { formatCurrency } from '../utils/format';
import { restoreFleetbaseInstance } from '../utils';
import { Store } from '@fleetbase/storefront';
import { Order } from '@fleetbase/sdk';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { adapter as fleetbaseAdapter } from '../hooks/use-fleetbase';
import { usePromiseWithLoading } from '../hooks/use-promise-with-loading';
import useStorage from '../hooks/use-storage';
import Badge from '../components/Badge';
import Spacer from '../components/Spacer';

const restoreOrders = (orders = []) => {
    return orders.map((order) => new Order(order, fleetbaseAdapter));
};

const OrderHistoryScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { customer } = useAuth();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const [orders, setOrders] = useStorage(`${customer.id}_orders`, []);
    const [refreshing, setRefreshing] = useState(false);

    const fetchOrders = async (params = {}) => {
        try {
            const orders = await runWithLoading(customer.getOrderHistory({ sort: '-created_at', limit: 25, ...params }));
            setOrders(orders.map((order) => order.serialize()));
        } catch (err) {
            console.error('Error loading customer orders:', err);
            toast.error(err.message);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchOrders();
        setRefreshing(false);
    };

    const handleViewOrder = (order) => {
        navigation.navigate('Order', { order: order.serialize() });
    };

    useEffect(() => {
        if (customer) {
            fetchOrders();
        }
    }, [customer]);

    useFocusEffect(
        useCallback(() => {
            if (customer) {
                fetchOrders();
            }
        }, [customer])
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            {isLoading() && !refreshing && (
                <Portal hostName='LoadingIndicatorPortal'>
                    <XStack>
                        <Spinner size='sm' color='$color' />
                    </XStack>
                </Portal>
            )}
            <FlatList
                data={restoreOrders(orders)}
                renderItem={({ item: order }) => (
                    <Pressable onPress={() => handleViewOrder(order)}>
                        <XStack justifyContent='space-between' px='$4' py='$3'>
                            <YStack flex={1} space='$2'>
                                <Text color='$textPrimary' fontWeight='bold' size='$5' numberOfLines={1}>
                                    {order.getAttribute('meta.storefront')}
                                </Text>
                                <Text color='$textSecondary' numberOfLines={1} size='$4'>
                                    {formatDate(order.createdAt, 'MMM, do yyyy H:mm aa')}
                                </Text>
                            </YStack>
                            <YStack space='$2'>
                                <XStack space='$3' justifyContent='flex-end'>
                                    <Text color='$textSecondary'>{formatCurrency(order.getAttribute('meta.total'), order.getAttribute('meta.currency'))}</Text>
                                    <FontAwesomeIcon icon={faChevronRight} size={14} color={theme['$textSecondary'].val} />
                                </XStack>
                                <Badge status={order.getAttribute('status')} alignSelf='flex-start' py='$1' px='$2' />
                            </YStack>
                        </XStack>
                    </Pressable>
                )}
                keyExtractor={(item, index) => item.id || index}
                contentContainerStyle={{ paddingBottom: 16 }}
                ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListFooterComponent={<Spacer height={100} />}
            />
        </SafeAreaView>
    );
};

export default OrderHistoryScreen;
