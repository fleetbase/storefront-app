import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Stack, Text, YStack, useTheme } from 'tamagui';
import { Collection } from '@fleetbase/sdk';
import StoreHeader from '../components/StoreHeader';
import StoreCategoriesGrid from '../components/StoreCategoriesGrid';
import useStorefrontData from '../hooks/use-storefront-data';
import useStorefrontInfo from '../hooks/use-storefront-info';

const StoreHome = ({ route }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { info } = useStorefrontInfo();
    const { data: categories } = useStorefrontData((storefront) => storefront.categories.findAll(), { defaultValue: [], persistKey: `${info.id}_categories` });

    return (
        <YStack flex={1} bg='$background'>
            <StoreHeader storeName={info.name} logoUrl={info.logo_url} backgroundUrl={info.backdrop_url} description={info.description} />
            <StoreCategoriesGrid
                categories={categories || []}
                justifyContent='start'
                itemContainerWidth={100}
                onPressCategory={(category) => navigation.navigate('StoreCategory', { category: category.serialize() })}
            />
            <YStack flex={1} alignItems='center' justifyContent='center' bg='$background'></YStack>
        </YStack>
    );
};

export default StoreHome;
