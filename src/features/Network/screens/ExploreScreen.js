import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, Image, ImageBackground, TouchableOpacity } from 'react-native';
import { Collection } from '@fleetbase/sdk';
import { Store } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import NetworkHeader from 'ui/headers/NetworkHeader';
import NetworkCategoryBlock from 'ui/NetworkCategoryBlock';
import tailwind from 'tailwind';

const ExploreScreen = ({ navigation, route }) => {
    const { info } = route.params;

    const [stores, setStores] = useResourceCollection('store', Store, StorefrontAdapter, new Collection());

    useEffect(() => {
        // Load all stores from netwrk
        NetworkInfoService.getStores().then((stores) => {
            setStores(stores);
        });
    }, []);

    return (
        <View style={tailwind('bg-white')}>
            <NetworkHeader info={info} />
            <ScrollView showsVerticalScrollIndicator={false} style={tailwind('w-full h-full')}>
                <View style={tailwind('py-2')}>
                    <View style={tailwind('p-4')}>
                        <NetworkCategoryBlock containerStyle={tailwind('mb-2')} />
                    </View>

                    {stores.map((store) => (
                        <TouchableOpacity key={store.id} style={tailwind(`px-4`)} onPress={() => navigation.navigate('StoreScreen', { data: store.serialize() })}>
                            <View style={tailwind(`border-b border-gray-100 py-3`)}>
                                <View style={tailwind('flex flex-row')}>
                                    <View style={tailwind('mr-2')}>
                                        <Image source={{ uri: store.getAttribute('logo_url') }} style={tailwind('h-20 w-20 border border-gray-200 drop-shadow-sm rounded-md')} />
                                    </View>
                                    <View style={tailwind('pr-2')}>
                                        <Text style={tailwind('font-semibold text-base')} numberOfLines={1}>
                                            {store.getAttribute('name')}
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

export default ExploreScreen;
