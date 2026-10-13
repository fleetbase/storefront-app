import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Image, Linking, Pressable, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarPlus, faCheck, faComment, faLocationDot, faPhone, faReceipt, faRotate, faStar, faStore, faXmark } from '@fortawesome/free-solid-svg-icons';
import { orderBooking, parseScheduledAt } from '../commerce/booking';
import { addToCalendar } from '../commerce/calendar';
import { toast } from '../utils/toast';
import { fetchEligibility, type Eligibility } from '../commerce/reviews';
import { fetchChat, requestAddressChange, type OrderChat } from '../commerce/order-chat';
import { canRequestAddressChange, parseOrderChanged, placeMoved, pushedOrderId, type OrderChange } from '../commerce/order-changes';
import { keepRefreshing, parseOrderPayment } from '../commerce/order-payment';
import PaymentStatus, { PaymentBadge } from '../components/orders/PaymentStatus';
import { useNotification } from '../contexts/NotificationContext';
import useSavedLocations from '../hooks/use-saved-locations';
import { markOrderHistoryDirty } from '../utils/order-history-cache';
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
import * as storage from '../utils/storage';
import { orderProgress, shortName, type OrderPhase } from '../commerce/order-progress';
import { currentStep, fetchOrderFlow, usesCustomFlow, type OrderFlow } from '../commerce/order-flow';
import { fetchOrderStores, joinStoreNames, type OrderStoreSection } from '../commerce/order-stores';
import { orderTip } from '../commerce/order-summary';
import { formattedAddressFromPlace, restoreFleetbasePlace } from '../utils/location';
import LiveOrderRoute from '../components/LiveOrderRoute';
import LivePickupRoute from '../components/LivePickupRoute';
import { Button, ErrorState, IconButton, OfflineNotice, Sheet, Skeleton, StarInput, StoreLogo, TextField, UIText, formatClock, initials, radius, space, usableImageUrl, usesTwelveHourClock } from '../ui';
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
const ORDER_CACHE_PREFIX = 'order-screen:';

/** The full order as last loaded, so reopening it shows everything (the driver, too) at once. */
function cachedOrder(id?: string | null): any {
    if (!id) return null;
    try {
        return storage.get(`${ORDER_CACHE_PREFIX}${id}`) ?? null;
    } catch {
        return null;
    }
}

function cacheOrder(order: any) {
    const id = order?.id;
    if (!id || typeof order.serialize !== 'function') return;
    try {
        storage.set(`${ORDER_CACHE_PREFIX}${id}`, order.serialize());
    } catch {
        // A cache miss only means the next visit starts from the summary.
    }
}

