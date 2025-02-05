import React, { useRef, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ScrollView, Dimensions } from 'react-native';
import { YStack, Text, XStack, useTheme } from 'tamagui';
import { Product } from '@fleetbase/storefront';
import { SimpleGrid } from 'react-native-super-grid';
import { storefrontConfig } from '../utils';
import useStorefront from '../hooks/use-storefront';
import StoreCategoriesGrid from '../components/StoreCategoriesGrid';
import StoreCategoriesPills from '../components/StoreCategoriesPills';
import CategoryProductSlider from '../components/CategoryProductSlider';
import ProductCard from '../components/ProductCard';
import Spacer from '../components/Spacer';

const CatalogScreen = ({ route }) => {
    const params = route.params || {};
    const theme = useTheme();
    const navigation = useNavigation();
    const catalogs = params.catalogs || [];
    const foodTruckId = params.foodTruckId ?? null;
    const { adapter: storefrontAdapter } = useStorefront();
    const categoriesDisplay = storefrontConfig('storeCategoriesDisplay', 'grid');
    const windowWidth = Dimensions.get('window').width;
    const productCardWidth = windowWidth / 2 - 25;

    const renderProduct = ({ item: product, index }) => (
        <YStack paddingBottom='$4'>
            <ProductCard key={index} product={new Product(product, storefrontAdapter)} sliderHeight={135} style={{ width: productCardWidth }} storeLocationId={foodTruckId} />
        </YStack>
    );

    return (
        <YStack flex={1} bg='$background'>
            <ScrollView scrollEventThrottle={16} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                <YStack py='$4' px='$3'>
                    {catalogs.map((catalog) => (
                        <YStack key={catalog.id}>
                            {/* <YStack mb='$3'>
                                <Text color='$textSecondary' fontSize='$8' fontWeight='bold'>
                                    {catalog.name}
                                </Text>
                            </YStack> */}
                            {catalog.categories.map((category) => (
                                <YStack key={category.id}>
                                    <YStack mb='$3'>
                                        <Text color='$textPrimary' fontSize='$8' fontWeight='bold'>
                                            {category.name}
                                        </Text>
                                    </YStack>
                                    <SimpleGrid maxItemsPerRow={2} itemDimension={productCardWidth} data={category.products} renderItem={renderProduct} spacing={0} />
                                </YStack>
                            ))}
                        </YStack>
                    ))}
                </YStack>
                <Spacer height={200} />
            </ScrollView>
        </YStack>
    );
};

export default CatalogScreen;
