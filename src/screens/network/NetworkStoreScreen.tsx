import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { effectiveOptions } from '../../hooks/use-storefront-info';
import { Animated, Pressable, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBagShopping, faBell, faChevronDown, faChevronLeft, faChevronRight, faClock, faLocationDot, faMagnifyingGlass, faMotorcycle, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import useCartSummary from '../../hooks/use-cart-summary';
import { formatCurrency } from '../../utils/format';
import { rememberStores } from '../../network/store-names';
import useCurrentLocation from '../../hooks/use-current-location';
import useSavedLocations from '../../hooks/use-saved-locations';
import useUnreadNotifications from '../../hooks/use-unread-notifications';
import { storefrontConfig } from '../../utils';
import {
    Button,
    CartPill,
    ErrorState,
    IconButton,
    LocationSheet,
    MediaImage,
    ProductRow,
    ProductTile,
    RatingLine,
    Skeleton,
    StoreLogo,
    UIText,
    elevation,
    productSummary,
    radius,
    space,
    storeSummary,
    usesTwelveHourClock,
    type ProductSummary,
    type ProductTileVariant,
} from '../../ui';

const HERO_HEIGHT = 230;
/** Room above the sticky catalog bar for the floating back and search buttons. */
const STICKY_CLEARANCE = 54;
type Section = { id: string; name: string; iconUrl: string | null; products: Array<{ summary: ProductSummary; resource: any }> };

/** Categories beyond which the sticky bar also offers the full category list. */
const CATALOG_LINK_AFTER = 5;

/**
 * The store page, shared by both editions: hero, store details and status, a sticky
 * catalog bar that follows the scroll, the recommended rail and each catalog section.
 *
 * In a Network it is a store inside the marketplace, and the way back to the whole
 * marketplace stays visible at the top. In a single store's app it is the home: the store
 * is the app's own, the top shows the delivery address and notifications, and the store's
 * brand settings (header, category display, product card style) apply.
 */
const NetworkStoreScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    // Where the fixed category bar sits: below the floating back and search buttons.
    const stickyTop = insets.top + STICKY_CLEARANCE;
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const { storefront } = useStorefront();
    const { mode, enterStore, leaveStore, currentStore, ownerInfo, getSelectedStoreLocation, selectStoreLocation } = useStorefrontRuntime();
    // A single store's app: this page is its home, for its own store.
    const single = mode !== 'network';
    // A single store's page is normally the home; it can also be pushed, e.g. from the food trucks map.
    const pushed = single && navigation.canGoBack();
    const { currentLocation, updateCurrentLocation } = useCurrentLocation();
    const { savedLocations } = useSavedLocations();
    const { count: unread } = useUnreadNotifications();
    const [locationSheet, setLocationSheet] = useState(false);
    const headerConfig = storefrontConfig('storeHeader', {}) || {};
    const categoryDisplay = storefrontConfig('storeCategoriesDisplay', 'pills');
    const cardStyle: ProductTileVariant = ['bordered', 'outlined', 'visio'].includes(storefrontConfig('productCardStyle')) ? storefrontConfig('productCardStyle') : 'outlined';
    const jumpRequest = route.params?.categoryId ?? null;
    const cart = useCartSummary();
    const hour12 = usesTwelveHourClock(locale);
    const storeData = route.params?.store;
    const storeId = route.params?.storeId || storeData?.id;

    const [resolving, setResolving] = useState(!storeData);
    const [resolveError, setResolveError] = useState<Error | null>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState<Error | null>(null);
    const [retry, setRetry] = useState(0);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const offsets = useRef<Record<string, number>>({});
    const catalogTop = useRef(0);
    const barTop = useRef(0);
    const barHeight = useRef(0);
    const [stuck, setStuck] = useState(false);

    // The runtime callbacks change identity whenever the stored store or location changes,
    // so the effects read them through a ref instead of re-running (and, for the resolve
    // effect, leaving the store it just entered).
    const runtime = useRef({ enterStore, leaveStore, getSelectedStoreLocation, selectStoreLocation });
    runtime.current = { enterStore, leaveStore, getSelectedStoreLocation, selectStoreLocation };

    // Resolve the store (from params or by id) and make it the current store.
    useEffect(() => {
        let active = true;
        (async () => {
            setResolveError(null);
            // A single store's app already has its store (the app's own).
            if (single) {
                setResolving(false);
                return;
            }
            if (storeData) {
                runtime.current.enterStore(storeData);
                setResolving(false);
                return;
            }
            if (!storefront || !storeId) {
                setResolveError(new Error('Missing store identifier'));
                setResolving(false);
                return;
            }
            setResolving(true);
            try {
                const result = await storefront.lookup(storeId);
                if (active) runtime.current.enterStore(result);
            } catch (lookupError: any) {
                if (active) setResolveError(lookupError);
            } finally {
                if (active) setResolving(false);
            }
        })();
        return () => {
            active = false;
            runtime.current.leaveStore();
        };
    }, [single, storeData, storeId, storefront]);

    // Locations (hours, addresses) and the catalog, once the store is known.
    useEffect(() => {
        if (!currentStore || !storefront || (storeId && currentStore.id !== storeId)) return;
        let active = true;
        setCatalogLoading(true);
        setCatalogError(null);
        currentStore
            .getLocations?.()
            .then((result: any) => {
                if (!active) return;
                const loaded = Array.from(result || []) as any[];
                setLocations(loaded);
                // Adding to the cart needs a store location: keep the customer's choice while it
                // still exists, otherwise default to the first.
                const selected = runtime.current.getSelectedStoreLocation(currentStore.id);
                if (loaded.length > 0 && !loaded.some((location) => location.id === selected?.id)) runtime.current.selectStoreLocation(currentStore.id, loaded[0]);
            })
            .catch(() => {});
        (async () => {
            try {
                const categories = Array.from((await (single ? storefront.categories.findAll() : storefront.categories.query({ store: currentStore.id }))) || []) as any[];
                const loaded = await Promise.all(
                    categories.map(async (category) => {
                        const products = Array.from((await storefront.products.query(single ? { category: category.id } : { category: category.id, store: currentStore.id })) || []) as any[];
                        return {
                            id: category.id,
                            name: category.getAttribute('name'),
                            iconUrl: category.getAttribute('icon_url') ?? null,
                            products: products.map((resource) => ({ summary: productSummary(resource), resource })),
                        };
                    })
                );
                if (!active) return;
                const nonEmpty = loaded.filter((section) => section.products.length > 0);
                setSections(nonEmpty);
                setActiveTab(nonEmpty[0]?.id ?? null);
            } catch (loadError: any) {
                if (active) setCatalogError(loadError);
            } finally {
                if (active) setCatalogLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [currentStore, single, storeId, storefront, retry]);

    const store = useMemo(() => {
        if (!currentStore) return null;
        const data = typeof currentStore.serialize === 'function' ? currentStore.serialize() : currentStore;
        const hours = locations.map((location: any) => ({ hours: location.getAttribute?.('hours') ?? location.hours ?? [] }));
        return storeSummary({ ...data, locations: hours }, { t, hour12 });
    }, [currentStore, hour12, locations, t]);

    useEffect(() => {
        if (store) rememberStores([store]);
    }, [store]);

    // In a Network its settings apply to its stores (minimum order, reviews...) and pickup is
    // the store's own; a single store's app uses the store's settings.
    const options = effectiveOptions(mode, ownerInfo?.options, single ? null : currentStore?.getAttribute?.('options'));
    const minimum = options.required_checkout_min === true ? Number(options.required_checkout_min_amount) || 0 : 0;
    const closed = store?.muted ?? false;
    // A Network shows reviews only when switched on; a single store unless switched off.
    const reviewsEnabled = single ? options.reviews_enabled !== false : options.reviews_enabled === true;
    const locationLine = [currentLocation?.getAttribute?.('name'), currentLocation?.getAttribute?.('street1')].filter(Boolean).join(' · ');
    const takesBookings = useMemo(() => sections.some((section) => section.products.some((product) => product.summary.isBookable)), [sections]);
    const recommended = useMemo(() => sections.flatMap((section) => section.products).filter((product) => product.summary.recommended), [sections]);

    const openProduct = useCallback(
        ({ resource }: { resource: any }) => {
            navigation.navigate('Product', {
                product: resource.serialize(),
                productId: resource.id,
                store: currentStore?.serialize?.(),
                storeId: currentStore?.id,
                storeLocationId: getSelectedStoreLocation(currentStore?.id)?.id,
            });
        },
        [currentStore, getSelectedStoreLocation, navigation]
    );

    const onSectionLayout = (id: string) => (event: LayoutChangeEvent) => {
        offsets.current[id] = event.nativeEvent.layout.y;
    };

    // Scroll-spy: the tab of the section under the sticky bar is the active one.
    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = event.nativeEvent.contentOffset.y;
        // The bar is stuck once it reaches the fixed copy's position, under the floating buttons.
        const isStuck = offset >= barTop.current - stickyTop;
        if (isStuck !== stuck) setStuck(isStuck);
        // A section is current once its top reaches the bottom of the fixed bar.
        const y = offset - catalogTop.current + stickyTop + barHeight.current + 1;
        let current = sections[0]?.id ?? null;
        for (const section of sections) {
            if ((offsets.current[section.id] ?? Infinity) <= y) current = section.id;
        }
        if (current !== activeTab) setActiveTab(current);
    };

    const jumpTo = (id: string) => {
        setActiveTab(id);
        scrollRef.current?.scrollTo({ y: catalogTop.current + (offsets.current[id] ?? 0) - stickyTop - barHeight.current, animated: true });
    };

    // Opened for a category (from the category list, search or a link): jump to its section
    // once the catalog has laid out.
    const handledJump = useRef<string | null>(null);
    useEffect(() => {
        if (!jumpRequest || catalogLoading || handledJump.current === jumpRequest) return;
        if (!sections.some((section) => section.id === jumpRequest)) return;
        handledJump.current = jumpRequest;
        const timer = setTimeout(() => jumpTo(jumpRequest), 250);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [catalogLoading, jumpRequest, sections]);

    const categoryTabs = (
        <YStack backgroundColor='$background' borderBottomWidth={1} borderColor='$borderColor'>
            <ScrollView
                showsVerticalScrollIndicator={false}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 20 }}
                accessibilityRole='tablist'
            >
                {catalogLoading
                    ? [0, 1, 2].map((index) => <Skeleton key={index} width={80} height={14} style={{ marginVertical: 14 }} />)
                    : sections.map((section) => {
                          const selected = section.id === activeTab;
                          return (
                              <Pressable
                                  key={section.id}
                                  onPress={() => jumpTo(section.id)}
                                  accessibilityRole='tab'
                                  accessibilityState={{ selected }}
                                  style={{ paddingVertical: 12, borderBottomWidth: 3, borderColor: selected ? theme.textPrimary.val : 'transparent' }}
                              >
                                  <UIText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'primary' : 'secondary'} style={{ fontSize: 14 }}>
                                      {section.name}
                                  </UIText>
                              </Pressable>
                          );
                      })}
                {single && !catalogLoading && sections.length > CATALOG_LINK_AFTER && (
                    <Pressable
                        onPress={() => navigation.navigate('StoreCatalog')}
                        accessibilityRole='link'
                        style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                        <FontAwesomeIcon icon={faTableCellsLarge} size={13} color={theme.primaryForeground.val} />
                        <UIText variant='captionStrong' tone='brand' style={{ fontSize: 14 }}>
                            {t('StorePage.allCategories')}
                        </UIText>
                    </Pressable>
                )}
            </ScrollView>
        </YStack>
    );

    // Until the requested store is the current one, keep the skeleton: a stale store from
    // an earlier visit must never flash, and entering a store lands on the next render.
    const pending = resolving || (!resolveError && (!currentStore || (!!storeId && currentStore.id !== storeId)));
    if (pending) {
        return <StoreSkeleton topInset={insets.top} />;
    }
    if (resolveError || !currentStore || !store) {
        return (
            <YStack flex={1} justifyContent='center' backgroundColor='$background'>
                <ErrorState title={t('Network.storeUnavailable')} description={t('Network.storeUnavailableBody', { network: ownerInfo?.name ?? '' })} />
                <YStack alignItems='center'>
                    <Button variant='outline' onPress={() => navigation.goBack()}>
                        {t('common.goBack')}
                    </Button>
                </YStack>
            </YStack>
        );
    }

    const heroHeight = HERO_HEIGHT + insets.top;

    return (
        <YStack flex={1} backgroundColor='$background'>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                ref={scrollRef as any}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true, listener: onScroll })}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: cart.count > 0 ? 110 : 40 }}
            >
                <YStack marginBottom={16}>
                    {/* Pulled past the top, the backdrop grows from its top edge to fill the space instead of leaving a blank gap. */}
                    <YStack height={heroHeight}>
                        <Animated.View
                            pointerEvents='none'
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: heroHeight,
                                transform: [
                                    { translateY: scrollY.interpolate({ inputRange: [-heroHeight, 0], outputRange: [-heroHeight / 2, 0], extrapolateRight: 'clamp' }) },
                                    { scale: scrollY.interpolate({ inputRange: [-heroHeight, 0], outputRange: [2, 1], extrapolateRight: 'clamp' }) },
                                ],
                            }}
                        >
                            <MediaImage uri={store.backdropUrl} seed={store.name} height={heroHeight} radius={0} dimmed={closed} />
                        </Animated.View>
                    </YStack>
                    <YStack marginTop={-28} borderTopLeftRadius={radius.sheet} borderTopRightRadius={radius.sheet} backgroundColor='$background' paddingHorizontal={space.gutter} gap={12}>
                        {(!single || headerConfig.showLogo !== false) && (
                            <YStack marginTop={-36}>
                                <StoreLogo uri={store.logoUrl} name={store.name} size={72} radius={radius.card} border />
                            </YStack>
                        )}
                        <YStack gap={4} paddingTop={single && headerConfig.showLogo === false ? 16 : 0}>
                            {(!single || headerConfig.showTitle !== false) && (
                                <UIText variant='title' accessibilityRole='header'>
                                    {store.name}
                                </UIText>
                            )}
                            {!!store.description && (!single || headerConfig.showDescription !== false) && <UIText tone='secondary'>{store.description}</UIText>}
                        </YStack>
                        <XStack flexWrap='wrap' alignItems='center' gap={12}>
                            {reviewsEnabled ? (
                                <Pressable
                                    onPress={() => navigation.navigate('StoreReviews', { storeId: store.id, storeName: store.name, storeLogo: store.logoUrl })}
                                    accessibilityRole='link'
                                    accessibilityLabel={t('Reviews.openFor', { store: store.name })}
                                    style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                >
                                    <RatingLine rating={store.rating} size={15} />
                                    <UIText variant='captionStrong' tone='secondary' style={{ textDecorationLine: 'underline' }}>
                                        {t('Reviews.title')}
                                    </UIText>
                                </Pressable>
                            ) : (
                                <RatingLine rating={store.rating} size={15} />
                            )}
                            {!!(store.category || store.distance) && (
                                <UIText variant='caption' tone='secondary'>
                                    {[store.category, store.distance].filter(Boolean).join(' · ')}
                                </UIText>
                            )}
                            {!!store.statusText && (
                                <UIText variant='captionStrong' tone={closed ? 'warning' : 'success'}>
                                    {store.statusText}
                                </UIText>
                            )}
                        </XStack>
                        <XStack flexWrap='wrap' gap={8}>
                            <InfoChip icon={faMotorcycle} label={t('Network.store.delivery')} />
                            {options.pickup_enabled === true && <InfoChip icon={faBagShopping} label={t('Network.store.pickup')} />}
                            {minimum > 0 && <InfoChip label={t('Network.store.minimum', { amount: formatCurrency(minimum, currentStore.getAttribute('currency') ?? 'USD') })} />}
                            <Pressable
                                onPress={() => {
                                    // Store Info shows the hours of one location: the one orders go to, else the first.
                                    const location = getSelectedStoreLocation(currentStore.id) ?? locations[0];
                                    navigation.navigate('StoreInfo', { store: currentStore.serialize(), storeLocation: location?.serialize?.() ?? location ?? null });
                                }}
                                accessibilityRole='button'
                                style={{
                                    height: 30,
                                    paddingHorizontal: 10,
                                    borderRadius: radius.pill,
                                    backgroundColor: theme.surface.val,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                <UIText variant='captionStrong' tone='brand'>
                                    {t('Network.store.info')}
                                </UIText>
                                <FontAwesomeIcon icon={faChevronRight} size={11} color={theme.primaryForeground.val} />
                            </Pressable>
                        </XStack>
                        {single && (
                            <Pressable
                                onPress={() => navigation.navigate('StoreSearchTab')}
                                accessibilityRole='search'
                                accessibilityLabel={t('StorePage.searchStore', { store: store.name })}
                                style={{ height: 48, paddingHorizontal: 14, borderRadius: radius.button, backgroundColor: theme.surface.val, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                            >
                                <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={theme.textSecondary.val} />
                                <UIText tone='placeholder'>{t('StorePage.searchStore', { store: store.name })}</UIText>
                            </Pressable>
                        )}
                        {closed && (
                            <XStack accessibilityRole='alert' gap={10} padding={12} borderRadius={radius.card} backgroundColor='$warningSoft'>
                                <FontAwesomeIcon icon={faClock} size={18} color={theme.warningForeground.val} />
                                <UIText variant='caption' flex={1}>
                                    <UIText variant='captionStrong'>{store.statusText}. </UIText>
                                    {t('Network.store.closedBody')}
                                </UIText>
                            </XStack>
                        )}
                        {single && categoryDisplay === 'grid' && !catalogLoading && sections.length > 1 && (
                            <YStack gap={10} paddingTop={4}>
                                <UIText variant='heading' accessibilityRole='header'>
                                    {t('StorePage.shopByCategory')}
                                </UIText>
                                <XStack flexWrap='wrap' gap={10}>
                                    {sections.slice(0, 8).map((section) => (
                                        <Pressable
                                            key={section.id}
                                            onPress={() => jumpTo(section.id)}
                                            accessibilityRole='button'
                                            style={{ width: '22%', flexGrow: 1, minHeight: 84, paddingVertical: 10, paddingHorizontal: 4, borderRadius: radius.tile, backgroundColor: theme.surface.val, alignItems: 'center', gap: 6 }}
                                        >
                                            <MediaImage uri={section.iconUrl} seed={section.name} width={40} height={40} radius={20} />
                                            <UIText variant='captionStrong' textAlign='center' numberOfLines={2} style={{ fontSize: 12, lineHeight: 15 }}>
                                                {section.name}
                                            </UIText>
                                        </Pressable>
                                    ))}
                                </XStack>
                            </YStack>
                        )}
                        {takesBookings && (
                            <XStack gap={8} padding={12} borderRadius={radius.card} backgroundColor='$primarySoft' accessibilityRole='list' accessibilityLabel={t('Booking.howItWorks')}>
                                {[t('Booking.stepPick'), t('Booking.stepTime'), t('Booking.stepPay')].map((text, index) => (
                                    <YStack key={text} flex={1} gap={4} accessibilityRole='text'>
                                        <YStack width={24} height={24} borderRadius={12} backgroundColor='$primary' alignItems='center' justifyContent='center'>
                                            <UIText variant='captionStrong' tone='onPrimary'>
                                                {index + 1}
                                            </UIText>
                                        </YStack>
                                        <UIText variant='captionStrong' style={{ fontSize: 12, lineHeight: 16 }}>
                                            {text}
                                        </UIText>
                                    </YStack>
                                ))}
                            </XStack>
                        )}
                    </YStack>
                </YStack>

                {/* The category bar. Once it scrolls under the floating buttons, a fixed copy takes
                    its place at the top (see below). Nothing overlaps the store details, so every
                    control in them stays tappable. */}
                <View
                    onLayout={(event) => {
                        barTop.current = event.nativeEvent.layout.y;
                        barHeight.current = event.nativeEvent.layout.height;
                        catalogTop.current = event.nativeEvent.layout.y + event.nativeEvent.layout.height;
                    }}
                >
                    {categoryTabs}
                </View>

                <YStack>
                    {catalogLoading ? (
                        <YStack paddingHorizontal={space.gutter} paddingTop={16} gap={16}>
                            {[0, 1, 2, 3].map((index) => (
                                <XStack key={index} gap={14}>
                                    <YStack flex={1} gap={8}>
                                        <Skeleton height={14} width='60%' />
                                        <Skeleton height={12} width='90%' />
                                        <Skeleton height={14} width='25%' />
                                    </YStack>
                                    <Skeleton width={96} height={96} radius={radius.tile} />
                                </XStack>
                            ))}
                        </YStack>
                    ) : catalogError ? (
                        <ErrorState onRetry={() => setRetry((value) => value + 1)} />
                    ) : sections.length === 0 ? (
                        <UIText tone='secondary' textAlign='center' style={{ marginTop: 32, paddingHorizontal: 32 }}>
                            {t('Network.store.emptyCatalog')}
                        </UIText>
                    ) : (
                        <>
                            {recommended.length > 0 && (
                                <YStack paddingTop={18} gap={12}>
                                    <YStack paddingHorizontal={space.gutter}>
                                        <UIText variant='heading' accessibilityRole='header'>
                                            {t('Network.store.recommended')}
                                        </UIText>
                                    </YStack>
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 12 }}
                                    >
                                        {recommended.map((product) => (
                                            <ProductTile key={product.summary.id} product={product.summary} storeClosed={closed} variant={single ? cardStyle : 'outlined'} onPress={() => openProduct(product)} />
                                        ))}
                                    </ScrollView>
                                </YStack>
                            )}
                            {sections.map((section) => (
                                <YStack key={section.id} paddingTop={24} paddingHorizontal={space.gutter} onLayout={onSectionLayout(section.id)}>
                                    <UIText variant='heading' accessibilityRole='header' style={{ marginBottom: 4 }}>
                                        {section.name}
                                    </UIText>
                                    {section.products.map((product) => (
                                        <ProductRow key={product.summary.id} product={product.summary} storeClosed={closed} onPress={() => openProduct(product)} />
                                    ))}
                                </YStack>
                            ))}
                        </>
                    )}
                </YStack>
            </Animated.ScrollView>

            {stuck && (
                <YStack position='absolute' top={0} left={0} right={0} zIndex={5} paddingTop={stickyTop} backgroundColor='$background'>
                    {categoryTabs}
                </YStack>
            )}

            {single ? (
                // A single store's home: where orders are delivered, and notifications.
                <XStack position='absolute' top={insets.top + 10} left={space.gutter} right={space.gutter} alignItems='center' justifyContent='space-between' gap={10} zIndex={10}>
                    {pushed ? (
                        // Opened from another screen (e.g. the food trucks map): a way back.
                        <IconButton icon={faChevronLeft} variant='floating' accessibilityLabel={t('common.goBack')} onPress={() => navigation.goBack()} />
                    ) : headerConfig.showLocationPicker !== false ? (
                        <Pressable
                            onPress={() => setLocationSheet(true)}
                            accessibilityRole='button'
                            accessibilityLabel={locationLine ? t('Network.changeLocation', { place: locationLine }) : t('Network.setLocation')}
                            style={{
                                maxWidth: '82%',
                                height: 40,
                                paddingHorizontal: 12,
                                borderRadius: radius.pill,
                                backgroundColor: theme.background.val,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                ...elevation.floating,
                            }}
                        >
                            <FontAwesomeIcon icon={faLocationDot} size={14} color={theme.primaryForeground.val} />
                            <UIText variant='captionStrong' style={{ flexShrink: 1 }} numberOfLines={1}>
                                {locationLine || t('Network.setLocation')}
                            </UIText>
                            <FontAwesomeIcon icon={faChevronDown} size={11} color={theme.textPrimary.val} />
                        </Pressable>
                    ) : (
                        <YStack />
                    )}
                    <IconButton
                        icon={faBell}
                        variant='floating'
                        badge={unread > 0 ? (unread > 9 ? '9+' : String(unread)) : undefined}
                        accessibilityLabel={unread > 0 ? t('Notifications.bellUnread', { count: unread }) : t('Notifications.title')}
                        onPress={() => navigation.navigate('Notifications')}
                    />
                </XStack>
            ) : (
                <XStack position='absolute' top={insets.top + 10} left={space.gutter} right={space.gutter} justifyContent='space-between' zIndex={10}>
                    <Pressable
                        onPress={() => navigation.goBack()}
                        accessibilityRole='button'
                        accessibilityLabel={t('UI.backTo', { name: ownerInfo?.name ?? '' })}
                        style={{
                            height: 40,
                            paddingLeft: 8,
                            paddingRight: 14,
                            borderRadius: radius.pill,
                            backgroundColor: theme.background.val,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            ...elevation.floating,
                        }}
                    >
                        <FontAwesomeIcon icon={faChevronLeft} size={16} color={theme.textPrimary.val} />
                        <UIText variant='captionStrong' numberOfLines={1} style={{ maxWidth: 200 }}>
                            {ownerInfo?.name}
                        </UIText>
                    </Pressable>
                    <Pressable
                        onPress={() => navigation.navigate('NetworkSearchTab')}
                        accessibilityRole='button'
                        accessibilityLabel={t('Network.directory.search', { name: store.name })}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.background.val, alignItems: 'center', justifyContent: 'center', ...elevation.floating }}
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={theme.textPrimary.val} />
                    </Pressable>
                </XStack>
            )}

            {/* The tab bar below already clears the home indicator, so no safe-area inset here. */}
            <CartPill count={cart.count} total={cart.total} storeName={cart.storeName} onPress={() => navigation.navigate(single ? 'StoreCartTab' : 'NetworkCartTab')} bottom={28} />
            {single && (
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
            )}
        </YStack>
    );
};

function InfoChip({ icon, label }: { icon?: any; label: string }) {
    const theme = useTheme();
    return (
        <XStack height={30} paddingHorizontal={10} borderRadius={radius.pill} backgroundColor='$surface' alignItems='center' gap={6}>
            {icon && <FontAwesomeIcon icon={icon} size={13} color={theme.textPrimary.val} />}
            <UIText variant='captionStrong'>{label}</UIText>
        </XStack>
    );
}

function StoreSkeleton({ topInset }: { topInset: number }) {
    return (
        <YStack flex={1} backgroundColor='$background'>
            <Skeleton height={HERO_HEIGHT + topInset} radius={0} />
            <YStack padding={space.gutter} gap={12}>
                <Skeleton width={72} height={72} radius={radius.card} style={{ marginTop: -50 }} />
                <Skeleton height={22} width='55%' />
                <Skeleton height={14} width='80%' />
                <Skeleton height={14} width='40%' />
            </YStack>
        </YStack>
    );
}

export default NetworkStoreScreen;
