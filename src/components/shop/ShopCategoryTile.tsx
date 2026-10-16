import React from 'react';
import { Image, Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { YStack, useTheme } from 'tamagui';
import type { CategoryNode } from '../../commerce/categories';
import { Badge, UIText, categoryIcon, radius, usableImageUrl } from '../../ui';

/** A category as a square tile with its icon and name, and the badge of an offer aimed at it. */
export default function ShopCategoryTile({ node, width, deal = null, onPress }: { node: CategoryNode; width: number; deal?: string | null; onPress: () => void }) {
    const theme = useTheme();
    const icon = usableImageUrl(node.iconUrl);
    return (
        <Pressable onPress={onPress} accessibilityRole='button' accessibilityLabel={deal ? `${node.name}, ${deal}` : node.name} testID='shop-category' style={{ width, alignItems: 'center', gap: 6 }}>
            <YStack width={width} height={width} borderRadius={radius.tile} backgroundColor='$surface' alignItems='center' justifyContent='center'>
                {icon ? (
                    <Image source={{ uri: icon }} style={{ width: width * 0.8, height: width * 0.8, borderRadius: radius.tile }} resizeMode='contain' />
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
}
