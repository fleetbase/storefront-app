import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faChevronRight, faMagnifyingGlass, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import useStorefront from '../hooks/use-storefront';
import useStorefrontInfo from '../hooks/use-storefront-info';
import { EmptyState, ErrorState, IconButton, MediaImage, Skeleton, UIText, radius, space } from '../ui';

type CategoryRow = { id: string; name: string; iconUrl: string | null; subcategories: Array<{ id: string; name: string }> };

function toRow(category: any): CategoryRow {
    const attr = (key: string) => (typeof category?.getAttribute === 'function' ? category.getAttribute(key) : category?.[key]);
    const subs = Array.isArray(attr('subcategories')) ? attr('subcategories') : [];
    return {
        id: String(category?.id ?? attr('id') ?? ''),
        name: String(attr('name') ?? ''),
        iconUrl: attr('icon_url') ?? null,
        subcategories: subs.map((sub: any) => ({ id: String(sub?.id ?? sub?.public_id ?? ''), name: String(sub?.name ?? '') })).filter((sub: any) => sub.name),
    };
}

/**
 * Every category of the store, for large menus: each opens its section on the store page
 * (subcategories open their parent's section).
 */
const StoreCatalogScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { t } = useLanguage();
    const { storefront } = useStorefront();
    const { info } = useStorefrontInfo();
    const [categories, setCategories] = useState<CategoryRow[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        if (!storefront) return;
        let active = true;
        setFailed(false);
        storefront.categories
            .findAll()
            .then((result: any) => active && setCategories((Array.from(result || []) as any[]).map(toRow).filter((row) => row.name)))
            .catch(() => active && setFailed(true));
        return () => {
            active = false;
        };
    }, [storefront, retry]);

    const open = useCallback(
        (categoryId: string) => {
            if (typeof navigation.popTo === 'function') navigation.popTo('StoreHome', { categoryId });
            else navigation.navigate('StoreHome', { categoryId });
        },
        [navigation]
    );

    const header = (
        <XStack alignItems='center' gap={8} paddingHorizontal={8} paddingTop={insets.top + 4} paddingBottom={12} borderBottomWidth={1} borderColor='$borderColor'>
            <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
            <YStack flex={1}>
                <UIText variant='heading' accessibilityRole='header'>
                    {t('StorePage.allCategories')}
                </UIText>
                {!!info?.name && categories && (
                    <UIText variant='caption' tone='secondary'>
                        {t('StorePage.categoryCount', { store: info.name, count: categories.length })}
                    </UIText>
                )}
            </YStack>
            <IconButton icon={faMagnifyingGlass} size={44} accessibilityLabel={t('StorePage.searchStore', { store: info?.name ?? '' })} onPress={() => navigation.navigate('StoreSearchTab')} />
        </XStack>
    );

    return (
        <YStack flex={1} backgroundColor='$background'>
            {header}
            {failed ? (
                <ErrorState onRetry={() => setRetry((value) => value + 1)} />
            ) : categories === null ? (
                <YStack padding={space.gutter} gap={16}>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                        <XStack key={index} gap={12} alignItems='center'>
                            <Skeleton width={56} height={56} radius={radius.tile} />
                            <YStack flex={1} gap={8}>
                                <Skeleton height={16} width='50%' />
                                <Skeleton height={12} width='30%' />
                            </YStack>
                        </XStack>
                    ))}
                </YStack>
            ) : (
                <FlatList
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    keyExtractor={(row) => row.id}
                    contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
                    ListEmptyComponent={
                        <EmptyState
                            icon={faTableCellsLarge}
                            title={t('StorePage.noCategoriesTitle')}
                            description={t('StorePage.noCategoriesBody')}
                            actionLabel={t('StorePage.backToMenu')}
                            onAction={() => navigation.goBack()}
                        />
                    }
                    renderItem={({ item }) => (
                        <YStack borderBottomWidth={1} borderColor='$borderColor'>
                            <Pressable
                                onPress={() => open(item.id)}
                                accessibilityRole='link'
                                style={({ pressed }) => ({ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}
                            >
                                <MediaImage uri={item.iconUrl} seed={item.name} width={56} height={56} radius={radius.tile} />
                                <YStack flex={1} gap={2}>
                                    <UIText variant='bodyStrong'>{item.name}</UIText>
                                    {item.subcategories.length > 0 && (
                                        <UIText variant='caption' tone='secondary'>
                                            {t('StorePage.subcategoryCount', { count: item.subcategories.length })}
                                        </UIText>
                                    )}
                                </YStack>
                                <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.textPlaceholder.val} />
                            </Pressable>
                            {item.subcategories.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    showsVerticalScrollIndicator={false}
                                    accessibilityLabel={t('StorePage.subcategoriesOf', { name: item.name })}
                                    contentContainerStyle={{ gap: 8, paddingLeft: 68, paddingBottom: 12 }}
                                >
                                    {item.subcategories.map((sub) => (
                                        <Pressable
                                            key={sub.id || sub.name}
                                            onPress={() => open(item.id)}
                                            accessibilityRole='link'
                                            style={{ height: 34, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: theme.surface.val, justifyContent: 'center' }}
                                        >
                                            <UIText variant='captionStrong'>{sub.name}</UIText>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            )}
                        </YStack>
                    )}
                />
            )}
        </YStack>
    );
};

export default StoreCatalogScreen;
