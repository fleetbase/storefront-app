import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBoxOpen, faChevronLeft, faClock, faLocationDot, faMagnifyingGlass, faTruck } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useCartSummary from '../../hooks/use-cart-summary';
import useCustomerCoordinates from '../../hooks/use-customer-coordinates';
import useFoodTrucks from '../../hooks/use-food-trucks';
import { insideZone, summarizeTruck, truckProducts } from '../../commerce/food-trucks';
import { distanceMeters } from '../../network/map';
import { CartPill, EmptyState, IconButton, MediaImage, OfflineNotice, ProductRow, ProductTile, StoreLogo, UIText, formatDistance, productSummary, radius, space } from '../../ui';
import PlaceIcon from './PlaceIcon';

const HERO_HEIGHT = 200;
/** Room under the floating back button for the fixed category bar. */
const STICKY_CLEARANCE = 54;

type Section = { key: string; id: string | null; name: string; products: Array<{ product: any; summary: ReturnType<typeof productSummary> }> };

/**
 * One truck's products, laid out like a store page: a backdrop that stretches when pulled
 * down, the truck with its store, whether it is live and serves the customer's address, a
 * recommended row, and category tabs that stick under the back button and follow the
 * scroll. Products open the shared product screen with the truck as the fulfilling
 * location. An offline truck, or one whose zone doesn't cover the customer, stays
 * browsable but can't take orders.
 */
const TruckMenuScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const { mode, ownerInfo } = useStorefrontRuntime();
    const cart = useCartSummary();
    const { point: customer } = useCustomerCoordinates();
    const params = route.params ?? {};
    const { trucks, loading } = useFoodTrucks();
    // The live list keeps status and position fresh; the passed truck shows straight away.
    const truck = useMemo(() => trucks?.find((item) => item.id === params.foodTruckId) ?? (params.truck ? summarizeTruck(params.truck) : null), [params.foodTruckId, params.truck, trucks]);
    const sections = useMemo<Section[]>(() => {
        const groups = new Map<string, Section>();
        (truck ? truckProducts(truck) : []).forEach(({ product, categoryId, categoryName }) => {
            const key = String(categoryId ?? categoryName);
            if (!groups.has(key)) groups.set(key, { key, id: categoryId, name: categoryName || t('FoodTrucks.menu'), products: [] });
            groups.get(key)!.products.push({ product, summary: productSummary(product) });
        });
        return [...groups.values()];
    }, [t, truck]);
    const recommended = useMemo(() => sections.flatMap((section) => section.products).filter((item) => item.summary.recommended), [sections]);

    const stickyTop = insets.top + STICKY_CLEARANCE;
    const heroHeight = HERO_HEIGHT + insets.top;
    const scrollRef = useRef<ScrollView>(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const barTop = useRef(0);
    const barHeight = useRef(0);
    const catalogTop = useRef(0);
    const offsets = useRef<Record<string, number>>({});
    const [stuck, setStuck] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>(null);

    const jumpTo = (key: string) => {
        setActiveTab(key);
        scrollRef.current?.scrollTo({ y: catalogTop.current + (offsets.current[key] ?? 0) - stickyTop - barHeight.current, animated: true });
    };

    // Opened for a category (from the trucks map or search): jump to it once laid out.
    const handledJump = useRef<string | null>(null);
    useEffect(() => {
        const request = params.categoryId ? String(params.categoryId) : null;
        if (!request || handledJump.current === request || !sections.some((section) => section.key === request)) return;
        handledJump.current = request;
        const timer = setTimeout(() => jumpTo(request), 250);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.categoryId, sections]);

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = event.nativeEvent.contentOffset.y;
        const isStuck = offset >= barTop.current - stickyTop;
        if (isStuck !== stuck) setStuck(isStuck);
        const y = offset - catalogTop.current + stickyTop + barHeight.current + 1;
        let current = sections[0]?.key ?? null;
        for (const section of sections) {
            if ((offsets.current[section.key] ?? Infinity) <= y) current = section.key;
        }
        if (current !== activeTab) setActiveTab(current);
    };

    if (!truck && loading) {
        return <YStack flex={1} backgroundColor='$background' />;
    }

    if (!truck) {
        return (
            <YStack flex={1} backgroundColor='$background' paddingTop={insets.top} justifyContent='center'>
                <EmptyState icon={faTruck} title={t('FoodTrucks.truckMissing')} actionLabel={t('FoodTrucks.back')} onAction={() => navigation.goBack()} />
            </YStack>
        );
    }

    const servesCustomer = !customer || !truck.zoneBorder.length || insideZone(customer, truck.zoneBorder);
    const ordering = truck.live && servesCustomer;
    const distance = customer && truck.coordinate ? formatDistance(distanceMeters(customer, truck.coordinate)) : null;
    const store = mode === 'network' ? truck.store : ownerInfo;
    const storeId = mode === 'network' ? truck.storeId : ownerInfo?.id;
    const storeName = truck.storeName ?? ownerInfo?.name ?? null;
    const storeLogo = store?.logo_url ?? null;
    const backdrop = truck.photoUrl ?? store?.backdrop_url ?? null;

    const openProduct = (product: any) =>
        navigation.navigate('Product', {
            product,
            productId: product?.id,
            store,
            storeId,
            storeLocationId: truck.id,
            unavailableReason: ordering ? null : !truck.live ? t('FoodTrucks.truckOfflineShort') : t('FoodTrucks.truckOutsideShort'),
        });

    const categoryTabs = (
        <YStack backgroundColor='$background' borderBottomWidth={1} borderColor='$borderColor'>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 20 }} accessibilityRole='tablist'>
                {sections.map((section) => {
                    const selected = section.key === activeTab;
                    return (
                        <Pressable
                            key={section.key}
                            onPress={() => jumpTo(section.key)}
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
            </ScrollView>
        </YStack>
    );

    return (
        <YStack flex={1} backgroundColor='$background'>
            <OfflineNotice />
            <Animated.ScrollView
                ref={scrollRef as any}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true, listener: onScroll })}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: cart.count > 0 ? 110 : 40 }}
            >
                <YStack marginBottom={16}>
                    {/* Pulled past the top, the backdrop grows from its top edge instead of leaving a blank gap. */}
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
                            <MediaImage uri={backdrop} seed={truck.name} height={heroHeight} radius={0} dimmed={!ordering} />
                        </Animated.View>
                    </YStack>
                    <YStack marginTop={-28} borderTopLeftRadius={radius.sheet} borderTopRightRadius={radius.sheet} backgroundColor='$background' paddingHorizontal={space.gutter} gap={12}>
                        <YStack marginTop={-36}>
                            <PlaceIcon kind='truck' active={truck.live} size={72} floating />
                        </YStack>
                        <YStack gap={4}>
                            <UIText variant='title' accessibilityRole='header'>
                                {truck.name}
                            </UIText>
                            {!!storeName && (
                                <XStack alignItems='center' gap={8}>
                                    <StoreLogo uri={storeLogo} name={storeName} size={22} radius={6} />
                                    <UIText tone='secondary' numberOfLines={1}>
                                        {t('FoodTrucks.runBy', { store: storeName })}
                                    </UIText>
                                </XStack>
                            )}
                        </YStack>
                        <XStack flexWrap='wrap' alignItems='center' gap={12}>
                            <XStack alignItems='center' gap={6}>
                                <YStack width={8} height={8} borderRadius={4} backgroundColor={truck.live ? '$success' : '$textSecondary'} />
                                <UIText variant='captionStrong' tone={truck.live ? 'success' : 'secondary'}>
                                    {truck.live ? t('FoodTrucks.live') : t('FoodTrucks.offline')}
                                </UIText>
                            </XStack>
                            {!!distance && (
                                <UIText variant='caption' tone='secondary'>
                                    {distance}
                                </UIText>
                            )}
                        </XStack>
                        <XStack flexWrap='wrap' gap={8}>
                            {!!truck.zoneName && <InfoChip icon={faLocationDot} label={t('FoodTrucks.servesZone', { zone: truck.zoneName })} />}
                            <Pressable
                                onPress={() => navigation.navigate('FoodTruckSearch')}
                                accessibilityRole='search'
                                style={{ height: 30, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: theme.surface.val, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            >
                                <FontAwesomeIcon icon={faMagnifyingGlass} size={12} color={theme.primaryForeground.val} />
                                <UIText variant='captionStrong' tone='brand'>
                                    {t('FoodTrucks.searchShort')}
                                </UIText>
                            </Pressable>
                        </XStack>
                        {!ordering && (
                            <XStack accessibilityRole='alert' gap={10} padding={12} borderRadius={radius.card} backgroundColor='$warningSoft'>
                                <FontAwesomeIcon icon={faClock} size={18} color={theme.warningForeground.val} />
                                <UIText variant='caption' flex={1}>
                                    {!truck.live ? t('FoodTrucks.truckOfflineNotice') : t('FoodTrucks.truckOutsideNotice', { zone: truck.zoneName ?? '' })}
                                </UIText>
                            </XStack>
                        )}
                    </YStack>
                </YStack>

                {sections.length > 1 && (
                    <View
                        onLayout={(event) => {
                            barTop.current = event.nativeEvent.layout.y;
                            barHeight.current = event.nativeEvent.layout.height;
                            catalogTop.current = event.nativeEvent.layout.y + event.nativeEvent.layout.height;
                        }}
                    >
                        {categoryTabs}
                    </View>
                )}

                <YStack
                    onLayout={(event) => {
                        if (sections.length <= 1) catalogTop.current = event.nativeEvent.layout.y;
                    }}
                >
                    {sections.length === 0 ? (
                        <EmptyState icon={faBoxOpen} title={t('FoodTrucks.menuEmpty')} description={t('FoodTrucks.menuEmptyBody')} />
                    ) : (
                        <>
                            {recommended.length > 0 && (
                                <YStack paddingTop={18} gap={12}>
                                    <YStack paddingHorizontal={space.gutter}>
                                        <UIText variant='heading' accessibilityRole='header'>
                                            {t('Network.store.recommended')}
                                        </UIText>
                                    </YStack>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 12 }}>
                                        {recommended.map((item) => (
                                            <ProductTile key={`rec-${item.summary.id}`} product={item.summary} storeClosed={!ordering} onPress={() => openProduct(item.product)} />
                                        ))}
                                    </ScrollView>
                                </YStack>
                            )}
                            {sections.map((section) => (
                                <YStack
                                    key={section.key}
                                    paddingTop={24}
                                    paddingHorizontal={space.gutter}
                                    onLayout={(event) => {
                                        offsets.current[section.key] = event.nativeEvent.layout.y;
                                    }}
                                >
                                    <UIText variant='heading' accessibilityRole='header' style={{ marginBottom: 4 }}>
                                        {section.name}
                                    </UIText>
                                    {section.products.map((item) => (
                                        <ProductRow key={item.summary.id} product={item.summary} storeClosed={!ordering} onPress={() => openProduct(item.product)} />
                                    ))}
                                </YStack>
                            ))}
                        </>
                    )}
                </YStack>
            </Animated.ScrollView>

            {stuck && sections.length > 1 && (
                <YStack position='absolute' top={0} left={0} right={0} zIndex={5} paddingTop={stickyTop} backgroundColor='$background'>
                    {categoryTabs}
                </YStack>
            )}

            <XStack position='absolute' top={insets.top + 10} left={space.gutter} right={space.gutter} zIndex={10}>
                <IconButton icon={faChevronLeft} variant='floating' accessibilityLabel={t('FoodTrucks.back')} onPress={() => navigation.goBack()} />
            </XStack>

            <CartPill count={cart.count} total={cart.total} storeName={cart.storeName} onPress={() => navigation.navigate(mode === 'network' ? 'NetworkCartTab' : 'StoreCartTab')} bottom={28} />
        </YStack>
    );
};

function InfoChip({ icon, label }: { icon?: any; label: string }) {
    const theme = useTheme();
    return (
        <XStack height={30} paddingHorizontal={10} borderRadius={radius.pill} backgroundColor='$surface' alignItems='center' gap={6}>
            {icon && <FontAwesomeIcon icon={icon} size={12} color={theme.textPrimary.val} />}
            <UIText variant='captionStrong'>{label}</UIText>
        </XStack>
    );
}

export default TruckMenuScreen;
