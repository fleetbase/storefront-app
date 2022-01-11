import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, Image, ImageBackground, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFolder } from '@fortawesome/free-solid-svg-icons';
import { Store, Category } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import { logError, config, translate, isLastIndex } from 'utils';
import { useMountedState, useLocale } from 'hooks';
import NetworkHeader from 'ui/headers/NetworkHeader';
import NetworkCategoryBlock from 'ui/NetworkCategoryBlock';
import tailwind from 'tailwind';

const NetworkCategoryScreen = ({ navigation, route }) => {
    const { info, data } = route.params;

    const isReviewsEnabled = info?.options?.reviews_enabled === true;
    const category = new Category(data, StorefrontAdapter);
    const isMounted = useMountedState();
    const storefront = useStorefront();
    const [locale] = useLocale();

    const [stores, setStores] = useResourceCollection(`${info.id}_${category.id}_stores`, Store, StorefrontAdapter);
    const [subCategories, setSubCategories] = useResourceCollection(`${category.id}_subcategories`, Category, StorefrontAdapter);

    const transitionToStore = (store, storeLocation) => {
        if (typeof store?.getAttribute === 'function' && !store?.getAttribute('online')) {
            return;
        }

        if (store?.online === false) {
            return;
        }

        const data = typeof store?.serialize === 'function' ? store.serialize() : store;

        navigation.navigate('StoreScreen', { data, location: storeLocation?.serialize() ?? storeLocation });
    };

    const transitionToCategory = (category) => {
        navigation.push('NetworkCategoryScreen', { data: category.serialize() });
    };

    const stopLoading = () => setIsLoading(false);

    useEffect(() => {
        // Load all stores from netwrk
        NetworkInfoService.getStores({ category: category.id }).then(setStores).catch(logError);

        // load sub categories
        storefront.categories.query({ parent: category.id }).then(setSubCategories).catch(logError);
    }, [isMounted]);

    return (
        <View style={tailwind('bg-white')}>
            <NetworkHeader
                info={info}
                hideCategoryPicker={true}
                searchPlaceholder={`Search for ${category.getAttribute('name')}`}
                onBack={() => navigation.goBack()}
                {...config('ui.network.networkCategoryScreen.networkHeaderProps')}
            />
            <ScrollView showsVerticalScrollIndicator={false} style={tailwind('w-full h-full')}>
                <View style={[tailwind('')]}>
                    <View style={tailwind('flex')}>
                        {subCategories.map((category, index) => (
                            <TouchableOpacity
                                key={category.id}
                                onPress={() => transitionToCategory(category)}
                                style={[tailwind(`w-full flex flex-row items-center py-3 px-2 ${isLastIndex(subCategories, index) ? '' : 'border-b border-gray-100'}`)]}
                            >
                                <View style={[tailwind('flex flex-row items-center justify-center mr-3')]}>
                                    <View style={[tailwind('rounded-full flex items-center justify-center w-8 h-8 bg-blue-50')]}>
                                        <FontAwesomeIcon icon={faFolder} size={17} style={[tailwind('text-blue-900')]} />
                                    </View>
                                </View>
                                <Text style={[tailwind('font-semibold')]} numberOfLines={1}>
                                    {translate(category, 'name')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={tailwind('py-2')}>
                    {stores.map((store) => (
                        <StoreCard key={store.id} store={store} onPress={() => transitionToStore(store)} isReviewsEnabled={isReviewsEnabled} />
                    ))}
                </View>
                <View style={tailwind('h-44 w-full')} />
            </ScrollView>
        </View>
    );
};

export default NetworkCategoryScreen;
