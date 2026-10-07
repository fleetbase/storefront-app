import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBagShopping, faChevronLeft, faChevronRight, faClock, faMagnifyingGlass, faMotorcycle } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import useCartSummary from '../../hooks/use-cart-summary';
import { formatCurrency } from '../../utils/format';
import { rememberStores } from '../../network/store-names';
import {
    Button,
    CartPill,
    ErrorState,
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
} from '../../ui';

const HERO_HEIGHT = 230;
/** Room above the sticky catalog bar for the floating back and search buttons. */
const STICKY_CLEARANCE = 54;
type Section = { id: string; name: string; products: Array<{ summary: ProductSummary; resource: any }> };

/**
 * A store inside a Network: hero, store details and status, a sticky catalog bar that
 * follows the scroll, the recommended rail and each catalog section. The way back to the
 * whole marketplace stays visible at the top.
 */
const NetworkStoreScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const { storefront } = useStorefront();
    const { enterStore, leaveStore, currentStore, ownerInfo, getSelectedStoreLocation, selectStoreLocation } = useStorefrontRuntime();
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
    const offsets = useRef<Record<string, number>>({});
    const catalogTop = useRef(0);
    const barTop = useRef(0);
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
    }, [storeData, storeId, storefront]);

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
                const categories = Array.from((await storefront.categories.query({ store: currentStore.id })) || []) as any[];
                const loaded = await Promise.all(
                    categories.map(async (category) => {
                        const products = Array.from((await storefront.products.query({ category: category.id, store: currentStore.id })) || []) as any[];
                        return { id: category.id, name: category.getAttribute('name'), products: products.map((resource) => ({ summary: productSummary(resource), resource })) };
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
    }, [currentStore, storeId, storefront, retry]);

    const store = useMemo(() => {
        if (!currentStore) return null;
        const data = typeof currentStore.serialize === 'function' ? currentStore.serialize() : currentStore;
        const hours = locations.map((location: any) => ({ hours: location.getAttribute?.('hours') ?? location.hours ?? [] }));
        return storeSummary({ ...data, locations: hours }, { t, hour12 });
    }, [currentStore, hour12, locations, t]);

    useEffect(() => {
        if (store) rememberStores([store]);
    }, [store]);

    const options = currentStore?.getAttribute?.('options') ?? {};
    const minimum = Number(options.required_checkout_min_amount) || 0;
    const closed = store?.muted ?? false;
    // Networks (and stores) can switch reviews off in the Console.
    const reviewsEnabled = ownerInfo?.options?.reviews_enabled !== false;
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
        const isStuck = event.nativeEvent.contentOffset.y >= barTop.current - 1;
        if (isStuck !== stuck) setStuck(isStuck);
        const y = event.nativeEvent.contentOffset.y - catalogTop.current + 60;
        let current = sections[0]?.id ?? null;
        for (const section of sections) {
            if ((offsets.current[section.id] ?? Infinity) <= y) current = section.id;
        }
        if (current !== activeTab) setActiveTab(current);
    };

    const jumpTo = (id: string) => {
        setActiveTab(id);
        scrollRef.current?.scrollTo({ y: catalogTop.current + (offsets.current[id] ?? 0) - 56, animated: true });
    };

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

    return (
        <YStack flex={1} backgroundColor='$background'>
            <ScrollView ref={scrollRef} stickyHeaderIndices={[1]} onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={{ paddingBottom: cart.count > 0 ? 110 : 40 }}>
                {/* The negative bottom margin lets the sticky bar's clearance overlap the details. It must
                    sit here, not on the bar: a margin on the bar shifts it inside its sticky wrapper. */}
                <YStack marginBottom={-(insets.top + STICKY_CLEARANCE) + 16}>
                    <MediaImage uri={store.backdropUrl} seed={store.name} height={HERO_HEIGHT + insets.top} radius={0} dimmed={closed} />
                    <YStack marginTop={-28} borderTopLeftRadius={radius.sheet} borderTopRightRadius={radius.sheet} backgroundColor='$background' paddingHorizontal={space.gutter} gap={12}>
                        <YStack marginTop={-36}>
                            <StoreLogo uri={store.logoUrl} name={store.name} size={72} radius={radius.card} border />
                        </YStack>
                        <YStack gap={4}>
                            <UIText variant='title' accessibilityRole='header'>
                                {store.name}
                            </UIText>
                            {!!store.description && <UIText tone='secondary'>{store.description}</UIText>}
                        </YStack>
                        <XStack flexWrap='wrap' alignItems='center' gap={12}>
                            {reviewsEnabled ? (
                                <Pressable onPress={() => navigation.navigate('StoreReviews', { storeId: store.id, storeName: store.name, storeLogo: store.logoUrl })} accessibilityRole='link' accessibilityLabel={t('Reviews.openFor', { store: store.name })} style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                            <Pressable onPress={() => navigation.navigate('StoreInfo', { store: currentStore.serialize() })} accessibilityRole='button' style={{ height: 30, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: theme.surface.val, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <UIText variant='captionStrong' tone='brand'>
                                    {t('Network.store.info')}
                                </UIText>
                                <FontAwesomeIcon icon={faChevronRight} size={11} color={theme.primaryForeground.val} />
                            </Pressable>
                        </XStack>
                        {closed && (
                            <XStack accessibilityRole='alert' gap={10} padding={12} borderRadius={radius.card} backgroundColor='$warningSoft'>
                                <FontAwesomeIcon icon={faClock} size={18} color={theme.warningForeground.val} />
                                <UIText variant='caption' flex={1}>
                                    <UIText variant='captionStrong'>{store.statusText}. </UIText>
                                    {t('Network.store.closedBody')}
                                </UIText>
                            </XStack>
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

                {/* Sticky catalog bar. Its spacer clears the floating buttons once stuck; until then it
                    overlaps the store details and stays transparent. */}
                <View
                    pointerEvents='box-none'
                    onLayout={(event) => {
                        barTop.current = event.nativeEvent.layout.y;
                        catalogTop.current = event.nativeEvent.layout.y + event.nativeEvent.layout.height;
                    }}
                >
                    <YStack height={insets.top + STICKY_CLEARANCE} backgroundColor={stuck ? '$background' : 'transparent'} pointerEvents='none' />
                    <YStack backgroundColor='$background' borderBottomWidth={1} borderColor='$borderColor'>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 20 }} accessibilityRole='tablist'>
                            {catalogLoading
                                ? [0, 1, 2].map((index) => <Skeleton key={index} width={80} height={14} style={{ marginVertical: 14 }} />)
                                : sections.map((section) => {
                                      const selected = section.id === activeTab;
                                      return (
                                          <Pressable key={section.id} onPress={() => jumpTo(section.id)} accessibilityRole='tab' accessibilityState={{ selected }} style={{ paddingVertical: 12, borderBottomWidth: 3, borderColor: selected ? theme.textPrimary.val : 'transparent' }}>
                                              <UIText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'primary' : 'secondary'} style={{ fontSize: 14 }}>
                                                  {section.name}
                                              </UIText>
                                          </Pressable>
                                      );
                                  })}
                        </ScrollView>
                    </YStack>
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
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 12 }}>
                                        {recommended.map((product) => (
                                            <ProductTile key={product.summary.id} product={product.summary} storeClosed={closed} onPress={() => openProduct(product)} />
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
            </ScrollView>

            <XStack position='absolute' top={insets.top + 10} left={space.gutter} right={space.gutter} justifyContent='space-between' zIndex={10}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    accessibilityRole='button'
                    accessibilityLabel={t('UI.backTo', { name: ownerInfo?.name ?? '' })}
                    style={{ height: 40, paddingLeft: 8, paddingRight: 14, borderRadius: radius.pill, backgroundColor: theme.background.val, flexDirection: 'row', alignItems: 'center', gap: 4, ...elevation.floating }}
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

            <CartPill count={cart.count} total={cart.total} storeName={cart.storeName} onPress={() => navigation.navigate('NetworkCartTab')} bottom={insets.bottom + 16} />
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
