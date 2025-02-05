import React, { useRef, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { ScrollView, Animated } from 'react-native';
import { YStack, useTheme } from 'tamagui';
import StoreHeader from '../components/StoreHeader';
import StoreCategoriesGrid from '../components/StoreCategoriesGrid';
import StoreCategoriesPills from '../components/StoreCategoriesPills';
import CategoryProductSlider from '../components/CategoryProductSlider';
import useStorefrontData from '../hooks/use-storefront-data';
import useStorefrontInfo from '../hooks/use-storefront-info';
import LocationPicker from '../components/LocationPicker';
import { storefrontConfig } from '../utils';

const StoreHome = ({ route }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const headerHeight = useHeaderHeight(); // Default header height
    const customHeaderHeight = 250; // Adjust if StoreHeader uses a fixed height
    const scrollY = useRef(new Animated.Value(0)).current;
    const { info } = useStorefrontInfo();
    const { data: categories } = useStorefrontData((storefront) => storefront.categories.findAll(), { defaultValue: [], persistKey: `${info.id}_categories` });
    const categoriesDisplay = storefrontConfig('storeCategoriesDisplay', 'grid');

    // Interpolated animations
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, customHeaderHeight],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, customHeaderHeight],
        outputRange: [0, -customHeaderHeight],
        extrapolate: 'clamp',
    });

    const storeHeaderWrapperStyle = {
        opacity: headerOpacity,
        transform: [{ translateY: headerTranslateY }],
    };

    useEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <Animated.View
                    style={{
                        opacity: headerOpacity,
                        transform: [{ translateY: headerTranslateY }],
                    }}
                >
                    <LocationPicker onPressAddNewLocation={({ params }) => navigation.navigate('AddNewLocation', params)} />
                </Animated.View>
            ),
        });
    }, [navigation, headerOpacity, headerTranslateY]);

    return (
        <YStack flex={1} bg='$background'>
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        width: '100%',
                        zIndex: 2,
                    },
                    storeHeaderWrapperStyle,
                ]}
            >
                <StoreHeader storeName={info.name} logoUrl={info.logo_url} backgroundUrl={info.backdrop_url} description={info.description} />
            </Animated.View>
            <ScrollView
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
                contentContainerStyle={{
                    paddingTop: customHeaderHeight,
                    paddingBottom: 20,
                }}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
            >
                <YStack space='$3'>
                    <YStack>
                        {categoriesDisplay === 'grid' && (
                            <YStack padding='$3'>
                                <StoreCategoriesGrid
                                    categories={categories || []}
                                    justifyContent='start'
                                    itemContainerWidth={100}
                                    onPressCategory={(category) => navigation.navigate('StoreCategory', { category: category.serialize() })}
                                />
                            </YStack>
                        )}
                        {categoriesDisplay === 'pills' && (
                            <YStack pt='$4' pb='$2'>
                                <StoreCategoriesPills
                                    categories={categories || []}
                                    onPressCategory={(category) => navigation.navigate('StoreCategory', { category: category.serialize() })}
                                />
                            </YStack>
                        )}
                    </YStack>
                    <YStack space='$4'>
                        {categories.map((category, index) => (
                            <CategoryProductSlider key={index} category={category} onPressCategory={(category) => navigation.navigate('StoreCategory', { category: category.serialize() })} />
                        ))}
                    </YStack>
                </YStack>
            </ScrollView>
        </YStack>
    );
};

export default StoreHome;
