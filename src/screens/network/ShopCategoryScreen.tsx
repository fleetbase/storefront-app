import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBasketShopping, faChevronLeft, faMagnifyingGlass, faTag } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import useStorefront from '../../hooks/use-storefront';
import useCartSummary from '../../hooks/use-cart-summary';
import useMainStore from '../../network/use-main-store';
import { categoryIndex, categoryTree, descendantIds, type CategoryNode } from '../../commerce/categories';
import { fetchOffers, offerTargets, offersForProduct, type Offer } from '../../commerce/offers';
import { useOfferBadge } from '../../components/offers/OfferCard';
import { CartPill, Chip, EmptyState, ErrorState, IconButton, ProductTile, Skeleton, UIText, productSummary, radius, space, type ProductSummary } from '../../ui';

type Item = { summary: ProductSummary; resource: any };

/** A category and those above it, nearest first. */
function lineage(index: Map<string, CategoryNode>, id: string | null | undefined): string[] {
    const ids: string[] = [];
    let node = id ? index.get(id) : undefined;
    while (node && ids.length < 6) {
        ids.push(node.id);
        node = node.parentId ? index.get(node.parentId) : undefined;
    }
    return ids.length ? ids : id ? [id] : [];
}

/**
 * One category of the Network's main store on its own: its products (with those of every
 * category under it), chips to narrow to a subcategory, and the offers aimed at it.
 */
const ShopCategoryScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const { t } = useLanguage();
    const { storefront } = useStorefront();
    const cart = useCartSummary();
    const offerBadge = useOfferBadge();
    const main = useMainStore();
    const categoryId: string = route.params?.categoryId;
    const storeId: string | null = route.params?.storeId ?? main.store?.id ?? null;

    const [index, setIndex] = useState<Map<string, CategoryNode>>(new Map());
    const [selected, setSelected] = useState<string>(categoryId);
    const [items, setItems] = useState<Item[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [attempt, setAttempt] = useState(0);

    const node = index.get(categoryId) ?? null;
    const title = node?.name ?? route.params?.name ?? '';
    const subcategories = node?.children ?? [];

    // The store's categories, for the subcategory chips and to match offers by category.
    useEffect(() => {
        if (!storefront || !storeId) return;
        let active = true;
        storefront.categories
            .query({ store: storeId })
            .then((result: any) => active && setIndex(categoryIndex(categoryTree(Array.from(result || [])))))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [storefront, storeId]);

    useEffect(() => {
        const adapter = storefront?.getAdapter?.();
        if (!adapter) return;
        fetchOffers((path, query) => adapter.get(path, query), { includeScheduled: false })
            .then((list) => setOffers(list.filter((offer) => offer.availability === 'live')))
            .catch(() => setOffers([]));
    }, [storefront, attempt]);

    useEffect(() => {
        if (!storefront || !storeId || !selected) return;
        let active = true;
        setError(null);
        storefront.products
            .query({ store: storeId, category: selected })
            .then((result: any) => {
                if (!active) return;
                const resources = Array.from(result || []) as any[];
                setItems(resources.map((resource) => ({ summary: productSummary(resource), resource })));
            })
            .catch((loadError: Error) => active && setError(loadError))
            .finally(() => {
                if (!active) return;
                setLoading(false);
                setRefreshing(false);
            });
        return () => {
            active = false;
        };
    }, [attempt, selected, storeId, storefront]);

    const select = (id: string) => {
        if (id === selected) return;
        setLoading(true);
        setSelected(id);
    };

    // Offers aimed at this category, at one above or under it, or at a product shown here.
    const categoryOffers = useMemo(() => {
        const related = node ? [...descendantIds(node), ...lineage(index, node.parentId)] : [categoryId];
        const productIds = items.map((item) => item.summary.id).filter(Boolean) as string[];
        return offers.filter((offer) => offerTargets(offer, { categoryIds: related, productIds }));
    }, [categoryId, index, items, node, offers]);

    const offerLabel = useCallback(
        (item: Item) => {
            const productCategory = item.resource?.getAttribute?.('category') ?? null;
            const matched = offersForProduct(offers, item.summary.id, lineage(index, typeof productCategory === 'string' ? productCategory : productCategory?.id));
            return matched[0] ? offerBadge(matched[0]) : null;
        },
        [index, offerBadge, offers]
    );

    const openProduct = (item: Item) =>
        navigation.navigate('Product', {
            product: item.resource.serialize(),
            productId: item.summary.id,
            storeId,
            store: main.store?.serialize?.(),
            storeLocationId: main.locationId,
        });

    const tileWidth = Math.floor((width - space.gutter * 2 - 12) / 2);

    return (
        <YStack flex={1} backgroundColor='$background'>
            <XStack alignItems='center' gap={4} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={6}>
                <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                <UIText variant='heading' accessibilityRole='header' numberOfLines={1} style={{ flex: 1 }}>
                    {title}
                </UIText>
                <IconButton icon={faMagnifyingGlass} variant='plain' size={44} accessibilityLabel={t('Shop.search')} onPress={() => navigation.navigate('NetworkSearchTab')} />
            </XStack>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: cart.count > 0 ? 110 : 40, gap: 14 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            setAttempt((value) => value + 1);
                        }}
                    />
                }
            >
                {subcategories.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8 }} accessibilityLabel={t('Shop.subcategories', { name: title })}>
                        <Chip label={t('Shop.all')} selected={selected === categoryId} onPress={() => select(categoryId)} />
                        {subcategories.map((child) => (
                            <Chip key={child.id} label={child.name} selected={selected === child.id} onPress={() => select(child.id)} />
                        ))}
                    </ScrollView>
                )}

                {categoryOffers.map((offer) => (
                    <Pressable
                        key={offer.id}
                        onPress={() => navigation.navigate('Offer', { offerId: offer.id })}
                        accessibilityRole='link'
                        accessibilityLabel={offer.name}
                        style={{ marginHorizontal: space.gutter, padding: 12, borderRadius: radius.card, borderWidth: 1, borderColor: theme.primary.val, backgroundColor: theme.primarySoft.val, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                        <YStack minWidth={44} height={44} paddingHorizontal={8} borderRadius={radius.tile} backgroundColor='$primary' alignItems='center' justifyContent='center'>
                            <UIText variant='captionStrong' tone='onPrimary'>
                                {offerBadge(offer)}
                            </UIText>
                        </YStack>
                        <YStack flex={1} gap={2}>
                            <UIText variant='bodyStrong' numberOfLines={2}>
                                {offer.name}
                            </UIText>
                            {!!offer.description && (
                                <UIText variant='caption' tone='secondary' numberOfLines={1}>
                                    {offer.description}
                                </UIText>
                            )}
                        </YStack>
                        <FontAwesomeIcon icon={faTag} size={14} color={theme.primaryForeground.val} />
                    </Pressable>
                ))}

                {loading ? (
                    <XStack flexWrap='wrap' gap={12} paddingHorizontal={space.gutter}>
                        {[0, 1, 2, 3].map((key) => (
                            <YStack key={key} width={tileWidth} gap={8}>
                                <Skeleton height={132} radius={radius.tile} />
                                <Skeleton height={14} width='80%' />
                                <Skeleton height={14} width='40%' />
                            </YStack>
                        ))}
                    </XStack>
                ) : error ? (
                    <ErrorState onRetry={() => setAttempt((value) => value + 1)} />
                ) : items.length === 0 ? (
                    <EmptyState icon={faBasketShopping} title={t('Shop.noProducts')} description={t('Shop.noProductsBody', { name: title })} />
                ) : (
                    <XStack flexWrap='wrap' gap={12} rowGap={18} paddingHorizontal={space.gutter}>
                        {items.map((item) => (
                            <ProductTile key={item.summary.id ?? item.summary.name} product={item.summary} width={tileWidth} offerLabel={offerLabel(item)} onPress={() => openProduct(item)} />
                        ))}
                    </XStack>
                )}
            </ScrollView>

            <CartPill count={cart.count} total={cart.total} storeName={cart.storeName} onPress={() => navigation.navigate('NetworkCartTab')} />
        </YStack>
    );
};

export default ShopCategoryScreen;
