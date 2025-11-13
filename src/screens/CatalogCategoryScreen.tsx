import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeTabBarHeight as useBottomTabBarHeight } from '../hooks/use-safe-tab-bar-height';
import { SafeAreaView } from 'react-native';
import { Stack, Text, YStack, XStack, Spinner, useTheme } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { FlatGrid } from 'react-native-super-grid';
import { Product, FoodTruck } from '@fleetbase/storefront';
import ProductCard from '../components/ProductCard';
import ProductCardHorizontal from '../components/ProductCardHorizontal';
import ProductCardHorizontalLTR from '../components/ProductCardHorizontalLTR';
import Spacer from '../components/Spacer';
import useDimensions from '../hooks/use-dimensions';

const CatalogCategoryScreen = ({ route }) => {
    const params = route.params || {};
    const category = params.category;
    const theme = useTheme();
    const navigation = useNavigation();
    const tabBarHeight = useBottomTabBarHeight();
    const { screenWidth } = useDimensions();
    const products = (category.products ?? []).map((p) => new Product(p));
    const foodTruck = new FoodTruck(params.foodTruck);
    const foodTruckId = params.foodTruckId ?? null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background'>
                <FlatGrid
                    ListHeaderComponent={<Spacer height={15} />}
                    ListFooterComponent={<Spacer height={tabBarHeight} />}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    maxItemsPerRow={2}
                    itemDimension={screenWidth / 2}
                    spacing={0}
                    data={products}
                    renderItem={({ item: result, index }) => (
                        <ProductCard
                            key={index}
                            product={result}
                            sliderHeight={135}
                            wrapperStyle={{ paddingLeft: 6, paddingRight: 6, paddingBottom: 10 }}
                            storeLocationId={foodTruckId}
                            additionalNavigationParams={{ isModal: true }}
                        />
                    )}
                />
            </YStack>
        </SafeAreaView>
    );
};

export default CatalogCategoryScreen;
