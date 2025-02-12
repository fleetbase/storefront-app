import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native';
import { Stack, Text, YStack, XStack, Spinner, useTheme } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { FlatGrid } from 'react-native-super-grid';
import LoadingIndicator from '../components/LoadingIndicator';
import ProductCard from '../components/ProductCard';
import ProductCardHorizontal from '../components/ProductCardHorizontal';
import ProductCardHorizontalLTR from '../components/ProductCardHorizontalLTR';
import Spacer from '../components/Spacer';
import useStorefrontData from '../hooks/use-storefront-data';
import useStorefrontInfo from '../hooks/use-storefront-info';
import useDimensions from '../hooks/use-dimensions';

const StoreCategoryScreen = ({ route }) => {
    const category = route.params.category;
    const theme = useTheme();
    const navigation = useNavigation();
    const tabBarHeight = useBottomTabBarHeight();
    const { screenWidth } = useDimensions();
    const { data: products, loading: isLoadingProducts } = useStorefrontData((storefront) => storefront.products.query({ category: category.id }), {
        defaultValue: [],
        persistKey: `${category.id}_products`,
    });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background'>
                {isLoadingProducts && (
                    <Portal hostName='LoadingIndicatorPortal'>
                        <XStack>
                            <Spinner size='sm' color='$color' />
                        </XStack>
                    </Portal>
                )}
                <FlatGrid
                    ListHeaderComponent={<Spacer height={10} />}
                    ListFooterComponent={<Spacer height={tabBarHeight} />}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    maxItemsPerRow={2}
                    itemDimension={screenWidth / 2}
                    spacing={0}
                    data={products}
                    renderItem={({ item: result, index }) => (
                        <ProductCard key={index} product={result} sliderHeight={135} wrapperStyle={{ paddingLeft: 6, paddingRight: 6, paddingBottom: 10 }} />
                    )}
                />
            </YStack>
        </SafeAreaView>
    );
};

export default StoreCategoryScreen;
