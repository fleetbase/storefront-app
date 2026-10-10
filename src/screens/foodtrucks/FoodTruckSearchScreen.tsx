import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Product } from '@fleetbase/storefront';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useStorefront from '../../hooks/use-storefront';
import useFoodTrucks, { type TruckPin } from '../../hooks/use-food-trucks';
import { truckProducts } from '../../commerce/food-trucks';
import { serializeSdkResource } from '../../network/network-runtime';
import { formatCurrency } from '../../utils/format';
import { EmptyState, ErrorState, MediaImage, OfflineNotice, Skeleton, UIText, productSummary, radius, space, type ProductSummary } from '../../ui';

type From = 'all' | 'trucks' | 'stores';
type Result = { key: string; kind: 'truck' | 'store'; summary: ProductSummary; product: any; fulfiller: string; orderable: boolean; truck?: TruckPin; store?: any };

const DEBOUNCE_MS = 300;

/**
 * Search across what the trucks near the customer serve and what the stores sell. Each
 * result names who fulfils it (the truck and how far it is, or the store); items from a
 * truck that is offline or doesn't serve the customer's zone are shown but can't be ordered.
 */
const FoodTruckSearchScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const { storefront } = useStorefront();
    const { mode, ownerInfo } = useStorefrontRuntime();
    const { trucks } = useFoodTrucks();
    const [query, setQuery] = useState('');
    const [from, setFrom] = useState<From>('all');
    const [storeResults, setStoreResults] = useState<Result[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [retry, setRetry] = useState(0);
    const latest = useRef(0);
    const trimmed = query.trim();

    const truckResults = useMemo<Result[]>(() => {
        if (!trimmed || !trucks) return [];
        const needle = trimmed.toLowerCase();
        return trucks.flatMap((truck) =>
            truckProducts(truck)
                .filter(({ product, categoryName }) => [product?.name, product?.description, categoryName, truck.name].some((text) => String(text ?? '').toLowerCase().includes(needle)))
                .map(({ product }) => {
                    const orderable = truck.live && truck.inZone;
                    const where = !truck.live ? t('FoodTrucks.offline') : !truck.inZone ? t('FoodTrucks.notHere', { zone: truck.zoneName ?? '' }) : truck.distance;
                    return { key: `truck-${truck.id}-${product?.id}`, kind: 'truck' as const, summary: productSummary(product), product, fulfiller: [truck.name, where].filter(Boolean).join(' · '), orderable, truck };
                })
        );
    }, [t, trimmed, trucks]);

    useEffect(() => {
        if (!trimmed || !storefront) {
            setStoreResults(null);
            setLoading(false);
            setFailed(false);
            return;
        }
        setLoading(true);
        setFailed(false);
        const request = ++latest.current;
        const timer = setTimeout(async () => {
            try {
                const found = await storefront.search(trimmed, mode === 'network' ? { with_store: true, limit: 30 } : { store: ownerInfo?.id });
                if (request !== latest.current) return;
                setStoreResults(
                    (Array.from(found || []) as any[]).map((item) => {
                        const resource = new Product(serializeSdkResource(item), storefront.getAdapter());
                        const summary = productSummary(resource);
                        const store = mode === 'network' ? (resource.getAttribute('store') ?? null) : ownerInfo;
                        return { key: `store-${summary.id}`, kind: 'store' as const, summary, product: resource.serialize(), fulfiller: summary.storeName || store?.name || ownerInfo?.name || '', orderable: true, store };
                    })
                );
            } catch {
                if (request === latest.current) setFailed(true);
            } finally {
                if (request === latest.current) setLoading(false);
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [mode, ownerInfo, retry, storefront, trimmed]);

    const all = useMemo(() => [...truckResults.filter((item) => item.orderable), ...(storeResults ?? []), ...truckResults.filter((item) => !item.orderable)], [storeResults, truckResults]);
    const counts = { all: all.length, trucks: truckResults.length, stores: storeResults?.length ?? 0 };
    const visible = all.filter((item) => from === 'all' || (from === 'trucks' ? item.kind === 'truck' : item.kind === 'store'));
    const firstSearch = loading && storeResults === null && truckResults.length === 0;

    const open = (item: Result) => {
        if (item.kind === 'truck' && item.truck) {
            const truck = item.truck;
            navigation.navigate('Product', {
                product: item.product,
                productId: item.summary.id,
                store: mode === 'network' ? truck.store : ownerInfo,
                storeId: mode === 'network' ? truck.storeId : ownerInfo?.id,
                storeLocationId: truck.id,
                unavailableReason: item.orderable ? null : !truck.live ? t('FoodTrucks.truckOfflineShort') : t('FoodTrucks.truckOutsideShort'),
            });
            return;
        }
        navigation.navigate('Product', { product: item.product, productId: item.summary.id, store: item.store, storeId: item.store?.id ?? item.summary.storeId });
    };

    const renderItem = ({ item }: { item: Result }) => {
        const { summary } = item;
        const currency = summary.currency ?? 'USD';
        const price = formatCurrency(summary.onSale && summary.salePrice !== null ? summary.salePrice : summary.price, currency);
        return (
            <Pressable
                onPress={() => open(item)}
                accessibilityRole='button'
                accessibilityLabel={[summary.name, price, item.fulfiller].filter(Boolean).join(', ')}
                style={({ pressed }) => ({ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.card, borderWidth: 1, borderColor: theme.borderColor.val, opacity: item.orderable ? (pressed ? 0.85 : 1) : 0.55 })}
            >
                <MediaImage uri={summary.imageUrl} seed={summary.name} width={56} height={56} radius={radius.tile} />
                <YStack flex={1} minWidth={0} gap={3}>
                    <XStack alignItems='center' gap={6}>
                        <UIText variant='bodyStrong' numberOfLines={1} style={{ flexShrink: 1 }}>
                            {summary.name}
                        </UIText>
                        {summary.onSale && (
                            <YStack paddingHorizontal={6} borderRadius={radius.pill} backgroundColor='$errorSoft'>
                                <UIText variant='captionStrong' tone='error' style={{ fontSize: 11 }}>
                                    {t('FoodTrucks.sale')}
                                </UIText>
                            </YStack>
                        )}
                    </XStack>
                    <UIText variant='caption' tone={item.orderable ? 'secondary' : 'warning'} numberOfLines={1}>
                        {item.fulfiller}
                    </UIText>
                    <XStack gap={6} alignItems='baseline'>
                        <UIText variant='bodyStrong' tone={summary.onSale ? 'error' : 'primary'}>
                            {price}
                        </UIText>
                        {summary.onSale && (
                            <UIText variant='caption' tone='secondary' style={{ textDecorationLine: 'line-through' }}>
                                {formatCurrency(summary.price, currency)}
                            </UIText>
                        )}
                    </XStack>
                </YStack>
            </Pressable>
        );
    };

    return (
        <YStack flex={1} backgroundColor='$background'>
            <OfflineNotice />
            <YStack paddingTop={insets.top + 8} paddingHorizontal={space.gutter} paddingBottom={10} gap={10}>
                <XStack alignItems='center' gap={10}>
                    <XStack flex={1} height={48} paddingLeft={14} paddingRight={6} borderRadius={radius.button} borderWidth={2} borderColor='$primary' alignItems='center' gap={10}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} size={16} color={theme.textSecondary.val} />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            autoFocus
                            returnKeyType='search'
                            placeholder={t('FoodTrucks.searchPlaceholder')}
                            placeholderTextColor={theme.textPlaceholder?.val ?? theme.textSecondary.val}
                            accessibilityLabel={t('FoodTrucks.searchPlaceholder')}
                            style={{ flex: 1, minWidth: 0, height: '100%', fontSize: 16, color: theme.textPrimary.val }}
                        />
                        {query.length > 0 && (
                            <Pressable onPress={() => setQuery('')} accessibilityRole='button' accessibilityLabel={t('FoodTrucks.clearSearch')} hitSlop={6} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface.val }}>
                                <FontAwesomeIcon icon={faXmark} size={13} color={theme.textPrimary.val} />
                            </Pressable>
                        )}
                    </XStack>
                    <Pressable onPress={() => navigation.goBack()} accessibilityRole='button' style={{ minHeight: 44, justifyContent: 'center' }}>
                        <UIText variant='bodyStrong' tone='brand'>
                            {t('FoodTrucks.cancel')}
                        </UIText>
                    </Pressable>
                </XStack>
                {!!trimmed && !firstSearch && (
                    <XStack gap={8} accessibilityRole='radiogroup' accessibilityLabel={t('FoodTrucks.showResultsFrom')}>
                        {(['all', 'trucks', 'stores'] as From[]).map((value) => {
                            const selected = from === value;
                            return (
                                <Pressable
                                    key={value}
                                    onPress={() => setFrom(value)}
                                    accessibilityRole='radio'
                                    accessibilityState={{ selected }}
                                    style={{ height: 34, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center', borderWidth: 1, borderColor: selected ? theme.primary.val : theme.borderColor.val, backgroundColor: selected ? theme.primary.val : theme.background.val }}
                                >
                                    <UIText variant='captionStrong' style={{ color: selected ? theme.primaryText.val : theme.textPrimary.val }}>
                                        {`${t(`FoodTrucks.layer.${value}`)} · ${counts[value]}`}
                                    </UIText>
                                </Pressable>
                            );
                        })}
                    </XStack>
                )}
            </YStack>
            {!trimmed ? (
                <EmptyState title={t('FoodTrucks.searchIntro')} description={t('FoodTrucks.searchIntroBody')} />
            ) : firstSearch ? (
                <YStack paddingHorizontal={space.gutter} gap={10} accessibilityLabel={t('FoodTrucks.searching')}>
                    {[0, 1, 2, 3].map((index) => (
                        <Skeleton key={index} height={84} radius={radius.card} />
                    ))}
                </YStack>
            ) : failed && visible.length === 0 ? (
                <ErrorState onRetry={() => setRetry((value) => value + 1)} />
            ) : visible.length === 0 && !loading ? (
                <EmptyState title={t('FoodTrucks.noMatches', { query: trimmed })} description={t('FoodTrucks.noMatchesBody')} actionLabel={t('FoodTrucks.browseCategories')} onAction={() => navigation.goBack()} />
            ) : (
                <FlatList
                    data={visible}
                    keyExtractor={(item) => item.key}
                    renderItem={renderItem}
                    keyboardShouldPersistTaps='handled'
                    keyboardDismissMode='on-drag'
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 40, gap: 10 }}
                />
            )}
        </YStack>
    );
};

export default FoodTruckSearchScreen;
