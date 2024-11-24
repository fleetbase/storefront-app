import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Stack, Text, YStack, XStack, Spinner, useTheme } from 'tamagui';
import { Portal } from '@gorhom/portal';
import LoadingIndicator from '../components/LoadingIndicator';
import ProductCard from '../components/ProductCard';
import useStorefrontData from '../hooks/use-storefront-data';
import useStorefrontInfo from '../hooks/use-storefront-info';

const StoreCategoryScreen = ({ route }) => {
    const category = route.params.category;
    const theme = useTheme();
    const navigation = useNavigation();
    const { data: products, loading: isLoadingProducts } = useStorefrontData((storefront) => storefront.products.query({ category: category.id }), {
        defaultValue: [],
        persistKey: `${category.id}_products`,
    });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background' paddingVertical='$4'>
                {isLoadingProducts && (
                    <Portal hostName='LoadingIndicatorPortal'>
                        <XStack>
                            <Spinner size='sm' color='$color' />
                        </XStack>
                    </Portal>
                )}
                <XStack width='100%' space='$3' paddingHorizontal='$4'>
                    {products.map((product, index) => (
                        <YStack key={product.id} width='50%'>
                            <ProductCard product={product} sliderHeight={135} onPress={() => navigation.navigate('Product', { product: product.serialize() })} />
                        </YStack>
                    ))}
                </XStack>
            </YStack>
        </SafeAreaView>
    );
};

export default StoreCategoryScreen;
