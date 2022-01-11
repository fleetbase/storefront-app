import React, { useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { Store } from '@fleetbase/storefront';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { translate, config } from 'utils';
import { useLocale } from 'hooks';
import FastImage from 'react-native-fast-image';
import tailwind from 'tailwind';

const StorePhotosWidget = ({ info, store, storeLocation, wrapperStyle, containerStyle, onMediaPress, onViewMorePress }) => {
    const [locale] = useLocale();

    const viewMedia = (media) => {
        if (typeof onMediaPress === 'function') {
            onMediaPress(media);
        }
    };

    return (
        <View style={[wrapperStyle]}>
            <View style={[tailwind('bg-white'), containerStyle]}>
                <View style={tailwind('px-4 pt-4 pb-2 flex flex-row items-center justify-between')}>
                    <Text style={tailwind('font-bold text-lg text-black mb-2')}>{translate('components.widgets.StorePhotosWidget.title')}</Text>
                    <TouchableOpacity onPress={onViewMorePress}>
                        <FontAwesomeIcon icon={faArrowRight} />
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal={true} style={tailwind('flex flex-row py-4')}>
                    {store.getAttribute('media', []).map((media, index) => (
                        <TouchableOpacity key={index} onPress={() => viewMedia(media)} style={tailwind('mr-3')}>
                            <FastImage source={{ uri: media.url }} style={tailwind('border-4 border-gray-900 w-36 h-36')} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
};

export default StorePhotosWidget;
