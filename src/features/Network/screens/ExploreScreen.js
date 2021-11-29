import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, Image, ImageBackground, TouchableOpacity } from 'react-native';
import { Collection } from '@fleetbase/sdk';
import { Store, Category } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import { config } from 'utils';
import NetworkHeader from 'ui/headers/NetworkHeader';
import NetworkCategoryBlock from 'ui/NetworkCategoryBlock';
import tailwind from 'tailwind';

const ExploreScreen = ({ navigation, route }) => {
    const { info } = route.params;

    const [stores, setStores] = useResourceCollection('network_stores', Store, StorefrontAdapter, new Collection());
    const [networkCategories, setNetworkCategories] = useResourceCollection('category', Category, StorefrontAdapter, new Collection());

    const transitionToProduct = (product, close, timeout = 300) => {
        if (typeof close === 'function') {
            close();
        }

        setTimeout(() => {
            navigation.navigate('ProductScreen', { attributes: product.serialize() });
        }, timeout);
    };

    const transitionToCategory = (category, actionSheet) => {
        console.log('[ transitionToCategory() ]', category)
        navigation.navigate('NetworkCategoryScreen', { data: category.serialize() });
        actionSheet?.setModalVisible(false);
    };

    useEffect(() => {
        // Load all stores from netwrk
        NetworkInfoService.getStores().then((stores) => {
            setStores(stores);
        });
    }, []);

    return (
        <View style={tailwind('bg-white')}>
            <NetworkHeader info={info} onSearchResultPress={transitionToProduct} onCategoryPress={transitionToCategory} />
            <ScrollView showsVerticalScrollIndicator={false} style={tailwind('w-full h-full')}>
                <View style={tailwind('py-2')}>
                    <View style={tailwind('py-2 px-4')}>
                        <NetworkCategoryBlock containerStyle={tailwind('mb-2 p-2')} onCategoriesLoaded={setNetworkCategories} onPress={transitionToCategory} {...config('ui.network.exploreScreen.defaultCategoryComponentProps')} />
                    </View>

                    {stores.map((store) => (
                        <TouchableOpacity key={store.id} style={tailwind(`px-4`)} onPress={() => navigation.navigate('StoreScreen', { data: store.serialize() })}>
                            <View style={tailwind(`border-b border-gray-100 py-3`)}>
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
                <View style={tailwind('w-full h-44')}></View>
            </ScrollView>
        </View>
    );
};

export default ExploreScreen;
