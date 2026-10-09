import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, Linking, Pressable, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faComment, faPhone, faReceipt, faStar, faXmark } from '@fortawesome/free-solid-svg-icons';
import { parseScheduledAt } from '../commerce/booking';
import { fetchEligibility, type Eligibility } from '../commerce/reviews';
import { fetchChat, type OrderChat } from '../commerce/order-chat';
import useChatRequest from '../hooks/use-chat-request';
import useReviewRequest from '../hooks/use-review-request';
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
import { currentStep, fetchOrderFlow, usesCustomFlow, type OrderFlow } from '../commerce/order-flow';
import { tipAmount } from '../commerce/order-summary';
import { formattedAddressFromPlace, restoreFleetbasePlace } from '../utils/location';
import LiveOrderRoute from '../components/LiveOrderRoute';
import LivePickupRoute from '../components/LivePickupRoute';
import { Button, ErrorState, IconButton, Sheet, Skeleton, StarInput, StoreLogo, UIText, formatClock, initials, radius, space, usableImageUrl, usesTwelveHourClock } from '../ui';
import useScreenTopInset from '../hooks/use-screen-top-inset';

const MAP_HEIGHT = 380;
// How often an order under way is refreshed, in case a socket update is late or missed.
const LIVE_REFRESH_MS = 15000;
// How far the sheet's rounded top overlaps the map.
const SHEET_OVERLAP = 28;

/**
 * Order tracking: the live route on top, then a sheet with where the order is, the
 * timeline, the driver, pickup confirmation and the order details. Updates arrive over
 * the order's socket channel; pull to refresh reloads it.
 */
