import React from 'react';
import { Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarCheck, faClock, faPlus } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/format';
import { Badge } from './Badge';
import { MediaImage } from './Media';
import { formatDuration, type ProductSummary } from './product-display';
import { UIText } from './Text';
import { radius } from './tokens';

function usePrice(product: ProductSummary) {
    const currency = product.currency ?? 'USD';
    return {
        price: formatCurrency(product.onSale && product.salePrice !== null ? product.salePrice : product.price, currency),
        was: product.onSale ? formatCurrency(product.price, currency) : null,
    };
}

export type ProductItemProps = {
    product: ProductSummary;
    onPress?: () => void;
    /** The store is closed or offline: the item stays browsable but can't be added. */
    storeClosed?: boolean;
    testID?: string;
};

function label(product: ProductSummary, price: string, unavailableText: string | null) {
    return [product.name, price, unavailableText].filter(Boolean).join(', ');
}

function AddBadge({ disabled }: { disabled: boolean }) {
    const theme = useTheme();
    return (
        <YStack
            width={36}
            height={36}
            borderRadius={18}
            alignItems='center'
            justifyContent='center'
            backgroundColor={disabled ? '$surface2' : '$background'}
            borderWidth={2}
            borderColor='$background'
            style={{ shadowColor: '#101828', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
            accessibilityElementsHidden
        >
            <FontAwesomeIcon icon={faPlus} size={15} color={disabled ? theme.textPlaceholder.val : theme.textPrimary.val} />
        </YStack>
    );
}

/** The call to action on a bookable service row: "Book", or "View" while the store is closed. */
function BookPill({ disabled }: { disabled: boolean }) {
    const { t } = useLanguage();
    return (
        <YStack height={34} paddingHorizontal={14} borderRadius={radius.pill} alignItems='center' justifyContent='center' backgroundColor={disabled ? '$surface2' : '$primary'} accessibilityElementsHidden>
            <UIText variant='captionStrong' tone={disabled ? 'secondary' : 'onPrimary'}>
                {disabled ? t('UI.view') : t('UI.book')}
            </UIText>
        </YStack>
    );
}

/** A catalog row: name, description, price, image and an add affordance (or "Book" for services). */
export function ProductRow({ product, onPress, storeClosed = false, testID }: ProductItemProps) {
    const { t } = useLanguage();
    const { price, was } = usePrice(product);
    const soldOut = !product.available;
    const unavailableText = soldOut ? t('UI.outOfStock') : null;

    return (
        <Pressable onPress={onPress} accessibilityRole='button' accessibilityLabel={label(product, price, unavailableText)} testID={testID} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <XStack gap={14} paddingVertical={14} borderBottomWidth={1} borderColor='$borderColor' opacity={soldOut ? 0.6 : 1}>
                <YStack flex={1} gap={4}>
                    <UIText variant='bodyStrong'>{product.name}</UIText>
                    {(product.isService || product.isBookable) && (
                        <XStack gap={6} flexWrap='wrap'>
                            <Badge tone='brand' size='sm' icon={faCalendarCheck} label={t('UI.bookable')} />
                            {!!formatDuration(product.durationMinutes) && <Badge size='sm' icon={faClock} label={formatDuration(product.durationMinutes)!} />}
                        </XStack>
                    )}
                    {!!product.description && (
                        <UIText variant='caption' tone='secondary' numberOfLines={2}>
                            {product.description}
                        </UIText>
                    )}
                    <XStack gap={6} alignItems='center' marginTop={2} justifyContent='space-between'>
                        <XStack gap={6} alignItems='baseline'>
                            <UIText variant='bodyStrong' tone={product.onSale ? 'error' : 'primary'}>
                                {price}
                            </UIText>
                            {was && (
                                <UIText variant='caption' tone='secondary' style={{ textDecorationLine: 'line-through' }}>
                                    {was}
                                </UIText>
                            )}
                        </XStack>
                        {product.isBookable && !soldOut && <BookPill disabled={storeClosed} />}
                    </XStack>
                    {soldOut && <Badge size='sm' label={t('UI.outOfStock')} />}
                </YStack>
                <YStack>
                    <MediaImage uri={product.imageUrl} seed={product.name} width={96} height={96} radius={radius.tile} />
                    {!soldOut && !product.isBookable && (
                        <YStack position='absolute' right={-6} bottom={-6}>
                            <AddBadge disabled={storeClosed} />
                        </YStack>
                    )}
                </YStack>
            </XStack>
        </Pressable>
    );
}

/** A product tile for rails such as "Recommended". */
export function ProductTile({ product, onPress, storeClosed = false, testID, width = 168 }: ProductItemProps & { width?: number }) {
    const { t } = useLanguage();
    const { price, was } = usePrice(product);
    const soldOut = !product.available;

    return (
        <Pressable onPress={onPress} accessibilityRole='button' accessibilityLabel={label(product, price, soldOut ? t('UI.outOfStock') : null)} testID={testID} style={({ pressed }) => ({ width, opacity: pressed ? 0.85 : 1 })}>
            <YStack gap={8} opacity={soldOut ? 0.6 : 1}>
                <MediaImage uri={product.imageUrl} seed={product.name} height={132}>
                    {product.onSale && (
                        <YStack position='absolute' left={8} top={8}>
                            <Badge tone='error' size='sm' label={t('UI.sale')} />
                        </YStack>
                    )}
                    {!soldOut && !product.isBookable && (
                        <YStack position='absolute' right={8} bottom={8}>
                            <AddBadge disabled={storeClosed} />
                        </YStack>
                    )}
                </MediaImage>
                <UIText variant='captionStrong' numberOfLines={2} style={{ fontSize: 14, lineHeight: 19 }}>
                    {product.name}
                </UIText>
                <XStack gap={6} alignItems='baseline'>
                    <UIText variant='captionStrong' tone={product.onSale ? 'error' : 'primary'} style={{ fontSize: 14 }}>
                        {price}
                    </UIText>
                    {was && (
                        <UIText variant='caption' tone='secondary' style={{ textDecorationLine: 'line-through' }}>
                            {was}
                        </UIText>
                    )}
                </XStack>
            </YStack>
        </Pressable>
    );
}
