import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Spinner, Separator, Text, XStack, YStack, useTheme } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { format as formatDate } from 'date-fns';
import { formatCurrency, titleize } from '../utils/format';
import { Order } from '@fleetbase/sdk';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { adapter as fleetbaseAdapter } from '../hooks/use-fleetbase';
import { usePromiseWithLoading } from '../hooks/use-promise-with-loading';
import useStorage from '../hooks/use-storage';
import Badge from '../components/Badge';
import Spacer from '../components/Spacer';
import ScreenWrapper from '../components/ScreenWrapper';

const restoreOrders = (orders: any[] = []) => orders.map((order) => new Order(order, fleetbaseAdapter));

const OrderHistoryScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { customer } = useAuth();
    const { t } = useLanguage();
    const { runWithLoading, isLoading } = usePromiseWithLoading();

    // Persist serialized orders
    const [storedOrders, setStoredOrders] = useStorage(`${customer?.id}_orders`, []);
    const [ordersDirty, setOrdersDirty] = useStorage(`${customer?.id}_orders_dirty`, false);

    const [refreshing, setRefreshing] = useState(false);
    const [fetchingOrders, setFetchingOrders] = useState(false);

    /** Prevent overlapping fetch calls */
    const isFetchingRef = useRef(false);

    /** NEW: Prevent infinite fetch caused by empty results */
    const hasFetchedOnce = useRef(false);

    /** Hydrate SDK Order instances */
    const orders = useMemo(() => restoreOrders(storedOrders), [storedOrders]);

    /** Fetch orders from API */
    const fetchOrders = useCallback(async () => {
        if (!customer) return;
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        setFetchingOrders(true);

        try {
            const result = await runWithLoading(
                customer.getOrderHistory({
                    sort: '-created_at',
                    limit: 25,
                })
            );

            // Store serialized orders
            const serialized = result.map((order: Order) => order.serialize());
            setStoredOrders(serialized);

            // Mark as clean
            setOrdersDirty(false);

            // Mark that we fetched at least once
            hasFetchedOnce.current = true;
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            isFetchingRef.current = false;
            setFetchingOrders(false);
        }
    }, [customer, runWithLoading, setStoredOrders, setOrdersDirty]);

    /** Pull-down refresh */
    const handleRefresh = useCallback(async () => {
        if (!customer) return;

        setRefreshing(true);
        await fetchOrders();
        setRefreshing(false);
    }, [customer, fetchOrders]);

    /** View order details */
    const handleViewOrder = useCallback(
        (order: Order) => {
            navigation.navigate('Order', { order: order.serialize() });
        },
        [navigation]
    );

    /**
     * Focus Effect (Fired when screen becomes visible)
     *
     * Runs EXACTLY in this order:
     * - If never fetched before → fetch once (even if empty)
     * - Else if dirty → fetch
     * - Otherwise → do nothing
     *
     * Stored orders being empty will NOT re-trigger fetches.
     */
    useFocusEffect(
        useCallback(() => {
            if (!customer) return;

            const isNotFetching = !isFetchingRef.current;

            // 1. First time viewing screen → fetch once
            if (!hasFetchedOnce.current && isNotFetching) {
                fetchOrders();
                return;
            }

            // 2. If dirty (e.g., new order placed) → fetch
            if (ordersDirty && isNotFetching) {
                fetchOrders();
                return;
            }

            // 3. Otherwise → no action (no infinite loops)
        }, [customer, ordersDirty, fetchOrders])
    );

    return (
        <ScreenWrapper collapsable={false}>
            {(isLoading() || fetchingOrders) && !refreshing && (
                <Portal hostName='LoadingIndicatorPortal'>
                    <XStack px='$3' py='$3' alignItems='center' justifyContent='center'>
                        <Spinner size='small' color='$color' />
                    </XStack>
                </Portal>
            )}

            <FlatList
                data={orders}
                keyExtractor={(order) => order.id?.toString?.() ?? order.getAttribute('public_id') ?? String(order.getAttribute('uuid'))}
                renderItem={({ item: order }) => (
                    <Pressable onPress={() => handleViewOrder(order)}>
                        <XStack justifyContent='space-between' px='$4' py='$3'>
                            <YStack flex={1} space='$2'>
                                <XStack space='$2'>
                                    <Text color='$textPrimary' fontWeight='bold' size='$5' numberOfLines={1}>
                                        {order.getAttribute('meta.storefront')}
                                    </Text>
                                </XStack>

                                <Text color='$textPrimary' size='$5' numberOfLines={1}>
                                    {order.getAttribute('id')}
                                </Text>

                                <Text color='$textSecondary' numberOfLines={1} size='$4'>
                                    {formatDate(order.createdAt, 'MMM d, yyyy h:mm aa')}
                                </Text>
                            </YStack>

                            <YStack space='$2' alignItems='flex-end'>
                                <XStack space='$3' alignItems='center'>
                                    <Text color='$textSecondary'>{formatCurrency(order.getAttribute('meta.total'), order.getAttribute('meta.currency'))}</Text>
                                    <FontAwesomeIcon icon={faChevronRight} size={14} color={theme['$textSecondary'].val} />
                                </XStack>

                                <Badge status={order.getAttribute('status')} alignSelf='flex-end' py='$1' px='$2'>
                                    {t(`orderStatuses.${order.getAttribute('status')}`, {
                                        defaultValue: titleize(order.getAttribute('status')),
                                    })}
                                </Badge>
                            </YStack>
                        </XStack>
                    </Pressable>
                )}
                contentContainerStyle={{ paddingBottom: 16 }}
                ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary.val]} tintColor={theme.primary.val} progressViewOffset={0} />}
                ListHeaderComponent={<Spacer height={Platform.select({ ios: insets.top, android: insets.top + 15 })} />}
                ListFooterComponent={<Spacer height={100} />}
            />
        </ScreenWrapper>
    );
};

export default OrderHistoryScreen;