const OrderScreen = ({ route }: any) => {
    const params = route.params || {};
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    // Opened from a push notification it is presented as a modal (OrderModal).
    const top = useScreenTopInset(route?.name === 'OrderModal');
    const navigation = useNavigation<any>();
    const { customer } = useAuth();
    const { storefront, adapter: storefrontAdapter } = useStorefront();
    const { info } = useStorefrontInfo();
    const { mode } = useStorefrontRuntime();
    const { listen } = useSocketClusterClient();
    const { t, locale } = useLanguage();
    const hour12 = usesTwelveHourClock(locale);

    // Opened from a notification or link there is only an id; the order loads below.
    const [order, setOrder] = useState<any>(() => new Order(params.order ?? { id: params.orderId }, fleetbaseAdapter));
    const [loaded, setLoaded] = useState<boolean>(!!params.order);
    const [loadFailed, setLoadFailed] = useState(false);
    const [foodTruck, setFoodTruck] = useState<any>();
    const [distanceMatrix, setDistanceMatrix] = useState<any>();
    const [refreshing, setRefreshing] = useState(false);
    const [confirmingPickup, setConfirmingPickup] = useState(false);
    const [pickupSheet, setPickupSheet] = useState(false);
    const [reviewState, setReviewState] = useState<Eligibility | null>(null);
    const reviewRequest = useReviewRequest();
    const chatRequest = useChatRequest();
    const [chat, setChat] = useState<OrderChat | null>(null);
    const [flow, setFlow] = useState<OrderFlow | null>(null);

    const storeId = useMemo(() => order.getAttribute('meta.storefront_id'), [order]);
    const [store, setStore] = useStorage(`${storeId}`, info);

    const distanceLoadedRef = useRef(false);
    const listenerRef = useRef<any>(null);
    const orderRef = useRef(order);
    const statusRef = useRef(order.getAttribute('status'));

    const isPickup = !!order.getAttribute('meta.is_pickup');
    const status = order.getAttribute('status');
    const foodTruckId = order.getAttribute('meta.food_truck_id');
    const currency = order.getAttribute('meta.currency') ?? info?.currency ?? 'USD';
    const money = (amount: unknown) => formatCurrency(Number(amount) || 0, currency);
    const progress = useMemo(
        () => orderProgress({ status, isPickup, trackingStatuses: order.getAttribute('tracking_statuses'), createdAt: order.getAttribute('created_at') }),
        [isPickup, order, status]
    );
    // An order on a custom order config shows that config's own steps.
    const customFlow = usesCustomFlow(flow) ? flow : null;
    const flowStep = customFlow ? currentStep(customFlow) : null;
    const finished = customFlow ? customFlow.completed : progress.finished;
    const canceled = customFlow ? customFlow.canceled : progress.canceled;

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

    useEffect(() => {
        if (loaded) return;
        orderRef.current
            .reload()
            .then((reloaded: any) => {
                setOrder(reloaded);
                statusRef.current = reloaded.getAttribute('status');
                setLoaded(true);
            })
            .catch(() => setLoadFailed(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Live updates: any event on the order's channel (status, activity, driver) reloads it,
    // coalescing bursts into one request.
    const liveReloadRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleReload = useCallback(() => {
        if (liveReloadRef.current) return;
        liveReloadRef.current = setTimeout(() => {
            liveReloadRef.current = null;
            reloadOrder();
        }, 600);
    }, [reloadOrder]);
    useEffect(() => () => liveReloadRef.current && clearTimeout(liveReloadRef.current), []);

    useEffect(() => {
        if (listenerRef.current) return;
        let stopped = false;
        listen(`order.${order.id}`, () => scheduleReload())
            .then((listener: any) => {
                if (!stopped && listener) listenerRef.current = listener;
            })
            .catch((e: any) => console.error('Socket listen error:', e));
        return () => {
            stopped = true;
            listenerRef.current?.stop?.();
            listenerRef.current = null;
        };
    }, [listen, order.id, scheduleReload]);

    // Sockets can lag (or drop) behind the server, so while the order is under way it is
    // also refreshed periodically and whenever the app comes back to the foreground.
    const settled = finished || canceled;
    useEffect(() => {
        if (!loaded || settled) return;
        const timer = setInterval(() => {
            if (AppState.currentState === 'active') reloadOrder();
        }, LIVE_REFRESH_MS);
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') scheduleReload();
        });
        return () => {
            clearInterval(timer);
            subscription.remove();
        };
    }, [loaded, settled, reloadOrder, scheduleReload]);

    useEffect(() => {
        orderRef.current = order;
        statusRef.current = order.getAttribute('status');
    }, [order]);

    // Once the order is finished, invite a review (the server checks it's this customer's
    // completed order and not reviewed yet).
    useEffect(() => {
        if (!finished || !storeId || !customer) return;
        let active = true;
        fetchEligibility(reviewRequest, storeId, order.id)
            .then((result) => active && setReviewState(result))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [customer, finished, order.id, reviewRequest, storeId]);

    // The driver chat: its unread count while the order is active, its history after.
    const hasDriver = !!order.getAttribute('driver_assigned') || !!order.getAttribute('driver_assigned_uuid');
    useEffect(() => {
        if (!customer || !loaded || isPickup || (!hasDriver && !finished)) return;
        let active = true;
        fetchChat(chatRequest, order.id)
            .then((result) => active && setChat(result))
            .catch(() => active && setChat(null));
        return () => {
            active = false;
        };
    }, [chatRequest, customer, finished, hasDriver, isPickup, loaded, order.id, status]);

    // The order's steps from its own order config, refreshed as its status changes.
    useEffect(() => {
        if (!customer || !loaded) return;
        let active = true;
        fetchOrderFlow(chatRequest, order.id)
            .then((result) => active && setFlow(result))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [chatRequest, customer, loaded, order.id, status]);

    const openChat = () =>
        navigation.navigate('OrderChat', {
            orderId: order.id,
            orderReference: order.getAttribute('tracking_number.tracking_number') ?? order.id,
            storeName: store?.name ?? undefined,
            driverName: order.getAttribute('driver_assigned.name') ?? undefined,
            driverPhone: order.getAttribute('driver_assigned.phone') ?? undefined,
        });

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
    const bookings = entities.map((entity: any) => ({ entity, at: parseScheduledAt(entity?.meta?.scheduled_at) })).filter((booking) => booking.at);
    const bookingConfirmed = progress.phase !== 'placed' && !progress.canceled;
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
        tipAmount(order.getAttribute('meta.tip'), order.getAttribute('meta.subtotal')) > 0 && {
            label: t('Tracking.tip'),
            value: tipAmount(order.getAttribute('meta.tip'), order.getAttribute('meta.subtotal')),
        },
        tipAmount(order.getAttribute('meta.delivery_tip'), order.getAttribute('meta.subtotal')) > 0 && {
            label: t('Tracking.driverTip'),
            value: tipAmount(order.getAttribute('meta.delivery_tip'), order.getAttribute('meta.subtotal')),
        },
    ].filter(Boolean) as { label: string; value: unknown }[];
    const discount = Number(order.getAttribute('meta.discount')) || 0;
    const cashDue = Number(order.getAttribute('payload.cod_amount')) || 0;
    const pickupName = (foodTruck ? foodTruckDisplayName(foodTruck) : null) ?? pickup?.name ?? null;
    const fullAddress = (place: any) => (place ? formattedAddressFromPlace(restoreFleetbasePlace(place)) : '');
    const timeline = customFlow
        ? customFlow.steps.map((step) => ({ key: step.code, label: step.label, state: step.state, at: step.at }))
        : progress.steps.map((step) => ({ key: step.key, label: t(`Tracking.step.${isPickup ? 'pickup' : 'delivery'}.${step.key}`), state: step.state, at: step.at }));

    if (!loaded) {
        return (
            <YStack flex={1} backgroundColor='$background'>
                {loadFailed ? (
                    <YStack flex={1} justifyContent='center' gap={12}>
                        <ErrorState title={t('Tracking.loadFailed')} />
                        <YStack alignItems='center'>
                            <Button variant='outline' onPress={close}>
                                {t('common.goBack')}
                            </Button>
                        </YStack>
                    </YStack>
                ) : (
                    <>
                        <Skeleton height={MAP_HEIGHT} radius={0} />
                        <YStack padding={space.gutter} gap={12}>
                            <Skeleton height={24} width='60%' />
                            <Skeleton height={16} width='80%' />
                            <Skeleton height={140} radius={radius.card} />
                        </YStack>
                    </>
                )}
            </YStack>
        );
    }

    return (
        <YStack flex={1} backgroundColor='$background'>
            {/* The map stays put behind the sheet: pulling down moves only the sheet, never a gap
                above the map. zIndex 0 keeps web map panes under the sheet. */}
            <YStack
                position='absolute'
                top={0}
                left={0}
                right={0}
                height={MAP_HEIGHT + SHEET_OVERLAP}
                backgroundColor='$surface2'
                accessibilityLabel={t('Tracking.mapLabel')}
                zIndex={0}
            >
                {canRenderRoute && (isPickup ? <LivePickupRoute order={order} zoom={4} /> : <LiveOrderRoute order={order} zoom={4} customOrigin={foodTruck ?? foodTruckId} />)}
            </YStack>
            <ScrollView
                style={{ flex: 1, zIndex: 1 }}
                pointerEvents='box-none'
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => reloadOrder({ refresh: true })} tintColor={theme.primary.val} colors={[theme.primary.val]} />
                }
                contentContainerStyle={{ flexGrow: 1 }}
            >
                {/* Over the map: touches pass through to it, so it can still be panned and zoomed. */}
                <YStack height={MAP_HEIGHT} pointerEvents='none' />

                <YStack
                    flex={1}
                    zIndex={1}
                    marginTop={-SHEET_OVERLAP}
                    borderTopLeftRadius={radius.sheet}
                    borderTopRightRadius={radius.sheet}
                    backgroundColor='$background'
                    paddingHorizontal={space.gutter}
                    paddingTop={8}
                    paddingBottom={insets.bottom + 40}
                    gap={16}
                >
                    <YStack width={40} height={5} borderRadius={radius.pill} backgroundColor='$borderColorWithShadow' alignSelf='center' />

                    <YStack gap={4} accessibilityRole='summary' aria-live='polite'>
                        <UIText variant='heading' accessibilityRole='header' tone={canceled ? 'error' : 'primary'}>
                            {flowStep ? flowStep.label : headline(progress.phase)}
                        </UIText>
                        {!!(flowStep ? flowStep.details || eta : true) && (
                            <UIText tone='secondary'>
                                {flowStep ? (flowStep.details ?? '') : subline(progress.phase)}
                                {eta ? ` ${t('Tracking.arrivingIn', { eta })}` : ''}
                            </UIText>
                        )}
                    </YStack>

                    {!!driverName && !isPickup && !finished && !canceled && (
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
                                <UIText variant='caption' tone='secondary'>
                                    {progress.phase === 'onTheWay' ? t('Tracking.driverOnTheWay') : t('Tracking.driverAssigned')}
                                </UIText>
                                {!!(vehicleText || plate) && (
                                    <UIText variant='caption' tone='secondary'>
                                        {[vehicleText, plate].filter(Boolean).join(' · ')}
                                    </UIText>
                                )}
                            </YStack>
                            {!!driver?.phone && (
                                <IconButton
                                    icon={faPhone}
                                    size={44}
                                    accessibilityLabel={t('Tracking.callDriver', { driver: driverName })}
                                    onPress={() => Linking.openURL(`tel:${driver.phone}`)}
                                />
                            )}
                            {!!customer && (
                                <IconButton
                                    icon={faComment}
                                    variant='solid'
                                    size={44}
                                    badge={chat?.unread ? chat.unread : undefined}
                                    accessibilityLabel={t('Chat.messageDriver', { driver: driverName })}
                                    onPress={openChat}
                                />
                            )}
                        </XStack>
                    )}

                    {reviewState?.canReview && (
                        <YStack alignItems='center' gap={6} padding={16} borderRadius={radius.card} backgroundColor='$primarySoft'>
                            <UIText variant='subheading' textAlign='center'>
                                {t('Reviews.howWas', { store: storeName })}
                            </UIText>
                            <StarInput
                                value={0}
                                size={32}
                                label={t('Reviews.ratingLabel', { store: storeName })}
                                onChange={(rating) =>
                                    navigation.navigate('WriteReview', { storeId, storeName, storeLogo: store?.logo_url ?? null, orderId: order.id, orderReference: reference, rating })
                                }
                            />
                            <UIText variant='caption' tone='secondary'>
                                {t('Reviews.tapToWrite')}
                            </UIText>
                        </YStack>
                    )}
                    {reviewState?.reason === 'already_reviewed' && (
                        <XStack alignItems='center' gap={10} padding={14} borderRadius={radius.card} backgroundColor='$surface'>
                            <FontAwesomeIcon icon={faStar} size={16} color={theme.warningForeground.val} />
                            <UIText flex={1} variant='bodyStrong' style={{ fontSize: 14 }}>
                                {t('Reviews.youReviewed')}
                            </UIText>
                            <Button variant='ghost' size='sm' onPress={() => navigation.navigate('StoreReviews', { storeId, storeName, storeLogo: store?.logo_url ?? null })}>
                                {t('UI.view')}
                            </Button>
                        </XStack>
                    )}

                    {isPickup && progress.phase === 'ready' && (
                        <YStack gap={10} padding={14} borderRadius={radius.card} backgroundColor='$successSoft'>
                            <UIText variant='caption'>{t('Tracking.readyBody')}</UIText>
                            <Button icon={faCheck} fullWidth onPress={() => setPickupSheet(true)}>
                                {t('Tracking.confirmPickup')}
                            </Button>
                        </YStack>
                    )}

                    {/* Drivers and stores scan this to confirm delivery or collection. */}
                    {!!qrCode && !finished && !canceled && (
                        <XStack alignItems='center' gap={14} padding={12} borderRadius={radius.card} borderWidth={1} borderColor='$borderColor'>
                            <Image
                                source={{ uri: `data:image/png;base64,${qrCode}` }}
                                style={{ width: 96, height: 96, backgroundColor: '#ffffff', borderRadius: 8 }}
                                accessibilityLabel={t('Tracking.pickupCode')}
                            />
                            <YStack flex={1} gap={4}>
                                <UIText variant='bodyStrong'>{t('Tracking.qrTitle')}</UIText>
                                <UIText variant='caption' tone='secondary'>
                                    {isPickup ? t('Tracking.qrBodyPickup') : t('Tracking.qrBodyDelivery')}
                                </UIText>
                            </YStack>
                        </XStack>
                    )}

                    <YStack accessibilityRole='list' accessibilityLabel={t('Tracking.progress')}>
                        {timeline.map((step, index) => {
                            const last = index === timeline.length - 1;
                            const done = step.state === 'done';
                            const current = step.state === 'current';
                            return (
                                <XStack key={step.key} gap={12} minHeight={44} accessibilityRole='text' accessibilityLabel={`${step.label}, ${t(`Tracking.stepState.${step.state}`)}`}>
                                    <YStack width={22} alignItems='center'>
                                        <YStack
                                            width={22}
                                            height={22}
                                            borderRadius={11}
                                            borderWidth={2}
                                            borderColor={step.state === 'todo' ? '$borderColorWithShadow' : '$primary'}
                                            backgroundColor={done ? '$primary' : '$background'}
                                            alignItems='center'
                                            justifyContent='center'
                                        >
                                            {done && <FontAwesomeIcon icon={faCheck} size={11} color={theme.primaryText.val} />}
                                            {current && <YStack width={8} height={8} borderRadius={4} backgroundColor='$primary' />}
                                        </YStack>
                                        {!last && <YStack flex={1} width={2} minHeight={18} backgroundColor={done ? '$primary' : '$borderColor'} />}
                                    </YStack>
                                    <XStack flex={1} justifyContent='space-between' gap={8} paddingBottom={10}>
                                        <UIText variant={current ? 'bodyStrong' : 'body'} tone={step.state === 'todo' ? 'secondary' : 'primary'} style={{ fontSize: 14 }}>
                                            {step.label}
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

                    {bookings.map(({ entity, at }: any) => (
                        <XStack
                            key={entity.id ?? entity.name}
                            alignItems='center'
                            gap={12}
                            padding={12}
                            borderRadius={radius.card}
                            borderWidth={1}
                            borderColor='$borderColor'
                            accessibilityLabel={t('Tracking.bookingLabel', { name: entity.name, time: at.at.toLocaleString(locale) })}
                        >
                            <YStack width={52} paddingVertical={6} borderRadius={radius.tile} backgroundColor='$primarySoft' alignItems='center'>
                                <UIText variant='captionStrong' tone='brand' style={{ fontSize: 11 }}>
                                    {at.at.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase()}
                                </UIText>
                                <UIText variant='heading' tone='brand'>
                                    {at.at.getDate()}
                                </UIText>
                            </YStack>
                            <YStack flex={1} gap={2}>
                                <UIText variant='label' tone='secondary'>
                                    {bookingConfirmed ? t('Tracking.bookingConfirmed') : t('Tracking.bookingRequested')}
                                </UIText>
                                <UIText variant='bodyStrong'>
                                    {entity.name} · {formatClock(at.minutes, hour12)}
                                </UIText>
                                <UIText variant='caption' tone='secondary'>
                                    {bookingConfirmed ? t('Tracking.bookingConfirmedBody', { store: storeName }) : t('Tracking.bookingRequestedBody', { store: storeName })}
                                </UIText>
                            </YStack>
                            {!!store?.phone && (
                                <IconButton
                                    icon={faPhone}
                                    size={44}
                                    accessibilityLabel={t('Tracking.callStore', { store: storeName })}
                                    onPress={() => Linking.openURL(`tel:${store.phone}`)}
                                />
                            )}
                        </XStack>
                    ))}

                    {finished && !!chat && chat.messages.length > 0 && (
                        <Pressable
                            onPress={openChat}
                            accessibilityRole='button'
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.card, backgroundColor: theme.surface.val }}
                        >
                            <FontAwesomeIcon icon={faComment} size={18} color={theme.textSecondary.val} />
                            <UIText flex={1} variant='caption' tone='secondary'>
                                {t('Chat.closedNote')}{' '}
                                <UIText variant='captionStrong' tone='brand'>
                                    {t('Chat.viewMessages')}
                                </UIText>
                            </UIText>
                        </Pressable>
                    )}

                    <XStack alignItems='center' gap={12}>
                        <StoreLogo uri={store?.logo_url} name={storeName || '?'} size={40} radius={radius.tile} />
                        <YStack flex={1} gap={2}>
                            <UIText variant='bodyStrong'>{storeName}</UIText>
                            {!!pickupName && pickupName !== storeName && (
                                <UIText variant='caption' tone='secondary'>
                                    {pickupName}
                                </UIText>
                            )}
                            {!!fullAddress(pickup) && (
                                <UIText variant='caption' tone='secondary' numberOfLines={2}>
                                    {fullAddress(pickup)}
                                </UIText>
                            )}
                        </YStack>
                        {!!store?.phone && (
                            <IconButton icon={faPhone} size={44} accessibilityLabel={t('Tracking.callStore', { store: storeName })} onPress={() => Linking.openURL(`tel:${store.phone}`)} />
                        )}
                    </XStack>

                    <YStack gap={10} accessibilityLabel={t('Tracking.details')}>
                        <XStack justifyContent='space-between' alignItems='baseline'>
                            <UIText variant='subheading'>{t('Tracking.orderNumber', { number: reference })}</UIText>
                            <Button variant='ghost' size='sm' icon={faReceipt} onPress={() => navigation.navigate('Receipt', { order: order.serialize() })}>
                                {t('Tracking.viewReceipt')}
                            </Button>
                        </XStack>
                        <UIText variant='caption' tone='secondary'>
                            {formatDate(new Date(order.getAttribute('created_at') ?? Date.now()), 'PPp')}
                            {reference !== order.id ? ` · ${t('Tracking.orderId', { id: order.id })}` : ''}
                        </UIText>
                        {entities.map((entity: any, index: number) => {
                            const options = [...(entity.meta?.variants ?? []), ...(entity.meta?.addons ?? [])].map((option: any) => option?.name).filter(Boolean);
                            return (
                                <XStack key={entity.id ?? index} alignItems='center' gap={10}>
                                    {usableImageUrl(entity.photo_url) ? (
                                        <Image source={{ uri: entity.photo_url }} style={{ width: 40, height: 40, borderRadius: radius.tile }} accessibilityIgnoresInvertColors />
                                    ) : null}
                                    <YStack flex={1} gap={2}>
                                        <UIText tone='secondary'>
                                            {entity.meta?.quantity ?? 1} × {entity.name}
                                        </UIText>
                                        {options.length > 0 && (
                                            <UIText variant='caption' tone='secondary'>
                                                {options.join(', ')}
                                            </UIText>
                                        )}
                                    </YStack>
                                    <UIText>{money(entity.meta?.subtotal ?? entity.price)}</UIText>
                                </XStack>
                            );
                        })}
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
                        {cashDue > 0 && (
                            <UIText variant='captionStrong' tone='warning'>
                                {t('Tracking.cashOnDelivery', { amount: money(cashDue) })}
                            </UIText>
                        )}
                        <UIText variant='caption' tone='secondary'>
                            {isPickup
                                ? t('Tracking.pickupAt', { place: [pickup?.name, fullAddress(pickup)].filter(Boolean).join(', ') })
                                : t('Tracking.deliveringTo', { place: [dropoff?.name, fullAddress(dropoff)].filter(Boolean).join(', ') })}
                        </UIText>
                        {!!order.getAttribute('notes') && (
                            <YStack gap={4} padding={12} borderRadius={radius.button} backgroundColor='$surface'>
                                <UIText variant='captionStrong'>{t('Tracking.notesTitle')}</UIText>
                                <UIText variant='caption' tone='secondary'>
                                    {order.getAttribute('notes')}
                                </UIText>
                            </YStack>
                        )}
                    </YStack>
                </YStack>
            </ScrollView>

            <YStack position='absolute' top={top + 10} left={space.gutter}>
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
