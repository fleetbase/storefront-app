import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, useWindowDimensions } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell, faChevronDown, faChevronRight, faMagnifyingGlass, faPlus, faReceipt, faTableCellsLarge, faTruckFast } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import useCartSummary from '../../hooks/use-cart-summary';
import useCurrentLocation from '../../hooks/use-current-location';
import useCustomerCoordinates from '../../hooks/use-customer-coordinates';
import useSavedLocations from '../../hooks/use-saved-locations';
import useUnreadNotifications from '../../hooks/use-unread-notifications';
import useMainStore from '../../network/use-main-store';
import { rememberStores } from '../../network/store-names';
import { categoryTree, descendantIds, type CategoryNode } from '../../commerce/categories';
import { fetchOffers, offerTargets, type Offer } from '../../commerce/offers';
import { summarizeOrder, type OrderSummary } from '../../commerce/order-summary';
import { OfferBanner, useOfferBadge } from '../../components/offers/OfferCard';
import { formatCurrency } from '../../utils/format';
import {
    Badge,
    CartPill,
    IconButton,
    LanguageButton,
    LocationSheet,
    MediaImage,
    SectionHeader,
    Skeleton,
    StoreCard,
    UIText,
    categoryIcon,
    elevation,
    productSummary,
    radius,
    space,
    storeSummary,
    usableImageUrl,
    usesTwelveHourClock,
    type ProductSummary,
    type StoreSummary,
} from '../../ui';

const GRID_COLUMNS = 4;
const GRID_MAX = 8;
const PARTNER_LIMIT = 20;
const SERVICE_STORES = 6;
const SERVICE_LIMIT = 8;
const USUAL_LIMIT = 10;

type Usual = { productId: string; name: string; imageUrl: string | null; price: string; count: number };
type Service = { summary: ProductSummary; resource: any; store: StoreSummary; storeData: any; locationId: string | null };

/**
 * A Network home built around its main store (`navigation.network.mainStoreTag`): the main
 * store's categories in a grid, live offers, the customer's active order and usual items,
 * bookable services from partner shops, and the partner shops themselves.
 */
const NetworkShopHomeScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const { t, locale } = useLanguage();
    const { storefront } = useStorefront();
    const { network } = useStorefrontRuntime();
    const { customer } = useAuth() as any;
    const { currentLocation, updateCurrentLocation } = useCurrentLocation();
    const { savedLocations } = useSavedLocations();
    const { coordinates } = useCustomerCoordinates();
    const { count: unread } = useUnreadNotifications();
    const cart = useCartSummary();
    const offerBadge = useOfferBadge();
    const hour12 = usesTwelveHourClock(locale);
    const main = useMainStore();
    const mainId: string | null = main.store?.id ?? null;

    const [categories, setCategories] = useState<CategoryNode[] | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [partners, setPartners] = useState<{ summary: StoreSummary; data: any }[] | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [locationSheet, setLocationSheet] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [attempt, setAttempt] = useState(0);

    // The main store's categories (the whole Network's without one), top level first.
    useEffect(() => {
        if (!storefront || main.loading) return;
        let active = true;
        (mainId ? storefront.categories.query({ store: mainId }) : storefront.categories.query({ parents_only: true }))
            .then((result: any) => active && setCategories(categoryTree(Array.from(result || []))))
            .catch(() => active && setCategories([]));
        return () => {
            active = false;
        };
    }, [attempt, main.loading, mainId, storefront]);

    useEffect(() => {
        const adapter = storefront?.getAdapter?.();
        if (!adapter) return;
        fetchOffers((path, query) => adapter.get(path, query), { includeScheduled: false })
            .then((list) => setOffers(list.filter((offer) => offer.availability === 'live')))
            .catch(() => setOffers([]));
    }, [attempt, storefront]);

    // Partner shops: every member but the main store, nearest first.
    useEffect(() => {
        if (!network || main.loading) return;
        let active = true;
        network
            .getStores({ limit: PARTNER_LIMIT, with_locations: true, sort: 'nearest', ...(coordinates ? { location: coordinates } : {}) })
            .then((result: any) => {
                if (!active) return;
                const list = (Array.from(result || []) as any[]).filter((store) => store.id !== mainId);
                const summaries = list.map((store) => ({ summary: storeSummary(store, { t, hour12 }), data: store }));
                rememberStores(summaries.map((item) => item.summary));
                setPartners(summaries);
            })
            .catch(() => active && setPartners([]));
        return () => {
            active = false;
        };
    }, [attempt, coordinates, hour12, main.loading, mainId, network, t]);

    // Services: bookable products of the first few partner shops.
    useEffect(() => {
        if (!storefront || !partners) return;
        let active = true;
        Promise.all(
            partners.slice(0, SERVICE_STORES).map(async ({ summary, data }) => {
                try {
                    const products = Array.from((await storefront.products.query({ store: summary.id, limit: 20 })) || []) as any[];
                    const locations = data?.getAttribute?.('locations');
                    const locationId = Array.isArray(locations) && locations[0]?.id ? String(locations[0].id) : null;
                    return products
                        .map((resource) => ({ summary: productSummary(resource), resource, store: summary, storeData: data, locationId }))
                        .filter((item) => item.summary.isBookable);
                } catch {
                    return [];
                }
            })
        ).then((lists) => active && setServices(lists.flat().slice(0, SERVICE_LIMIT)));
        return () => {
            active = false;
        };
    }, [partners, storefront]);

    // The customer's recent orders: the active one and what they buy again.
    useFocusEffect(
        useCallback(() => {
            if (!customer?.getOrderHistory) {
                setOrders([]);
                return;
            }
            let live = true;
            customer
                .getOrderHistory({ sort: '-created_at', limit: 15 })
                .then((result: any) => {
                    if (!live) return;
                    const list = (Array.isArray(result) ? result : Array.from(result ?? [])).map((order: any) => (typeof order?.serialize === 'function' ? order.serialize() : order));
                    setOrders(list.map(summarizeOrder).filter((order: OrderSummary) => order.id));
                })
                .catch(() => {});
            return () => {
                live = false;
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [customer?.id, attempt])
    );

    const activeOrders = useMemo(() => orders.filter((order) => order.active).slice(0, 2), [orders]);

    // Products the customer orders most, most recent first among equals.
    const usual = useMemo<Usual[]>(() => {
        const byProduct = new Map<string, Usual & { last: number }>();
        orders
            .filter((order) => !order.canceled)
            .forEach((order, orderIndex) =>
                order.lines.forEach((line) => {
                    if (!line.productId || line.unavailable) return;
                    const existing = byProduct.get(line.productId);
                    if (existing) {
                        existing.count += line.quantity;
                        return;
                    }
                    byProduct.set(line.productId, {
                        productId: line.productId,
                        name: line.name,
                        imageUrl: line.imageUrl,
                        price: formatCurrency(line.subtotal / Math.max(1, line.quantity), order.currency ?? undefined),
                        count: line.quantity,
                        last: orderIndex,
                    });
                })
            );
        return [...byProduct.values()].sort((a, b) => b.count - a.count || a.last - b.last).slice(0, USUAL_LIMIT);
    }, [orders]);

    const tops = categories ?? [];
    const shownCategories = tops.length > GRID_MAX ? tops.slice(0, GRID_MAX - 1) : tops;
    const tileWidth = Math.floor((width - space.gutter * 2 - 10 * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
    const categoryDeal = (node: CategoryNode) => {
        const offer = offers.find((candidate) => offerTargets(candidate, { categoryIds: descendantIds(node) }));
        return offer ? offerBadge(offer) : null;
    };

    const greetingName = String(customer?.getAttribute?.('name') ?? '').split(' ')[0];
    const placeName = currentLocation?.getAttribute?.('name') || currentLocation?.getAttribute?.('street1') || null;

    const openCategory = (node: CategoryNode) => navigation.navigate('ShopCategory', { categoryId: node.id, storeId: mainId ?? undefined, name: node.name });
    const openAllCategories = () => (mainId ? navigation.navigate('NetworkStore', { storeId: mainId }) : navigation.navigate('NetworkCategory'));
    const openUsual = (item: Usual) => navigation.navigate('Product', { productId: item.productId, storeId: mainId ?? undefined, storeLocationId: main.locationId });
    const openService = (item: Service) =>
        navigation.navigate('Product', { product: item.resource.serialize(), productId: item.summary.id, storeId: item.store.id, store: item.storeData?.serialize?.(), storeLocationId: item.locationId });

    const refresh = () => {
        setRefreshing(true);
        main.reload();
        setAttempt((value) => value + 1);
        setTimeout(() => setRefreshing(false), 800);
    };

    return (
        <YStack flex={1} backgroundColor='$background'>
            {/* The greeting, address and search stay at the top while the rest scrolls. */}
            <YStack paddingTop={insets.top + 8} paddingHorizontal={space.gutter} paddingBottom={12} gap={14} backgroundColor='$background' borderBottomWidth={1} borderColor='$borderColor'>
                <XStack justifyContent='space-between' alignItems='flex-start' gap={12}>
                    <YStack flex={1} gap={2}>
                        <UIText variant='title' accessibilityRole='header' numberOfLines={1}>
                            {greetingName ? t('Shop.greetingNamed', { name: greetingName }) : t('Shop.greeting')}
                        </UIText>
                        <Pressable
                            onPress={() => setLocationSheet(true)}
                            accessibilityRole='button'
                            accessibilityLabel={placeName ? t('Network.changeLocation', { place: placeName }) : t('Network.setLocation')}
                            style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                            <UIText tone='secondary'>{t('Shop.deliverTo')}</UIText>
                            <UIText variant='bodyStrong' tone='brand' numberOfLines={1} style={{ flexShrink: 1 }}>
                                {placeName || t('Network.setLocation')}
                            </UIText>
                            <FontAwesomeIcon icon={faChevronDown} size={11} color={theme.primaryForeground.val} />
                        </Pressable>
                    </YStack>
                    <XStack alignItems='center' gap={8}>
                        <IconButton
                            icon={faBell}
                            variant='surface'
                            badge={unread > 0 ? (unread > 9 ? '9+' : String(unread)) : undefined}
                            accessibilityLabel={unread > 0 ? t('Notifications.bellUnread', { count: unread }) : t('Notifications.title')}
                            onPress={() => navigation.navigate('Notifications')}
                        />
                        <LanguageButton />
                    </XStack>
                </XStack>
                <Pressable
                    onPress={() => navigation.navigate('NetworkSearchTab')}
                    testID='shop-search-entry'
                    accessibilityRole='search'
                    accessibilityLabel={t('Shop.searchPlaceholder')}
                    style={{ height: 48, paddingHorizontal: 14, borderRadius: radius.button, backgroundColor: theme.surface.val, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                    <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={theme.textSecondary.val} />
                    <UIText tone='placeholder' flex={1} numberOfLines={1}>
                        {t('Shop.searchPlaceholder')}
                    </UIText>
                </Pressable>
            </YStack>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 16, paddingBottom: cart.count > 0 ? 110 : 32, gap: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
            >
                {/* An order on its way comes first, with the way to every past order. */}
                {activeOrders.length > 0 && (
                    <YStack gap={10} paddingHorizontal={space.gutter}>
                        {activeOrders.map((order) => (
                            <Pressable
                                key={order.id}
                                onPress={() => navigation.navigate('Order', { orderId: order.id })}
                                accessibilityRole='button'
                                accessibilityLabel={t('Account.activeOrderLabel', { id: order.reference })}
                                style={{ padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: theme.primary.val, backgroundColor: theme.primarySoft.val, flexDirection: 'row', alignItems: 'center', gap: 12, ...elevation.card }}
                            >
                                <YStack width={44} height={44} borderRadius={22} backgroundColor='$primary' alignItems='center' justifyContent='center'>
                                    <FontAwesomeIcon icon={faTruckFast} size={18} color={theme.primaryText.val} />
                                </YStack>
                                <YStack flex={1} gap={2}>
                                    <UIText variant='captionStrong' tone='brand'>
                                        {t('Account.activeOrder')}
                                    </UIText>
                                    <UIText variant='bodyStrong' numberOfLines={1}>
                                        {t(`Tracking.phase.${order.phase}.title`, { store: order.storeName, driver: t('Tracking.yourDriver') })}
                                    </UIText>
                                    <UIText variant='caption' tone='secondary' numberOfLines={1}>
                                        {[order.storeName, order.reference].filter(Boolean).join(' · ')}
                                    </UIText>
                                </YStack>
                                <YStack paddingHorizontal={12} paddingVertical={6} borderRadius={radius.pill} backgroundColor='$primary'>
                                    <UIText variant='captionStrong' tone='onPrimary'>
                                        {t('Account.track')}
                                    </UIText>
                                </YStack>
                            </Pressable>
                        ))}
                        <Pressable onPress={() => navigation.navigate('OrderHistory')} accessibilityRole='link' style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <FontAwesomeIcon icon={faReceipt} size={14} color={theme.textSecondary.val} />
                            <UIText variant='captionStrong' tone='secondary' style={{ flex: 1 }}>
                                {t('Shop.orderHistory')}
                            </UIText>
                            <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.textSecondary.val} />
                        </Pressable>
                    </YStack>
                )}

                {offers.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 12 }} accessibilityLabel={t('Offers.title')}>
                        {offers.slice(0, 8).map((offer, index) => (
                            <OfferBanner key={offer.id} offer={offer} primary={index === 0} width={Math.min(320, width - space.gutter * 2 - 24)} onPress={() => navigation.navigate('Offer', { offerId: offer.id })} />
                        ))}
                    </ScrollView>
                )}

                <YStack gap={12}>
                    <SectionHeader title={t('Shop.categories')} actionLabel={t('Shop.all')} onAction={openAllCategories} />
                    {categories === null ? (
                        <XStack flexWrap='wrap' gap={10} rowGap={14} paddingHorizontal={space.gutter}>
                            {Array.from({ length: GRID_MAX }).map((_, key) => (
                                <YStack key={key} width={tileWidth} alignItems='center' gap={6}>
                                    <Skeleton width={tileWidth} height={tileWidth} radius={radius.tile} />
                                    <Skeleton width={tileWidth * 0.7} height={12} />
                                </YStack>
                            ))}
                        </XStack>
                    ) : (
                        <XStack flexWrap='wrap' gap={10} rowGap={14} paddingHorizontal={space.gutter}>
                            {shownCategories.map((node) => {
                                const deal = categoryDeal(node);
                                return (
                                    <Pressable key={node.id} onPress={() => openCategory(node)} accessibilityRole='button' accessibilityLabel={deal ? `${node.name}, ${deal}` : node.name} testID='shop-category' style={{ width: tileWidth, alignItems: 'center', gap: 6 }}>
                                        <YStack width={tileWidth} height={tileWidth} borderRadius={radius.tile} backgroundColor='$surface' alignItems='center' justifyContent='center' overflow='visible'>
                                            {usableImageUrl(node.iconUrl) ? (
                                                <Image source={{ uri: usableImageUrl(node.iconUrl) as string }} style={{ width: tileWidth * 0.8, height: tileWidth * 0.8, borderRadius: radius.tile }} resizeMode='contain' />
                                            ) : (
                                                <FontAwesomeIcon icon={categoryIcon(node.name)} size={26} color={theme.textPrimary.val} />
                                            )}
                                            {!!deal && (
                                                <YStack position='absolute' top={-6} right={-6}>
                                                    <Badge tone='error' size='sm' label={deal} />
                                                </YStack>
                                            )}
                                        </YStack>
                                        <UIText variant='caption' textAlign='center' numberOfLines={2} style={{ fontWeight: '600' }}>
                                            {node.name}
                                        </UIText>
                                    </Pressable>
                                );
                            })}
                            {tops.length > GRID_MAX && (
                                <Pressable onPress={openAllCategories} accessibilityRole='button' accessibilityLabel={t('Shop.allCategories')} style={{ width: tileWidth, alignItems: 'center', gap: 6 }}>
                                    <YStack width={tileWidth} height={tileWidth} borderRadius={radius.tile} backgroundColor='$primarySoft' alignItems='center' justifyContent='center'>
                                        <FontAwesomeIcon icon={faTableCellsLarge} size={24} color={theme.primaryForeground.val} />
                                    </YStack>
                                    <UIText variant='caption' textAlign='center' numberOfLines={2} style={{ fontWeight: '600' }}>
                                        {t('Shop.allCategories')}
                                    </UIText>
                                </Pressable>
                            )}
                        </XStack>
                    )}
                </YStack>

                {usual.length > 0 && (
                    <YStack gap={12}>
                        <SectionHeader title={t('Shop.usual')} subtitle={t('Shop.usualSubtitle')} actionLabel={t('Shop.orderHistory')} onAction={() => navigation.navigate('OrderHistory')} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 10 }}>
                            {usual.map((item) => (
                                <Pressable
                                    key={item.productId}
                                    onPress={() => openUsual(item)}
                                    accessibilityRole='button'
                                    accessibilityLabel={t('Shop.orderAgain', { name: item.name })}
                                    style={{ maxWidth: 260, padding: 8, paddingRight: 10, borderRadius: radius.card, borderWidth: 1, borderColor: theme.borderColor.val, backgroundColor: theme.surface.val, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                                >
                                    <MediaImage uri={item.imageUrl} seed={item.name} width={44} height={44} radius={radius.tile} />
                                    <YStack flexShrink={1}>
                                        <UIText variant='captionStrong' numberOfLines={1}>
                                            {item.name}
                                        </UIText>
                                        <UIText variant='caption' tone='secondary'>
                                            {item.price}
                                        </UIText>
                                    </YStack>
                                    <YStack width={32} height={32} borderRadius={16} backgroundColor='$primary' alignItems='center' justifyContent='center'>
                                        <FontAwesomeIcon icon={faPlus} size={14} color={theme.primaryText.val} />
                                    </YStack>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </YStack>
                )}

                {services.length > 0 && (
                    <YStack gap={12}>
                        <SectionHeader title={t('Shop.services')} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 12 }}>
                            {services.map((item) => (
                                <Pressable
                                    key={`${item.store.id}-${item.summary.id}`}
                                    onPress={() => openService(item)}
                                    accessibilityRole='button'
                                    accessibilityLabel={`${item.summary.name}, ${item.store.name}`}
                                    style={{ width: 168, borderRadius: radius.card, borderWidth: 1, borderColor: theme.borderColor.val, backgroundColor: theme.surface.val, overflow: 'hidden' }}
                                >
                                    <MediaImage uri={item.summary.imageUrl} seed={item.summary.name} height={92} radius={0} />
                                    <YStack padding={10} gap={3}>
                                        <UIText variant='captionStrong' numberOfLines={1} style={{ fontSize: 14 }}>
                                            {item.summary.name}
                                        </UIText>
                                        <UIText variant='caption' tone='secondary' numberOfLines={1}>
                                            {item.store.name}
                                        </UIText>
                                        <UIText variant='captionStrong' tone='brand' style={{ paddingTop: 2 }}>
                                            {t('Shop.bookATime')}
                                        </UIText>
                                    </YStack>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </YStack>
                )}

                {partners === null ? (
                    <YStack gap={10} paddingHorizontal={space.gutter}>
                        <Skeleton height={18} width={140} />
                        <Skeleton height={72} radius={radius.card} />
                        <Skeleton height={72} radius={radius.card} />
                    </YStack>
                ) : (
                    partners.length > 0 && (
                        <YStack gap={12}>
                            <SectionHeader title={t('Shop.partners')} actionLabel={t('Shop.allShops')} onAction={() => navigation.navigate('NetworkCategory')} />
                            <YStack paddingHorizontal={space.gutter} gap={4}>
                                {partners.map(({ summary }) => (
                                    <StoreCard key={summary.id ?? summary.name} store={summary} variant='compact' onPress={() => navigation.navigate('NetworkStore', { storeId: summary.id })} />
                                ))}
                            </YStack>
                        </YStack>
                    )
                )}
            </ScrollView>

            <CartPill count={cart.count} total={cart.total} storeName={cart.storeName} onPress={() => navigation.navigate('NetworkCartTab')} />
            <LocationSheet
                open={locationSheet}
                onClose={() => setLocationSheet(false)}
                savedLocations={savedLocations}
                current={currentLocation}
                onSelect={(place: any) => {
                    updateCurrentLocation(place);
                    setLocationSheet(false);
                }}
            />
        </YStack>
    );
};

export default NetworkShopHomeScreen;
