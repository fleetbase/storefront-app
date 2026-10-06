import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faPhone, faReceipt, faXmark } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { Order } from '@fleetbase/sdk';
import { format as formatDate, formatDistanceToNowStrict, add } from 'date-fns';
import { adapter as fleetbaseAdapter } from '../hooks/use-fleetbase';
import useStorefront from '../hooks/use-storefront';
import useStorefrontInfo from '../hooks/use-storefront-info';
import useStorage from '../hooks/use-storage';
import useSocketClusterClient from '../hooks/use-socket-cluster-client';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import { foodTruckDisplayName, formatCurrency } from '../utils/format';
import { isArray, getFoodTruckById } from '../utils';
import { orderProgress, shortName, type OrderPhase } from '../commerce/order-progress';
import LiveOrderRoute from '../components/LiveOrderRoute';
import LivePickupRoute from '../components/LivePickupRoute';
import { Button, IconButton, Sheet, StoreLogo, UIText, initials, radius, space, usableImageUrl } from '../ui';

const MAP_HEIGHT = 380;

/**
 * Order tracking: the live route on top, then a sheet with where the order is, the
 * timeline, the driver, pickup confirmation and the order details. Updates arrive over
 * the order's socket channel; pull to refresh reloads it.
 */
const OrderScreen = ({ route }: any) => {
    const params = route.params || {};
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { customer } = useAuth();
    const { storefront, adapter: storefrontAdapter } = useStorefront();
    const { info } = useStorefrontInfo();
    const { mode } = useStorefrontRuntime();
    const { listen } = useSocketClusterClient();
    const { t } = useLanguage();

    const [order, setOrder] = useState<any>(() => new Order(params.order, fleetbaseAdapter));
    const [foodTruck, setFoodTruck] = useState<any>();
    const [distanceMatrix, setDistanceMatrix] = useState<any>();
    const [refreshing, setRefreshing] = useState(false);
    const [confirmingPickup, setConfirmingPickup] = useState(false);
    const [pickupSheet, setPickupSheet] = useState(false);

    const storeId = useMemo(() => order.getAttribute('meta.storefront_id'), [order]);
    const [store, setStore] = useStorage(`${storeId}`, info);

    const distanceLoadedRef = useRef(false);
    const listenerRef = useRef<any>(null);
    const orderRef = useRef(order);
    const statusRef = useRef(order.getAttribute('status'));

    const isPickup = !!order.getAttribute('meta.is_pickup');
    const status = order.getAttribute('status');
    const foodTruckId = order.getAttribute('meta.food_truck_id');
    const usedQpay = order.getAttribute('payload.payment_method') === 'qpay' || order.getAttribute('meta.gateway') === 'qpay';
    const currency = order.getAttribute('meta.currency') ?? info?.currency ?? 'USD';
    const money = (amount: unknown) => formatCurrency(Number(amount) || 0, currency);
    const progress = useMemo(
        () => orderProgress({ status, isPickup, trackingStatuses: order.getAttribute('tracking_statuses'), createdAt: order.getAttribute('created_at') }),
        [isPickup, order, status]
    );

    const canRenderRoute = useMemo(() => {
        const pickup = order.getAttribute('payload.pickup');
        const dropoff = order.getAttribute('payload.dropoff');
        if (isPickup) return !!pickup;
        if (foodTruckId) return (!!dropoff || !!pickup) && !!foodTruck;
        return !!pickup && !!dropoff;
    }, [foodTruck, foodTruckId, isPickup, order]);

    const reloadOrder = useCallback(async (options: { refresh?: boolean } = {}) => {
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

    const confirmPickup = useCallback(async () => {
        setConfirmingPickup(true);
        try {
            await customer.performAuthorizedRequest('orders/picked-up', { order: order.id }, 'PUT');
            await reloadOrder();
            setPickupSheet(false);
        } catch (err) {
            console.error('Error confirming order pickup:', err);
        } finally {
            setConfirmingPickup(false);
        }
    }, [customer, order.id, reloadOrder]);

    // The store the order is from (single-store apps already have it).
    useEffect(() => {
        if (store?.id === storeId || !storeId) return;
        if (info?.is_store && info?.id === storeId) {
            setStore(info);
            return;
        }
        storefrontAdapter
            ?.get(`lookup/${storeId}`)
            .then((lookup: any) => setStore(lookup))
            .catch((err: any) => console.error('Unable to lookup store ordered from:', err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    useEffect(() => {
        if (!storefront || !foodTruckId) return;
        const cached = getFoodTruckById(foodTruckId);
        if (cached) setFoodTruck(cached);
        storefront.foodTrucks
            .queryRecord({ public_id: foodTruckId, with_deleted: true })
            .then((result: any) => setFoodTruck(isArray(result) && result.length ? result[0] : result))
            .catch((error: any) => console.error('Error fetching food truck:', error));
    }, [storefront, foodTruckId]);

    // Estimated arrival while the driver is on the way.
    useEffect(() => {
        if (distanceLoadedRef.current || progress.phase !== 'onTheWay') return;
        order
            .getDistanceAndTime?.()
            .then((matrix: any) => {
                if (matrix) {
                    setDistanceMatrix(matrix);
                    distanceLoadedRef.current = true;
                }
            })
            .catch((err: any) => console.error('Error loading order distance matrix:', err));
    }, [order, progress.phase]);

    // Live status updates.
    useEffect(() => {
        if (listenerRef.current) return;
        let stopped = false;
        listen(`order.${order.id}`, (event: any) => {
            const nextStatus = event?.data?.status;
            if (nextStatus && statusRef.current !== nextStatus) reloadOrder();
        })
            .then((listener: any) => {
                if (!stopped && listener) listenerRef.current = listener;
            })
            .catch((e: any) => console.error('Socket listen error:', e));
        return () => {
            stopped = true;
            listenerRef.current?.stop?.();
            listenerRef.current = null;
        };
    }, [listen, order.id, reloadOrder]);

    useEffect(() => {
        orderRef.current = order;
        statusRef.current = order.getAttribute('status');
    }, [order]);

    const close = () => {
        if (params.justPlaced || !navigation.canGoBack()) {
            navigation.navigate(mode === 'network' ? 'NetworkHomeTab' : 'StoreHomeTab');
        } else {
            navigation.goBack();
        }
    };

    const storeName = store?.name ?? (foodTruck ? foodTruckDisplayName(foodTruck) : null) ?? order.getAttribute('payload.pickup.name') ?? '';
    const driver = order.getAttribute('driver_assigned');
    const driverName = driver?.name ? shortName(driver.name) : null;
    const vehicle = order.getAttribute('vehicle_assigned') ?? driver?.vehicle;
    const vehicleText = [vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || vehicle?.display_name || vehicle?.name || null;
    const plate = vehicle?.plate_number ?? null;
    const eta = progress.phase === 'onTheWay' && distanceMatrix?.time ? formatDistanceToNowStrict(add(new Date(), { seconds: distanceMatrix.time })) : null;
    const dropoff = order.getAttribute('payload.dropoff');
    const pickup = order.getAttribute('payload.pickup');
    const entities: any[] = order.getAttribute('payload.entities') ?? [];
    const qrCode = order.getAttribute('tracking_number.qr_code');
    const reference = order.getAttribute('tracking_number.tracking_number') ?? order.id;

    const headline = (phase: OrderPhase) => t(`Tracking.phase.${phase}.title`, { store: storeName, driver: driverName ?? t('Tracking.yourDriver') });
    const subline = (phase: OrderPhase) =>
        t(`Tracking.phase.${phase}.body`, {
            store: storeName,
            driver: driverName ?? t('Tracking.yourDriver'),
            place: (isPickup ? pickup?.street1 : dropoff?.street1) ?? '',
        });

    const totals = [
        { label: t('Tracking.subtotal'), value: order.getAttribute('meta.subtotal') },
        !isPickup && { label: t('Tracking.deliveryFee'), value: order.getAttribute('meta.delivery_fee') },
        Number(order.getAttribute('meta.tip')) > 0 && { label: t('Tracking.tip'), value: order.getAttribute('meta.tip') },
        Number(order.getAttribute('meta.delivery_tip')) > 0 && { label: t('Tracking.driverTip'), value: order.getAttribute('meta.delivery_tip') },
    ].filter(Boolean) as { label: string; value: unknown }[];
    const discount = Number(order.getAttribute('meta.discount')) || 0;

    return (
        <YStack flex={1} backgroundColor='$surface'>
            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reloadOrder({ refresh: true })} />} contentContainerStyle={{ flexGrow: 1 }}>
                {/* zIndex 0 gives the map its own stacking context so web map panes stay under the sheet. */}
                <YStack height={MAP_HEIGHT} backgroundColor='$surface2' accessibilityLabel={t('Tracking.mapLabel')} position='relative' zIndex={0}>
                    {canRenderRoute && (isPickup ? <LivePickupRoute order={order} zoom={4} /> : <LiveOrderRoute order={order} zoom={4} customOrigin={foodTruck ?? foodTruckId} />)}
                </YStack>

                <YStack flex={1} zIndex={1} marginTop={-28} borderTopLeftRadius={radius.sheet} borderTopRightRadius={radius.sheet} backgroundColor='$background' paddingHorizontal={space.gutter} paddingTop={8} paddingBottom={insets.bottom + 40} gap={16}>
                    <YStack width={40} height={5} borderRadius={radius.pill} backgroundColor='$borderColorWithShadow' alignSelf='center' />

                    <YStack gap={4} accessibilityRole='summary' aria-live='polite'>
                        <UIText variant='heading' accessibilityRole='header' tone={progress.canceled ? 'error' : 'primary'}>
                            {headline(progress.phase)}
                        </UIText>
                        <UIText tone='secondary'>
                            {subline(progress.phase)}
                            {eta ? ` ${t('Tracking.arrivingIn', { eta })}` : ''}
                        </UIText>
                    </YStack>

                    {progress.phase === 'ready' && (
                        <YStack gap={10} padding={14} borderRadius={radius.card} backgroundColor='$successSoft'>
                            {!!qrCode && <Image source={{ uri: `data:image/png;base64,${qrCode}` }} style={{ width: 120, height: 120, alignSelf: 'center', backgroundColor: '#ffffff', borderRadius: 8 }} accessibilityLabel={t('Tracking.pickupCode')} />}
                            <UIText variant='caption'>{t('Tracking.readyBody')}</UIText>
                            <Button icon={faCheck} fullWidth onPress={() => setPickupSheet(true)}>
                                {t('Tracking.confirmPickup')}
                            </Button>
                        </YStack>
                    )}

                    <YStack accessibilityRole='list' accessibilityLabel={t('Tracking.progress')}>
                        {progress.steps.map((step, index) => {
                            const last = index === progress.steps.length - 1;
                            const done = step.state === 'done';
                            const current = step.state === 'current';
                            return (
                                <XStack key={step.key} gap={12} minHeight={44} accessibilityRole='text' accessibilityLabel={`${t(`Tracking.step.${isPickup ? 'pickup' : 'delivery'}.${step.key}`)}, ${t(`Tracking.stepState.${step.state}`)}`}>
                                    <YStack width={22} alignItems='center'>
                                        <YStack width={22} height={22} borderRadius={11} borderWidth={2} borderColor={step.state === 'todo' ? '$borderColorWithShadow' : '$primary'} backgroundColor={done ? '$primary' : '$background'} alignItems='center' justifyContent='center'>
                                            {done && <FontAwesomeIcon icon={faCheck} size={11} color={theme.primaryText.val} />}
                                            {current && <YStack width={8} height={8} borderRadius={4} backgroundColor='$primary' />}
                                        </YStack>
                                        {!last && <YStack flex={1} width={2} minHeight={18} backgroundColor={done ? '$primary' : '$borderColor'} />}
                                    </YStack>
                                    <XStack flex={1} justifyContent='space-between' gap={8} paddingBottom={10}>
                                        <UIText variant={current ? 'bodyStrong' : 'body'} tone={step.state === 'todo' ? 'secondary' : 'primary'} style={{ fontSize: 14 }}>
                                            {t(`Tracking.step.${isPickup ? 'pickup' : 'delivery'}.${step.key}`)}
                                        </UIText>
                                        {!!step.at && (
                                            <UIText variant='caption' tone='secondary'>
                                                {formatDate(new Date(step.at), 'p')}
                                            </UIText>
                                        )}
                                        {!step.at && current && (
                                            <UIText variant='caption' tone='secondary'>
                                                {t('Tracking.now')}
                                            </UIText>
                                        )}
                                    </XStack>
                                </XStack>
                            );
                        })}
                    </YStack>

                    {!!driverName && !isPickup && !progress.finished && !progress.canceled && (
                        <XStack alignItems='center' gap={12} padding={12} borderRadius={radius.card} backgroundColor='$surface'>
                            {usableImageUrl(driver?.photo_url) ? (
                                <Image source={{ uri: driver.photo_url }} style={{ width: 48, height: 48, borderRadius: 24 }} accessibilityIgnoresInvertColors />
                            ) : (
                                <YStack width={48} height={48} borderRadius={24} backgroundColor='$primarySoft' alignItems='center' justifyContent='center'>
                                    <UIText variant='bodyStrong' tone='brand'>
                                        {initials(driver.name)}
                                    </UIText>
                                </YStack>
                            )}
                            <YStack flex={1} gap={2}>
                                <UIText variant='bodyStrong'>{t('Tracking.driverCard', { driver: driverName })}</UIText>
                                {!!(vehicleText || plate) && (
                                    <UIText variant='caption' tone='secondary'>
                                        {[vehicleText, plate].filter(Boolean).join(' · ')}
                                    </UIText>
                                )}
                            </YStack>
                            {!!driver?.phone && <IconButton icon={faPhone} variant='solid' size={44} accessibilityLabel={t('Tracking.callDriver', { driver: driverName })} onPress={() => Linking.openURL(`tel:${driver.phone}`)} />}
                        </XStack>
                    )}

                    <XStack alignItems='center' gap={12}>
                        <StoreLogo uri={store?.logo_url} name={storeName || '?'} size={40} radius={radius.tile} />
                        <YStack flex={1}>
                            <UIText variant='bodyStrong'>{storeName}</UIText>
                            {!!pickup?.street1 && (
                                <UIText variant='caption' tone='secondary' numberOfLines={1}>
                                    {pickup.street1}
                                </UIText>
                            )}
                        </YStack>
                    </XStack>

                    <YStack gap={10} accessibilityLabel={t('Tracking.details')}>
                        <XStack justifyContent='space-between' alignItems='baseline'>
                            <UIText variant='subheading'>{t('Tracking.orderNumber', { number: reference })}</UIText>
                            {usedQpay && (
                                <Button variant='ghost' size='sm' icon={faReceipt} onPress={() => navigation.navigate('Receipt', { order: order.serialize() })}>
                                    {t('Tracking.viewReceipt')}
                                </Button>
                            )}
                        </XStack>
                        <UIText variant='caption' tone='secondary'>
                            {formatDate(new Date(order.getAttribute('created_at') ?? Date.now()), 'PPp')}
                        </UIText>
                        {entities.map((entity: any, index: number) => (
                            <XStack key={entity.id ?? index} justifyContent='space-between' gap={8}>
                                <UIText flex={1} tone='secondary'>
                                    {entity.meta?.quantity ?? 1} × {entity.name}
                                </UIText>
                                <UIText>{money(entity.meta?.subtotal ?? entity.price)}</UIText>
                            </XStack>
                        ))}
                        {totals.map((row) => (
                            <XStack key={row.label} justifyContent='space-between'>
                                <UIText tone='secondary'>{row.label}</UIText>
                                <UIText>{money(row.value)}</UIText>
                            </XStack>
                        ))}
                        {discount > 0 && (
                            <XStack justifyContent='space-between'>
                                <UIText tone='success'>{t('Tracking.discount')}</UIText>
                                <UIText tone='success'>−{money(discount)}</UIText>
                            </XStack>
                        )}
                        <XStack justifyContent='space-between' paddingTop={8} borderTopWidth={1} borderColor='$borderColor'>
                            <UIText variant='bodyStrong'>{t('Tracking.total')}</UIText>
                            <UIText variant='bodyStrong'>{money(order.getAttribute('meta.total'))}</UIText>
                        </XStack>
                        <UIText variant='caption' tone='secondary'>
                            {isPickup ? t('Tracking.pickupAt', { place: [pickup?.name, pickup?.street1].filter(Boolean).join(', ') }) : t('Tracking.deliveringTo', { place: [dropoff?.name, dropoff?.street1].filter(Boolean).join(', ') })}
                        </UIText>
                        {!!order.getAttribute('notes') && (
                            <UIText variant='caption' tone='secondary'>
                                {t('Tracking.notes', { notes: order.getAttribute('notes') })}
                            </UIText>
                        )}
                    </YStack>
                </YStack>
            </ScrollView>

            <YStack position='absolute' top={insets.top + 10} left={space.gutter}>
                <IconButton icon={faXmark} variant='floating' size={44} accessibilityLabel={t('UI.close')} onPress={close} />
            </YStack>

            <Sheet
                open={pickupSheet}
                onClose={() => setPickupSheet(false)}
                title={t('Tracking.confirmPickupTitle')}
                footer={
                    <YStack gap={8}>
                        <Button size='lg' fullWidth loading={confirmingPickup} onPress={confirmPickup}>
                            {t('Tracking.confirmPickupYes')}
                        </Button>
                        <Button variant='ghost' size='lg' fullWidth onPress={() => setPickupSheet(false)}>
                            {t('Tracking.notYet')}
                        </Button>
                    </YStack>
                }
            >
                <UIText tone='secondary'>{t('Tracking.confirmPickupBody', { store: storeName })}</UIText>
            </Sheet>
        </YStack>
    );
};

export default OrderScreen;
