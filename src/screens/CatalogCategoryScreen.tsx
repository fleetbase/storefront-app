import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeTabBarHeight as useBottomTabBarHeight } from '../hooks/use-safe-tab-bar-height';
import { useHeaderHeight } from '@react-navigation/elements';
import { SafeAreaView } from 'react-native';
import { Stack, Text, YStack, XStack, Spinner, useTheme } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { FlatGrid } from 'react-native-super-grid';
import { Product, FoodTruck } from '@fleetbase/storefront';
import { useLanguage } from '../contexts/LanguageContext';
import ScreenWrapper from '../components/ScreenWrapper';
import ProductCard from '../components/ProductCard';
import ProductCardHorizontal from '../components/ProductCardHorizontal';
import ProductCardHorizontalLTR from '../components/ProductCardHorizontalLTR';
import Spacer from '../components/Spacer';
import BackButton from '../components/BackButton';
import CartButton from '../components/CartButton';
import useDimensions from '../hooks/use-dimensions';

const CatalogCategoryScreen = ({ route }) => {
    const params = route.params || {};
    const category = params.category;
    const theme = useTheme();
    const navigation = useNavigation();
    const tabBarHeight = useBottomTabBarHeight();
    const headerHeight = useHeaderHeight();
    const { screenWidth } = useDimensions();
    const { t } = useLanguage();
    const products = (category.products ?? []).map((p) => new Product(p));
    const foodTruck = new FoodTruck(params.foodTruck);
    const foodTruckId = params.foodTruckId ?? null;

    return (
        <ScreenWrapper>
            <YStack flex={1} bg='$background'>
                <FlatGrid
                    ListHeaderComponent={
                        <XStack pt='$4' pb='$4' px='$4' mb='$4' alignItems='center' justifyContent='space-between' borderBottomWidth={1} borderColor='$borderColor'>
                            <XStack flex={1} gap='$2' alignItems='center'>
                                <BackButton onPress={() => navigation.goBack()} style={{ marginRight: 10 }} />
                                <Text color='$textPrimary' fontSize='$7' fontWeight='bold' numberOfLines={1}>
                                    {category.name}
                                </Text>
                            </XStack>
                            <YStack>
                                <CartButton text={t('CatalogScreen.jumpToCart')} onPress={() => navigation.navigate('CartModal')} iconSize={23} textSize={16} />
                            </YStack>
                        </XStack>
                    }
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
        </ScreenWrapper>
    );
};

export default CatalogCategoryScreen;
