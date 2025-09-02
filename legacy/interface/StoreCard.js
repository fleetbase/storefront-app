import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FastImage from 'react-native-fast-image';
import { translate } from 'utils';
import { useLocale } from 'hooks';
import Rating from './Rating';
import tailwind from 'tailwind';

const StoreCard = ({ store, onPress, isReviewsEnabled, containerStyle }) => {
    const [locale] = useLocale();
    const numberOfLocations = store.getAttribute('locations', []).length;

    return (
        <TouchableOpacity key={store.id} style={[containerStyle, tailwind(`px-4`)]} disabled={!store.getAttribute('online')} onPress={onPress}>
            <View style={tailwind(`border-b border-gray-100 py-3 ${store.getAttribute('online') ? 'opacity-100' : 'opacity-30'}`)}>
                <View style={tailwind('flex flex-row')}>
                    <View style={tailwind('mr-4')}>
                        <FastImage source={{ uri: store.getAttribute('logo_url') }} style={tailwind('h-20 w-20 rounded-md')} />
                    </View>
                    <View style={tailwind('pr-2 w-3/4')}>
                        <Text style={tailwind('font-semibold text-base')} numberOfLines={1}>
                            {translate(store, 'name')}
                        </Text>
                        <Text style={tailwind('text-sm text-gray-500')} numberOfLines={1}>
                            {translate(store, 'description') ?? 'No description'}
                        </Text>
                        {isReviewsEnabled && (
                            <View style={tailwind('mt-1 flex flex-row items-center justify-start')}>
                                <Rating value={store.getAttribute('rating')} readonly={true} />
                            </View>
                        )}
                        {numberOfLocations > 0 && <Text style={tailwind('text-sm text-blue-600')}>{numberOfLocations} locations</Text>}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default StoreCard;
