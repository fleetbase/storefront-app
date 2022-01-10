import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, Image, ImageBackground, TouchableOpacity } from 'react-native';
import { Collection } from '@fleetbase/sdk';
import { Store, Category } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import { logError, config } from 'utils';
import { useMountedState } from 'hooks';
import NetworkHeader from 'ui/headers/NetworkHeader';
import NetworkCategoryBlock from 'ui/NetworkCategoryBlock';
import tailwind from 'tailwind';

const NetworkCategoryScreen = ({ navigation, route }) => {
    const { info, data } = route.params;

    const isMounted = useMountedState();

    const [stores, setStores] = useResourceCollection(`${info.id}_${data.id}_stores`, Store, StorefrontAdapter, new Collection());
    const category = new Category(data, StorefrontAdapter);

    const transitionToStore = (store) => {
        if (!store.getAttribute('online')) {
            return;
        }

        navigation.navigate('StoreScreen', { data: store.serialize() });
    }

    useEffect(() => {
        // Load all stores from netwrk
        NetworkInfoService.getStores({ category: category.id })
            .then((stores) => {
                if (!isMounted()) {
                    return;
                }

                setStores(stores);
            })
            .catch(logError);
    }, []);

    return (
        <View style={tailwind('bg-white')}>
            <NetworkHeader info={info} hideCategoryPicker={true} searchPlaceholder={`Search for ${category.getAttribute('name')}`} onBack={() => navigation.goBack()} {...config('ui.network.networkCategoryScreen.networkHeaderProps')} />
            <ScrollView showsVerticalScrollIndicator={false} style={tailwind('w-full h-full')}>
                <View style={tailwind('py-2')}>
                    {stores.map((store) => (
                        <TouchableOpacity key={store.id} style={tailwind(`px-4`)} disabled={!store.getAttribute('online')} onPress={() => transitionToStore(store)}>
                            <View style={tailwind(`border-b border-gray-100 py-3 ${store.getAttribute('online') ? 'opacity-100' : 'opacity-30'}`)}>
                                <View style={tailwind('flex flex-row')}>
                                    <View style={tailwind('mr-3')}>
                                        <Image source={{ uri: store.getAttribute('logo_url') }} style={tailwind('h-20 w-20 rounded-md')} />
                                    </View>
                                    <View style={tailwind('pr-2 w-3/4')}>
                                        <Text style={tailwind('font-semibold text-base mb-1')} numberOfLines={1}>
                                            {store.getAttribute('name')}
                                        </Text>
                                        <Text style={tailwind('text-sm text-gray-500')} numberOfLines={1}>
                                            {store.getAttribute('description')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

export default NetworkCategoryScreen;
