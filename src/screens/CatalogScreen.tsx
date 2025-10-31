import React, { useRef, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ScrollView, Dimensions } from 'react-native';
import { YStack, Text, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTruck } from '@fortawesome/free-solid-svg-icons';
import { Product, FoodTruck, Category } from '@fleetbase/storefront';
import { SimpleGrid } from 'react-native-super-grid';
import { storefrontConfig } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';
import useStorefront from '../hooks/use-storefront';
import StoreCategoriesGrid from '../components/StoreCategoriesGrid';
import StoreCategoriesPills from '../components/StoreCategoriesPills';
import CategoryProductSlider from '../components/CategoryProductSlider';
import ProductCard from '../components/ProductCard';
import Spacer from '../components/Spacer';
import CartButton from '../components/CartButton';

const CatalogScreen = ({ route }) => {
    const params = route.params || {};
    const theme = useTheme();
    const navigation = useNavigation();
    const { t } = useLanguage();
    const catalogs = params.catalogs || [];
    const foodTruck = new FoodTruck(params.foodTruck);
    const foodTruckId = params.foodTruckId ?? null;
    const { adapter: storefrontAdapter } = useStorefront();
    const categoriesDisplay = storefrontConfig('storeCategoriesDisplay', 'grid');
    const windowWidth = Dimensions.get('window').width;
    const productCardWidth = windowWidth / 2 - 25;
    const allCategories = catalogs.flatMap((catalog) => catalog.categories ?? []).map((category) => new Category(category, storefrontAdapter));
    console.log('[categoriesDisplay]', categoriesDisplay);
    console.log('[allCategories]', allCategories);

    const renderProduct = ({ item: product, index }) => (
        <YStack paddingBottom='$4'>
            <ProductCard
                key={index}
                product={new Product(product, storefrontAdapter)}
                sliderHeight={135}
                style={{ width: productCardWidth }}
                storeLocationId={foodTruckId}
                additionalNavigationParams={{ isModal: true }}
            />
        </YStack>
    );

    return (
        <YStack flex={1} bg='$background'>
            <XStack py='$4' px='$4' alignItems='center' justifyContent='space-between' borderBottomWidth={1} borderColor='$borderColor'>
                <XStack flex={1} gap='$2' alignItems='center'>
                    <FontAwesomeIcon icon={faTruck} color={theme['$blue-500'].val} size={24} />
                    <Text color='$textPrimary' fontSize='$7' fontWeight='bold' numberOfLines={1}>
                        {foodTruck.getAttribute('vehicle.plate_number')}
                    </Text>
                </XStack>
                <YStack>
                    <CartButton text={t('CatalogScreen.jumpToCart')} onPress={() => navigation.navigate('CartModal')} iconSize={23} textSize={16} />
                </YStack>
            </XStack>
            <YStack>
                <YStack pt='$4' pb='$2'>
                    <StoreCategoriesPills categories={allCategories} onPressCategory={(category) => navigation.navigate('Category', { category: category.serialize() })} />
                </YStack>
            </YStack>
            <ScrollView scrollEventThrottle={16} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                <YStack py='$2' px='$3'>
                    {catalogs.map((catalog) => (
                        <YStack key={catalog.id}>
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
