import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faTruck } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useCartSummary from '../../hooks/use-cart-summary';
import useCustomerCoordinates from '../../hooks/use-customer-coordinates';
import useFoodTrucks from '../../hooks/use-food-trucks';
import { insideZone, summarizeTruck, truckProducts } from '../../commerce/food-trucks';
import { distanceMeters } from '../../network/map';
import { CartPill, EmptyState, MediaImage, OfflineNotice, ProductRow, UIText, formatDistance, productSummary, radius, space } from '../../ui';

/**
 * One truck's menu, laid out like a store page: the truck, whether it is live and serves
 * the customer's address, category tabs, and the products under each category. Products
 * open the shared product screen with the truck as the fulfilling location. An offline
 * truck, or one whose zone doesn't cover the customer, stays browsable but can't take orders.
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
    const items = useMemo(() => (truck ? truckProducts(truck) : []), [truck]);
    const sections = useMemo(() => {
        const groups = new Map<string, { id: string | null; name: string; products: any[] }>();
        items.forEach(({ product, categoryId, categoryName }) => {
            const key = categoryId ?? categoryName;
            if (!groups.has(key)) groups.set(key, { id: categoryId, name: categoryName || t('FoodTrucks.menu'), products: [] });
            groups.get(key)!.products.push(product);
        });
        return [...groups.values()];
    }, [items, t]);
    const [active, setActive] = useState<string | null>(params.categoryId ?? null);
    const scrollRef = useRef<ScrollView>(null);
    const offsets = useRef<Record<string, number>>({});

    if (!truck && loading) {
        return <YStack flex={1} backgroundColor='$background' />;
    }

    if (!truck) {
        return (
            <YStack flex={1} backgroundColor='$background' paddingTop={insets.top} justifyContent='center'>
                <EmptyState title={t('FoodTrucks.truckMissing')} actionLabel={t('FoodTrucks.back')} onAction={() => navigation.goBack()} />
            </YStack>
        );
    }

    const servesCustomer = !customer || !truck.zoneBorder.length || insideZone(customer, truck.zoneBorder);
    const ordering = truck.live && servesCustomer;
    const distance = customer && truck.coordinate ? formatDistance(distanceMeters(customer, truck.coordinate)) : null;
    const store = mode === 'network' ? truck.store : ownerInfo;
    const storeId = mode === 'network' ? truck.storeId : ownerInfo?.id;

    const openProduct = (product: any) =>
        navigation.navigate('Product', {
            product,
            productId: product?.id,
            store,
            storeId,
            storeLocationId: truck.id,
            unavailableReason: ordering ? null : !truck.live ? t('FoodTrucks.truckOfflineShort') : t('FoodTrucks.truckOutsideShort'),
        });

    const jump = (id: string | null, name: string) => {
        const key = id ?? name;
        setActive(key);
        const y = offsets.current[key];
        if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    };

    return (
        <YStack flex={1} backgroundColor='$background'>
            <OfflineNotice />
            <ScrollView
                ref={scrollRef}
                stickyHeaderIndices={sections.length > 1 ? [1] : undefined}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: cart.count > 0 ? 110 : 40 }}
                onLayout={() => {
                    if (params.categoryId && offsets.current[params.categoryId] != null) jump(params.categoryId, '');
                }}
            >
                <YStack paddingTop={insets.top + 8} paddingHorizontal={space.gutter} gap={12} paddingBottom={12}>
                    <Pressable onPress={() => navigation.goBack()} accessibilityRole='button' accessibilityLabel={t('FoodTrucks.back')} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface.val }}>
                        <FontAwesomeIcon icon={faArrowLeft} size={16} color={theme.textPrimary.val} />
                    </Pressable>
                    <XStack gap={12} alignItems='center'>
                        {truck.photoUrl ? (
                            <MediaImage uri={truck.photoUrl} seed={truck.name} width={64} height={64} radius={radius.tile} />
                        ) : (
                            <YStack width={64} height={64} borderRadius={radius.tile} backgroundColor={truck.live ? '$primary' : '$surface2'} alignItems='center' justifyContent='center'>
                                <FontAwesomeIcon icon={faTruck} size={24} color={truck.live ? theme.primaryText.val : theme.textSecondary.val} />
                            </YStack>
                        )}
                        <YStack flex={1} gap={3}>
                            <UIText variant='title' accessibilityRole='header' numberOfLines={2}>
                                {truck.name}
                            </UIText>
                            {mode === 'network' && !!truck.storeName && (
                                <UIText variant='caption' tone='secondary' numberOfLines={1}>
                                    {t('FoodTrucks.runBy', { store: truck.storeName })}
                                </UIText>
                            )}
                            <XStack alignItems='center' gap={6} flexWrap='wrap'>
                                <YStack width={8} height={8} borderRadius={4} backgroundColor={truck.live ? '$success' : '$textSecondary'} />
                                <UIText variant='captionStrong' tone={truck.live ? 'success' : 'secondary'}>
                                    {truck.live ? t('FoodTrucks.live') : t('FoodTrucks.offline')}
                                </UIText>
                                {[truck.zoneName, distance].filter(Boolean).map((part) => (
                                    <UIText key={String(part)} variant='caption' tone='secondary'>
                                        · {part}
                                    </UIText>
                                ))}
                            </XStack>
                        </YStack>
                    </XStack>
                    {!ordering && (
                        <YStack padding={12} borderRadius={radius.card} backgroundColor='$warningSoft' accessibilityRole='alert'>
                            <UIText variant='captionStrong' tone='warning'>
                                {!truck.live ? t('FoodTrucks.truckOfflineNotice') : t('FoodTrucks.truckOutsideNotice', { zone: truck.zoneName ?? '' })}
                            </UIText>
                        </YStack>
                    )}
                </YStack>

                {sections.length > 1 ? (
                    <YStack backgroundColor='$background' borderBottomWidth={1} borderColor='$borderColor'>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8, paddingVertical: 10 }} accessibilityRole='tablist'>
                            {sections.map((section) => {
                                const key = section.id ?? section.name;
                                const selected = active === key;
                                return (
                                    <Pressable
                                        key={key}
                                        onPress={() => jump(section.id, section.name)}
                                        accessibilityRole='tab'
                                        accessibilityState={{ selected }}
                                        style={{ height: 36, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: selected ? theme.primary.val : theme.surface.val }}
                                    >
                                        <UIText variant='captionStrong' style={{ color: selected ? theme.primaryText.val : theme.textPrimary.val }}>
                                            {section.name}
                                        </UIText>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </YStack>
                ) : (
                    <YStack />
                )}

                {sections.length === 0 ? (
                    <EmptyState title={t('FoodTrucks.menuEmpty')} description={t('FoodTrucks.menuEmptyBody')} />
                ) : (
                    sections.map((section) => {
                        const key = section.id ?? section.name;
                        return (
                            <YStack
                                key={key}
                                paddingHorizontal={space.gutter}
                                paddingTop={18}
                                onLayout={(event) => {
                                    offsets.current[key] = event.nativeEvent.layout.y;
                                }}
                            >
                                <UIText variant='heading' accessibilityRole='header'>
                                    {section.name}
                                </UIText>
                                {section.products.map((product) => {
                                    const summary = productSummary(product);
                                    return <ProductRow key={summary.id} product={summary} storeClosed={!ordering} onPress={() => openProduct(product)} />;
                                })}
                            </YStack>
                        );
                    })
                )}
            </ScrollView>
            <CartPill count={cart.count} total={cart.total} storeName={cart.storeName} onPress={() => navigation.navigate(mode === 'network' ? 'NetworkCartTab' : 'StoreCartTab')} bottom={28} />
        </YStack>
    );
};

export default TruckMenuScreen;