const OrderScreen = ({ route }: any) => {
    const params = route.params || {};
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    // Opened from a push notification it is presented as a modal (OrderModal).
    const top = useScreenTopInset(route?.name === 'OrderModal');
    const navigation = useNavigation<any>();
    const { customer } = useAuth();
    const { storefront, adapter: storefrontAdapter } = useStorefront();
    const { info, enabled } = useStorefrontInfo();
    const reviewsEnabled = enabled('reviews');
    const { mode } = useStorefrontRuntime();
    const { listen } = useSocketClusterClient();
    const { t, locale } = useLanguage();
    const hour12 = usesTwelveHourClock(locale);

    // The last full copy of this order (kept from the previous visit) shows at once; otherwise
    // the summary it was opened with, or only its id from a notification or link. The full
    // order is always fetched on open.
    const orderId = params.order?.id ?? params.orderId;
    const [order, setOrder] = useState<any>(() => new Order(cachedOrder(orderId) ?? params.order ?? { id: orderId }, fleetbaseAdapter));
    const [loaded, setLoaded] = useState<boolean>(() => !!(cachedOrder(orderId) ?? params.order));
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
    // The thread with the store: open from the moment the order is placed.
    const [storeChat, setStoreChat] = useState<OrderChat | null>(null);
    // The last change the store made to the order while it was open here ("Order updated").
    const [changeNotice, setChangeNotice] = useState<OrderChange | null>(null);
    const { addNotificationListener, removeNotificationListener } = useNotification() as any;
    const { savedLocations: savedPlaces } = useSavedLocations();
    const savedLocations: any[] = Array.isArray(savedPlaces) ? savedPlaces.filter((place: any) => typeof place?.id === 'string' && place.id.startsWith('place_')) : [];
    // "Wrong address?": the sheet, what is being sent, and a request already sent (kept until
    // the drop-off changes, so it shows as pending across visits).
    const [addressSheet, setAddressSheet] = useState(false);
    const [addressMessage, setAddressMessage] = useState('');
    const [addressPlace, setAddressPlace] = useState<string | null>(null);
    const [sendingAddress, setSendingAddress] = useState(false);
    const [addressRequest, setAddressRequest] = useStorage<{ at: string; message: string; dropoff: any } | null>(`address_request_${orderId}`, null);
    const [flow, setFlow] = useState<OrderFlow | null>(null);
    // A multi-store order: the stores it brings together, each with its own progress and items.
    const [orderStores, setOrderStores] = useState<OrderStoreSection[]>([]);
    const [screenHeight, setScreenHeight] = useState(0);
    // How far the sheet has scrolled; it reaches the top of the scroll area at `sheetTop`.
    const scrollY = useRef(new Animated.Value(0)).current;
    const sheetTop = Math.max(1, MAP_HEIGHT - insets.top - SHEET_OVERLAP);
    const statusBarFill = scrollY.interpolate({ inputRange: [sheetTop - 24, sheetTop], outputRange: [0, 1], extrapolate: 'clamp' });
    // The part of the full-screen map hidden under the sheet when it rests.
    const mapCovered = Math.max(0, screenHeight - MAP_HEIGHT + SHEET_OVERLAP);

    const storeId = useMemo(() => order.getAttribute('meta.storefront_id'), [order]);
    const [store, setStore] = useStorage(`${storeId}`, info);

    const distanceLoadedRef = useRef(false);
    const listenerRef = useRef<any>(null);
    const orderRef = useRef(order);
    const statusRef = useRef(order.getAttribute('status'));

    const isPickup = !!order.getAttribute('meta.is_pickup');
    // A service booking: its own flow, a provider rather than a driver, and any products come
    // with the earliest appointment.
    const isBooking = !!order.getAttribute('meta.is_booking') || !!order.getAttribute('meta.booking');
    // A multi-store order: one delivery bringing together the orders each store prepares.
    const isMultiStore = !!order.getAttribute('meta.is_master_order') && (order.getAttribute('meta.related_orders')?.length ?? 0) > 0;
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
            if (placeMoved(orderRef.current.getAttribute('payload.dropoff'), reloaded.getAttribute('payload.dropoff'))) markOrderHistoryDirty(customer?.id);
            setOrder(reloaded);
            cacheOrder(reloaded);
            statusRef.current = reloaded.getAttribute('status');
            distanceLoadedRef.current = false;
        } catch (err) {
            console.error('Error reloading order:', err);
        } finally {
            setRefreshing(false);
        }
    }, [customer?.id]);

    useEffect(() => {
        orderRef.current
            .reload()
            .then((reloaded: any) => {
                setOrder(reloaded);
                cacheOrder(reloaded);
                statusRef.current = reloaded.getAttribute('status');
                setLoaded(true);
            })
            .catch(() => !loaded && setLoadFailed(true));
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
        listen(`order.${order.id}`, (event: any) => {
            // A store edit: say what changed, and the order list is out of date too.
            const change = parseOrderChanged(event);
            if (change) {
                setChangeNotice(change);
                markOrderHistoryDirty(customer?.id);
            }
            scheduleReload();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listen, order.id, scheduleReload]);

    // A push about this order while it is open here (the socket may have missed the change).
    useEffect(() => {
        const onPush = (notification: any, action?: any) => {
            if (action) return;
            const payload = notification?.payload ?? notification ?? {};
            if (pushedOrderId(payload) !== order.id) return;
            if (payload.type === 'order_updated') {
                const summary = notification?.body ?? payload.body ?? payload.message ?? null;
                setChangeNotice((current) => current ?? { orderId: order.id, changes: [], summary: typeof summary === 'string' ? summary : null, dropoffChanged: false, total: null, currency: null, changedBy: null, changedAt: null });
            }
            scheduleReload();
        };
        addNotificationListener(onPush);
        return () => removeNotificationListener(onPush);
    }, [addNotificationListener, removeNotificationListener, order.id, scheduleReload]);

    // Sockets can lag (or drop) behind the server, so while the order is under way it is
    // also refreshed periodically and whenever the app comes back to the foreground (from a
    // payment page, too). A finished order with a balance still due keeps refreshing until
    // it is paid.
    const settled = finished || canceled;
    const payment = useMemo(() => parseOrderPayment(order), [order]);
    const live = keepRefreshing({ settled, payment });
    useEffect(() => {
        if (!loaded || !live) return;
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
    }, [loaded, live, reloadOrder, scheduleReload]);

    useEffect(() => {
        orderRef.current = order;
        statusRef.current = order.getAttribute('status');
    }, [order]);

    // Once the order is finished, invite a review (the server checks it's this customer's
    // completed order and not reviewed yet).
    useEffect(() => {
        if (!finished || !storeId || !customer || !reviewsEnabled || isMultiStore) return;
        let active = true;
        fetchEligibility(reviewRequest, storeId, order.id)
            .then((result) => active && setReviewState(result))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [customer, finished, order.id, reviewRequest, storeId, reviewsEnabled, isMultiStore]);

    // Chats are re-read (for their unread counts) when the order moves on, when a chat
    // message is pushed and when coming back to this screen from a chat.
    const [chatTick, setChatTick] = useState(0);
    useEffect(() => {
        const onPush = (notification: any, action?: any) => {
            const payload = notification?.payload ?? {};
            if (!action && payload.type === 'order_chat_message' && (payload.order_id ?? payload.id) === order.id) setChatTick((tick) => tick + 1);
        };
        addNotificationListener(onPush);
        const unsubscribe = navigation.addListener?.('focus', () => setChatTick((tick) => tick + 1));
        return () => {
            removeNotificationListener(onPush);
            unsubscribe?.();
        };
    }, [addNotificationListener, navigation, order.id, removeNotificationListener]);

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
    }, [chatRequest, customer, finished, hasDriver, isPickup, loaded, order.id, status, chatTick]);

    // The store thread: available before a driver is assigned, for pickups too. Only shown
    // when the server has it (an older server would answer with the driver's thread).
    useEffect(() => {
        if (!customer || !loaded || isMultiStore) return;
        let active = true;
        fetchChat(chatRequest, order.id, 'customer')
            .then((result) => active && setStoreChat(result))
            .catch(() => active && setStoreChat(null));
        return () => {
            active = false;
        };
    }, [chatRequest, customer, isMultiStore, loaded, order.id, status, chatTick]);

    // A multi-store order's breakdown by store, refreshed whenever the order is (each store
    // moves on at its own pace).
    useEffect(() => {
        if (!customer || !loaded || !isMultiStore) return;
        let active = true;
        fetchOrderStores(chatRequest, order.id)
            .then((sections) => active && setOrderStores(sections))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [chatRequest, customer, isMultiStore, loaded, order]);

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

    const openStoreChat = () =>
        navigation.navigate('OrderChat', {
            orderId: order.id,
            kind: 'customer',
            orderReference: order.getAttribute('tracking_number.tracking_number') ?? order.id,
            storeName: store?.name ?? undefined,
            storeLogo: store?.logo_url ?? undefined,
            storePhone: store?.phone ?? undefined,
        });

    // "Wrong address?": a saved place or a message to the store, which sees it in the order
    // chat and as an alert on the order.
    const canFixAddress = loaded && !!customer && canRequestAddressChange({ status, phase: progress.phase, isPickup, finished, canceled });
    const addressPending = !!addressRequest && !settled && !placeMoved(addressRequest.dropoff, order.getAttribute('payload.dropoff'));
    useEffect(() => {
        // The drop-off changed since the request (or the order ended): it was dealt with.
        if (addressRequest && !addressPending) setAddressRequest(null);
    }, [addressPending, addressRequest, setAddressRequest]);
    const sendAddressRequest = async () => {
        const place = addressPlace ? savedLocations.find((entry: any) => entry?.id === addressPlace) : null;
        const placeText = place ? [place.getAttribute?.('name'), place.getAttribute?.('street1') ?? place.getAttribute?.('address')].filter(Boolean).join(', ') : '';
        const message = addressMessage.trim() || (placeText ? t('Tracking.addressRequestPlace', { place: placeText }) : '');
        if (!message || sendingAddress) return;
        setSendingAddress(true);
        try {
            await requestAddressChange(chatRequest, order.id, { message, place: addressPlace });
            setAddressRequest({ at: new Date().toISOString(), message, dropoff: order.getAttribute('payload.dropoff') ?? null });
            setAddressSheet(false);
            setAddressMessage('');
            setAddressPlace(null);
            setChatTick((tick) => tick + 1);
            toast.success(t('Tracking.addressRequestSent', { store: storeName || t('StoreSwitch.thisStore') }));
        } catch {
            toast.error(t('Tracking.addressRequestFailed'));
        } finally {
            setSendingAddress(false);
        }
    };

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

    const multiStoreName = isMultiStore ? joinStoreNames(orderStores.map((section) => section.store.name ?? '')) : '';
    const storeName = multiStoreName || (store?.name ?? (foodTruck ? foodTruckDisplayName(foodTruck) : null) ?? order.getAttribute('payload.pickup.name') ?? '');
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
    // A booking order's appointment (meta.booking) when the server set one; else each item's time.
    const appointment = orderBooking(order.getAttribute('meta'));
    const scheduledBookings = entities
        .map((entity: any) => ({ entity, at: parseScheduledAt(entity?.meta?.scheduled_at) }))
        .filter((booking) => booking.at)
        .sort((a: any, b: any) => a.at.at.getTime() - b.at.at.getTime());
    const bookings =
        scheduledBookings.length || !appointment?.start || !entities.length ? scheduledBookings : [{ entity: entities[0], at: parseScheduledAt(appointment.start) }].filter((booking) => booking.at);
    const bookingConfirmed = isBooking ? !['created', 'pending'].includes(String(status)) && !canceled : progress.phase !== 'placed' && !progress.canceled;
    // Products in a booking come with the earliest appointment.
    const bookingHasItems = isBooking && entities.some((entity: any) => !parseScheduledAt(entity?.meta?.scheduled_at));
    const appointmentPlace = isPickup ? pickup : dropoff;

    const addBookingToCalendar = async (entity: any, at: Date) => {
        const duration = Number(entity?.meta?.duration_minutes ?? entity?.meta?.duration ?? appointment?.durationMinutes);
        try {
            const result = await addToCalendar({
                title: storeName ? `${entity.name} · ${storeName}` : entity.name,
                start: at,
                end: Number.isFinite(duration) && duration > 0 ? new Date(at.getTime() + duration * 60000) : null,
                location: appointmentPlace ? formattedAddressFromPlace(restoreFleetbasePlace(appointmentPlace)) : null,
                notes: t('Tracking.calendarNotes', { reference }),
            });
            if (result === 'saved') toast.success(t('Tracking.addedToCalendar'));
            else if (result === 'unavailable') toast.error(t('Tracking.calendarUnavailable'));
        } catch {
            toast.error(t('Tracking.calendarUnavailable'));
        }
    };
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
        !isPickup && { label: t(isBooking ? 'Tracking.visitFee' : 'Tracking.deliveryFee'), value: order.getAttribute('meta.delivery_fee') },
        // Tips as charged: the recorded amount, not a percentage of a subtotal an edit changed.
        orderTip(order.getAttribute('meta'), 'tip') > 0 && { label: t('Tracking.tip'), value: orderTip(order.getAttribute('meta'), 'tip') },
        orderTip(order.getAttribute('meta'), 'delivery_tip') > 0 && { label: t('Tracking.driverTip'), value: orderTip(order.getAttribute('meta'), 'delivery_tip') },
    ].filter(Boolean) as { label: string; value: unknown }[];
    const discount = Number(order.getAttribute('meta.discount')) || 0;
    // The promotions applied (each code and what it took off), else the discount as one line.
    const promotions: { name: string; amount: number }[] = (order.getAttribute('meta.promotions') ?? [])
        .map((promotion: any) => ({ name: String(promotion?.code ?? promotion?.name ?? ''), amount: (Number(promotion?.amount) || 0) + (Number(promotion?.delivery_amount) || 0) }))
        .filter((promotion: { name: string }) => promotion.name);
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
        <YStack flex={1} backgroundColor='$background' onLayout={(event) => setScreenHeight(event.nativeEvent.layout.height)}>
            {/* The map fills the screen behind the sheet, so pulling the sheet down only ever
                reveals more map. Its route and labels are kept to the part above the sheet.
                zIndex 0 keeps web map panes under the sheet. */}
            <YStack position='absolute' top={0} left={0} right={0} bottom={0} backgroundColor='$surface2' accessibilityLabel={t('Tracking.mapLabel')} zIndex={0}>
                {canRenderRoute &&
                    (isPickup ? (
                        <LivePickupRoute order={order} zoom={4} bottomInset={mapCovered} />
                    ) : (
                        <LiveOrderRoute order={order} zoom={4} customOrigin={foodTruck ?? foodTruckId} bottomInset={mapCovered} />
                    ))}
            </YStack>
            {/* Starts below the status bar so the refresh spinner shows there, over the map. */}
            <Animated.ScrollView
                style={{ flex: 1, zIndex: 1, marginTop: insets.top }}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                pointerEvents='box-none'
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => reloadOrder({ refresh: true })} tintColor={theme.primary.val} colors={[theme.primary.val]} />
                }
                contentContainerStyle={{ flexGrow: 1 }}
            >
                {/* Over the map: touches pass through to it, so it can still be panned and zoomed. */}
                <YStack height={MAP_HEIGHT - insets.top} pointerEvents='none' />

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
                    {/* Continues the sheet below its end, so scrolling past the bottom never shows the map. */}
                    <YStack position='absolute' top='100%' left={0} right={0} height={1000} backgroundColor='$background' pointerEvents='none' />
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

                    {!!changeNotice && (
                        <XStack gap={10} padding={12} borderRadius={radius.card} backgroundColor='$primarySoft' accessibilityRole='alert' testID='order-changed-notice'>
                            <FontAwesomeIcon icon={faRotate} size={16} color={theme.primaryForeground.val} style={{ marginTop: 2 }} />
                            <YStack flex={1} gap={2}>
                                <UIText variant='bodyStrong' style={{ fontSize: 14 }}>
                                    {changeNotice.changedBy ? t('Tracking.orderUpdatedBy', { name: changeNotice.changedBy }) : t('Tracking.orderUpdated')}
                                </UIText>
                                <UIText variant='caption' tone='secondary'>
                                    {changeNotice.summary ?? t('Tracking.orderUpdatedBody')}
                                </UIText>
                            </YStack>
                            <IconButton icon={faXmark} variant='plain' size={32} accessibilityLabel={t('Tracking.dismissUpdate')} onPress={() => setChangeNotice(null)} />
                        </XStack>
                    )}

                    {addressPending ? (
                        <XStack gap={10} padding={12} borderRadius={radius.card} backgroundColor='$warningSoft' accessibilityRole='summary'>
                            <FontAwesomeIcon icon={faLocationDot} size={16} color={theme.warningForeground.val} style={{ marginTop: 2 }} />
                            <YStack flex={1} gap={2}>
                                <UIText variant='bodyStrong' style={{ fontSize: 14 }}>
                                    {t('Tracking.addressRequestPending')}
                                </UIText>
                                <UIText variant='caption' tone='secondary' numberOfLines={3}>
                                    {t('Tracking.addressRequestPendingBody', { store: storeName || t('StoreSwitch.thisStore'), message: addressRequest?.message ?? '' })}
                                </UIText>
                            </YStack>
                        </XStack>
                    ) : (
                        canFixAddress && (
                            <XStack alignItems='center' gap={10} padding={12} borderRadius={radius.card} borderWidth={1} borderColor='$borderColor'>
                                <FontAwesomeIcon icon={faLocationDot} size={16} color={theme.textSecondary.val} />
                                <UIText flex={1} variant='caption' tone='secondary' numberOfLines={2}>
                                    {t('Tracking.deliveringTo', { place: [dropoff?.name, fullAddress(dropoff)].filter(Boolean).join(', ') })}
                                </UIText>
                                <Button variant='ghost' size='sm' onPress={() => setAddressSheet(true)} testID='order-wrong-address'>
                                    {t('Tracking.wrongAddress')}
                                </Button>
                            </XStack>
                        )
                    )}

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
                                <UIText variant='bodyStrong'>{t(isBooking ? 'Tracking.providerCard' : 'Tracking.driverCard', { driver: driverName })}</UIText>
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

                    {bookings.map(({ entity, at }: any, index: number) => (
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
                                    {appointment?.end && appointment.start?.getTime() === at.at.getTime() ? ` – ${formatClock(appointment.end.getHours() * 60 + appointment.end.getMinutes(), hour12)}` : ''}
                                </UIText>
                                <UIText variant='caption' tone='secondary'>
                                    {bookingConfirmed ? t('Tracking.bookingConfirmedBody', { store: storeName }) : t('Tracking.bookingRequestedBody', { store: storeName })}
                                </UIText>
                                {bookingHasItems && index === 0 && (
                                    <UIText variant='caption' tone='brand'>
                                        {isPickup ? t('Tracking.itemsAtAppointment') : t('Tracking.itemsWithAppointment')}
                                    </UIText>
                                )}
                            </YStack>
                            {!canceled && !finished && (
                                <IconButton
                                    icon={faCalendarPlus}
                                    size={44}
                                    accessibilityLabel={t('Tracking.addToCalendar', { name: entity.name })}
                                    onPress={() => addBookingToCalendar(entity, at.at)}
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

                    {isMultiStore ? (
                        orderStores.map((section) => {
                            const sectionName = section.store.name ?? t('StoreSwitch.thisStore');
                            return (
                                <YStack key={section.order} gap={10} padding={12} borderRadius={radius.card} borderWidth={1} borderColor='$borderColor'>
                                    <XStack alignItems='center' gap={12}>
                                        <StoreLogo uri={section.store.logoUrl} name={sectionName} size={40} radius={radius.tile} />
                                        <YStack flex={1} gap={2}>
                                            <UIText variant='bodyStrong'>{sectionName}</UIText>
                                            {!!section.label && (
                                                <UIText variant='captionStrong' tone='brand'>
                                                    {section.label}
                                                </UIText>
                                            )}
                                            {!!section.store.address && (
                                                <UIText variant='caption' tone='secondary' numberOfLines={2}>
                                                    {section.store.address}
                                                </UIText>
                                            )}
                                        </YStack>
                                        {!!section.store.phone && (
                                            <IconButton
                                                icon={faPhone}
                                                size={44}
                                                accessibilityLabel={t('Tracking.callStore', { store: sectionName })}
                                                onPress={() => Linking.openURL(`tel:${section.store.phone}`)}
                                            />
                                        )}
                                    </XStack>
                                    {section.items.map((item) => {
                                        const options = [...item.variants, ...item.addons].map((option: any) => option?.name).filter(Boolean);
                                        return (
                                            <XStack key={item.id} alignItems='center' gap={10}>
                                                {usableImageUrl(item.imageUrl) ? (
                                                    <Image source={{ uri: item.imageUrl as string }} style={{ width: 40, height: 40, borderRadius: radius.tile }} accessibilityIgnoresInvertColors />
                                                ) : null}
                                                <YStack flex={1} gap={2}>
                                                    <UIText tone='secondary'>
                                                        {item.quantity} × {item.name}
                                                    </UIText>
                                                    {options.length > 0 && (
                                                        <UIText variant='caption' tone='secondary'>
                                                            {options.join(', ')}
                                                        </UIText>
                                                    )}
                                                </YStack>
                                                <UIText>{money(item.subtotal)}</UIText>
                                            </XStack>
                                        );
                                    })}
                                    <XStack justifyContent='space-between' paddingTop={8} borderTopWidth={1} borderColor='$borderColor'>
                                        <UIText tone='secondary'>{t('Tracking.storeSubtotal')}</UIText>
                                        <UIText>{money(section.subtotal)}</UIText>
                                    </XStack>
                                </YStack>
                            );
                        })
                    ) : (
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
                            {!!storeChat && (!(finished || canceled) || storeChat.messages.length > 0) && (
                                <IconButton
                                    icon={faStore}
                                    variant={storeChat.unread ? 'solid' : 'surface'}
                                    size={44}
                                    badge={storeChat.unread ? storeChat.unread : undefined}
                                    accessibilityLabel={t('Chat.messageStore', { store: storeName || t('StoreSwitch.thisStore') })}
                                    onPress={openStoreChat}
                                    testID='order-message-store'
                                />
                            )}
                        </XStack>
                    )}

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
                        {!isMultiStore && entities.map((entity: any, index: number) => {
                            const options = [...(entity.meta?.variants ?? []), ...(entity.meta?.addons ?? [])].map((option: any) => option?.name).filter(Boolean);
                            // The store's word on the item: unavailable, substituted, or a note.
                            const unavailable = [true, 1, '1', 'true'].includes(entity.meta?.unavailable);
                            const replaces = entity.meta?.substitute_for ? entities.find((other: any) => other?.id === entity.meta.substitute_for) : null;
                            const note = typeof entity.meta?.note === 'string' && entity.meta.note.trim() ? entity.meta.note.trim() : null;
                            return (
                                <XStack key={entity.id ?? index} alignItems='center' gap={10}>
                                    {usableImageUrl(entity.photo_url) ? (
                                        <Image source={{ uri: entity.photo_url }} style={{ width: 40, height: 40, borderRadius: radius.tile }} accessibilityIgnoresInvertColors />
                                    ) : null}
                                    <YStack flex={1} gap={2}>
                                        <UIText tone='secondary' style={unavailable ? { textDecorationLine: 'line-through' } : undefined}>
                                            {entity.meta?.quantity ?? 1} × {entity.name}
                                        </UIText>
                                        {options.length > 0 && (
                                            <UIText variant='caption' tone='secondary'>
                                                {options.join(', ')}
                                            </UIText>
                                        )}
                                        {unavailable && (
                                            <UIText variant='captionStrong' tone='error'>
                                                {t('Tracking.itemUnavailable')}
                                            </UIText>
                                        )}
                                        {!!entity.meta?.substitute_for && (
                                            <UIText variant='captionStrong' tone='brand'>
                                                {replaces?.name ? t('Tracking.substituteFor', { name: replaces.name }) : t('Tracking.substitute')}
                                            </UIText>
                                        )}
                                        {!!note && (
                                            <UIText variant='caption' tone='secondary'>
                                                {t('Tracking.storeNote', { note })}
                                            </UIText>
                                        )}
                                    </YStack>
                                    <UIText tone={unavailable ? 'secondary' : 'primary'}>{money(entity.meta?.subtotal ?? entity.price)}</UIText>
                                </XStack>
                            );
                        })}
                        {totals.map((row) => (
                            <XStack key={row.label} justifyContent='space-between'>
                                <UIText tone='secondary'>{row.label}</UIText>
                                <UIText>{money(row.value)}</UIText>
                            </XStack>
                        ))}
                        {promotions.length > 0
                            ? promotions.map((promotion) => (
                                  <XStack key={promotion.name} justifyContent='space-between'>
                                      <UIText tone='success'>{promotion.name}</UIText>
                                      {promotion.amount > 0 && <UIText tone='success'>−{money(promotion.amount)}</UIText>}
                                  </XStack>
                              ))
                            : discount > 0 && (
                                  <XStack justifyContent='space-between'>
                                      <UIText tone='success'>{t('Tracking.discount')}</UIText>
                                      <UIText tone='success'>−{money(discount)}</UIText>
                                  </XStack>
                              )}
                        <XStack justifyContent='space-between' alignItems='center' paddingTop={8} borderTopWidth={1} borderColor='$borderColor'>
                            <XStack alignItems='center' gap={8} flexShrink={1}>
                                <UIText variant='bodyStrong'>{t('Tracking.total')}</UIText>
                                <PaymentBadge payment={payment} />
                            </XStack>
                            <UIText variant='bodyStrong'>{money(order.getAttribute('meta.total'))}</UIText>
                        </XStack>
                        {/* Refunds, store credit, cash to collect, any balance due and how to pay it. */}
                        <PaymentStatus payment={payment} money={(value) => money(value)} showBadge={false} />
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
            </Animated.ScrollView>

            {/* Once the sheet reaches the top, the strip behind the status bar takes its colour too. */}
            <Animated.View
                pointerEvents='none'
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, zIndex: 2, backgroundColor: theme.background.val, opacity: statusBarFill }}
            />

            <YStack position='absolute' top={top + 10} left={space.gutter} zIndex={3}>
                <IconButton icon={faXmark} variant='floating' size={44} accessibilityLabel={t('UI.close')} onPress={close} />
            </YStack>
            {/* Opened from a notification this is a modal above the app layout, so it has its own notice. */}
            <OfflineNotice top={top + 62} />

            <Sheet
                open={addressSheet}
                onClose={() => setAddressSheet(false)}
                title={t('Tracking.wrongAddressTitle')}
                footer={
                    <YStack gap={8}>
                        <Button size='lg' fullWidth loading={sendingAddress} disabled={!addressMessage.trim() && !addressPlace} onPress={sendAddressRequest} testID='order-address-request-send'>
                            {t('Tracking.sendToStore', { store: storeName || t('StoreSwitch.thisStore') })}
                        </Button>
                        <Button variant='ghost' size='lg' fullWidth onPress={() => setAddressSheet(false)}>
                            {t('common.cancel')}
                        </Button>
                    </YStack>
                }
            >
                <YStack gap={12}>
                    <UIText tone='secondary'>{t('Tracking.wrongAddressBody', { store: storeName || t('StoreSwitch.thisStore') })}</UIText>
                    {savedLocations.length > 0 && (
                        <YStack gap={8} accessibilityRole='radiogroup' accessibilityLabel={t('Tracking.savedPlaces')}>
                            <UIText variant='label' tone='secondary'>
                                {t('Tracking.savedPlaces')}
                            </UIText>
                            {savedLocations.map((place: any) => {
                                const id = place?.id;
                                if (!id) return null;
                                const selected = addressPlace === id;
                                const name = place.getAttribute?.('name') || place.getAttribute?.('street1') || '';
                                return (
                                    <Pressable
                                        key={id}
                                        onPress={() => setAddressPlace(selected ? null : id)}
                                        accessibilityRole='radio'
                                        accessibilityState={{ checked: selected }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: 12,
                                            borderRadius: radius.button,
                                            borderWidth: 1,
                                            borderColor: selected ? theme.primary.val : theme.borderColor.val,
                                            backgroundColor: selected ? theme.primarySoft.val : theme.background.val,
                                        }}
                                    >
                                        <FontAwesomeIcon icon={selected ? faCheck : faLocationDot} size={14} color={selected ? theme.primaryForeground.val : theme.textSecondary.val} />
                                        <YStack flex={1}>
                                            <UIText variant='bodyStrong' style={{ fontSize: 14 }} numberOfLines={1}>
                                                {name}
                                            </UIText>
                                            <UIText variant='caption' tone='secondary' numberOfLines={1}>
                                                {formattedAddressFromPlace(place)}
                                            </UIText>
                                        </YStack>
                                    </Pressable>
                                );
                            })}
                        </YStack>
                    )}
                    <TextField
                        value={addressMessage}
                        onChangeText={setAddressMessage}
                        placeholder={t('Tracking.addressMessagePlaceholder')}
                        accessibilityLabel={t('Tracking.addressMessagePlaceholder')}
                        multiline
                        height={88}
                        maxLength={1000}
                        style={{ textAlignVertical: 'top', paddingTop: 12 }}
                    />
                </YStack>
            </Sheet>

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
