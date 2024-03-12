import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { Store } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import { translate, config, isArray } from 'utils';
import { useLocale, useMountedState } from 'hooks';
import StoreCard from 'ui/StoreCard';
import tailwind from 'tailwind';

const StoreRelatedWidget = ({ info, store, storeLocation, wrapperStyle, containerStyle }) => {
    const navigation = useNavigation();
    const isMounted = useMountedState();
    const [locale] = useLocale();
    const [relatedStores, setRelatedStores] = useResourceCollection(`${store.id}_related_stores`, Store, StorefrontAdapter);

    const isReviewsEnabled = info?.options?.reviews_enabled === true;
    const tags = store.getAttribute('tags', []);
    const keyword = tags[Math.floor(Math.random() * tags.length)];
    const params = {
        tagged: keyword,
        limit: 5,
        exclude: [store.id],
    };

    if (isArray(relatedStores) && relatedStores.length === 0) {
        return <View />;
    }

    const transitionToStore = (relatedStore, relatedStoreLocation) => {
        if (typeof relatedStore?.getAttribute === 'function' && !relatedStore?.getAttribute('online')) {
            return;
        }

        if (relatedStore?.online === false) {
            return;
        }

        const data = typeof relatedStore?.serialize === 'function' ? relatedStore.serialize() : store;

        navigation.push('StoreScreen', { data, location: relatedStoreLocation?.serialize() ?? relatedStoreLocation, backButtonIcon: faTimes });
    };

    useEffect(() => {
        NetworkInfoService.getStores(params).then(setRelatedStores);
    }, [isMounted]);

    return (
        <View style={[wrapperStyle]}>
            <View style={[tailwind('bg-white'), containerStyle]}>
                <View style={tailwind('px-4 pt-4 pb-2')}>
                    <Text style={tailwind('font-bold text-lg text-black mb-2')}>{translate('components.widgets.StoreRelatedWidget.title')}</Text>
                </View>
                <View>
                    {relatedStores.map((relatedStore) => (
                        <StoreCard key={relatedStore.id} store={relatedStore} onPress={() => transitionToStore(relatedStore)} isReviewsEnabled={isReviewsEnabled} />
                    ))}
                </View>
            </View>
        </View>
    );
};

export default StoreRelatedWidget;
