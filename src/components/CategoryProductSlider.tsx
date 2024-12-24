import React, { useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text, Spinner, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import useStorefrontData from '../hooks/use-storefront-data';
import ProductCard from './ProductCard';

const CategoryProductSlider = ({ category, style = {}, onPressCategory }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { data: products, loading: isLoadingProducts } = useStorefrontData((storefront) => storefront.products.query({ category: category.id }), {
        defaultValue: [],
        persistKey: `${category.id}_products`,
    });

    const handleCategoryPress = () => {
        if (typeof onPressCategory === 'function') {
            onPressCategory(category);
        }
    };

    return (
        <YStack space='$3' style={style}>
            <XStack justiftContent='space-between' paddingHorizontal='$4'>
                <XStack space='$4' alignItems='center'>
                    <Pressable onPress={handleCategoryPress} hitSlop={20} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1.0, scale: pressed ? 0.8 : 1.0 }]}>
                        <XStack alignItems='center'>
                            <Text color='$textPrimary' fontWeight='bold' fontSize='$7'>
                                {category.getAttribute('name')}
                            </Text>
                            <FontAwesomeIcon icon={faArrowRight} color={theme.textPrimary.val} size={15} style={{ marginLeft: 7 }} />
                        </XStack>
                    </Pressable>
                    {isLoadingProducts && <Spinner size='sm' color='$color' />}
                </XStack>
            </XStack>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack space='$4' paddingVertical='$1' paddingHorizontal='$4'>
                    {products.map((product, index) => (
                        <ProductCard key={index} product={product} sliderHeight={135} style={{ width: 190 }} />
                    ))}
                </XStack>
            </ScrollView>
        </YStack>
    );
};

export default CategoryProductSlider;
