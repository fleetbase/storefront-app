import React from 'react';
import { useSafeTabBarHeight as useBottomTabBarHeight } from '../hooks/use-safe-tab-bar-height';
import { SafeAreaView } from 'react-native';
import { YStack, XStack, Spinner, useTheme } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { FlatGrid } from 'react-native-super-grid';
import ProductCard from '../components/ProductCard';
import Spacer from '../components/Spacer';
import useStorefrontData from '../hooks/use-storefront-data';
import useDimensions from '../hooks/use-dimensions';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';

const StoreCategoryScreen = ({ route }) => {
    // Deep links only carry ids, so the category object is optional.
    const categoryId = route.params?.category?.id ?? route.params?.categoryId;
    const theme = useTheme();
    const tabBarHeight = useBottomTabBarHeight();
    const { screenWidth } = useDimensions();
    const { mode, currentStore, getSelectedStoreLocation } = useStorefrontRuntime();
    const storeId = route.params?.storeId ?? currentStore?.id;
    const storeLocation = getSelectedStoreLocation(storeId);
    const { data: products, loading: isLoadingProducts } = useStorefrontData(
        (storefront) => (categoryId ? storefront.products.query({ category: categoryId, ...(mode === 'marketplace' && storeId ? { store: storeId } : {}) }) : Promise.resolve([])),
        {
            defaultValue: [],
            persistKey: `${storeId || 'store'}_${categoryId}_products`,
            dependencies: [mode, storeId, categoryId],
        }
    );

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
                        <ProductCard key={index} product={result} storeLocationId={storeLocation?.id} additionalNavigationParams={{ store: currentStore?.serialize?.() }} sliderHeight={135} wrapperStyle={{ paddingLeft: 6, paddingRight: 6, paddingBottom: 10 }} />
                    )}
                />
            </YStack>
        </SafeAreaView>
    );
};

export default StoreCategoryScreen;
