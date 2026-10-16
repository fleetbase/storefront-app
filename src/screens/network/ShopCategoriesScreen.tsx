import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faChevronLeft, faLayerGroup, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import useStorefront from '../../hooks/use-storefront';
import useCartSummary from '../../hooks/use-cart-summary';
import useMainStore from '../../network/use-main-store';
import { categoryTree, descendantIds, type CategoryNode } from '../../commerce/categories';
import { fetchOffers, offerTargets, type Offer } from '../../commerce/offers';
import { useOfferBadge } from '../../components/offers/OfferCard';
import ShopCategoryTile from '../../components/shop/ShopCategoryTile';
import { CartPill, EmptyState, ErrorState, IconButton, Skeleton, UIText, radius, space } from '../../ui';

const COLUMNS = 4;

/** Every top-level category of the Network's main store (or the Network's own), as a grid. */
const ShopCategoriesScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { t } = useLanguage();
    const { storefront } = useStorefront();
    const cart = useCartSummary();
    const offerBadge = useOfferBadge();
    const main = useMainStore();
    const storeId: string | null = route.params?.storeId ?? main.store?.id ?? null;

    const [categories, setCategories] = useState<CategoryNode[] | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!storefront || (main.loading && !route.params?.storeId)) return;
        let active = true;
        setError(null);
        (storeId ? storefront.categories.query({ store: storeId }) : storefront.categories.query({ parents_only: true }))
            .then((result: any) => active && setCategories(categoryTree(Array.from(result || []))))
            .catch((loadError: Error) => active && setError(loadError))
            .finally(() => active && setRefreshing(false));
        return () => {
            active = false;
        };
    }, [attempt, main.loading, route.params?.storeId, storeId, storefront]);

    useEffect(() => {
        const adapter = storefront?.getAdapter?.();
        if (!adapter) return;
        fetchOffers((path, query) => adapter.get(path, query), { includeScheduled: false })
            .then((list) => setOffers(list.filter((offer) => offer.availability === 'live')))
            .catch(() => setOffers([]));
    }, [attempt, storefront]);

    const tileWidth = Math.floor((width - space.gutter * 2 - 10 * (COLUMNS - 1)) / COLUMNS);
    const deal = (node: CategoryNode) => {
        const offer = offers.find((candidate) => offerTargets(candidate, { categoryIds: descendantIds(node) }));
        return offer ? offerBadge(offer) : null;
    };

    return (
        <YStack flex={1} backgroundColor='$background'>
            <XStack alignItems='center' gap={4} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={6}>
                <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                <UIText variant='heading' accessibilityRole='header' numberOfLines={1} style={{ flex: 1 }}>
                    {t('Shop.allCategories')}
                </UIText>
                <IconButton icon={faMagnifyingGlass} variant='plain' size={44} accessibilityLabel={t('Shop.search')} onPress={() => navigation.navigate('NetworkSearchTab')} />
            </XStack>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 8, paddingBottom: cart.count > 0 ? 110 : 40 }}
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
                {error ? (
                    <ErrorState onRetry={() => setAttempt((value) => value + 1)} />
                ) : categories === null ? (
                    <XStack flexWrap='wrap' gap={10} rowGap={16} paddingHorizontal={space.gutter}>
                        {Array.from({ length: 12 }).map((_, key) => (
                            <YStack key={key} width={tileWidth} alignItems='center' gap={6}>
                                <Skeleton width={tileWidth} height={tileWidth} radius={radius.tile} />
                                <Skeleton width={tileWidth * 0.7} height={12} />
                            </YStack>
                        ))}
                    </XStack>
                ) : categories.length === 0 ? (
                    <EmptyState icon={faLayerGroup} title={t('Shop.noCategories')} />
                ) : (
                    <XStack flexWrap='wrap' gap={10} rowGap={16} paddingHorizontal={space.gutter}>
                        {categories.map((node) => (
                            <ShopCategoryTile
                                key={node.id}
                                node={node}
                                width={tileWidth}
                                deal={deal(node)}
                                onPress={() => navigation.navigate('ShopCategory', { categoryId: node.id, storeId: storeId ?? undefined, name: node.name })}
                            />
                        ))}
                    </XStack>
                )}
            </ScrollView>

            <CartPill count={cart.count} total={cart.total} storeName={cart.storeName} onPress={() => navigation.navigate('NetworkCartTab')} />
        </YStack>
    );
};

export default ShopCategoriesScreen;
