import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faStoreAlt } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Collection } from '@fleetbase/sdk';
import { Store, Category, Product, StoreLocation } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { useMountedState, useLocale } from 'hooks';
import { NetworkInfoService } from 'services';
import { useResourceCollection, useResourceStorage } from 'utils/Storage';
import { logError, getCurrentLocation, config, translate } from 'utils';
import FastImage from 'react-native-fast-image';
import tailwind from 'tailwind';

const StorePhotosScreen = ({ navigation, route }) => {
    const { info, storeData, initialMedia } = route.params;

    const storefront = useStorefront();
    const isMounted = useMountedState();
    const insets = useSafeAreaInsets();
    const store = new Store(storeData, StorefrontAdapter);

    const [isLoading, setIsLoading] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState(initialMedia);
    const isModalVisible = viewingPhoto !== null && viewingPhoto !== undefined;

    return (
        <View style={[tailwind('bg-black'), { paddingTop: insets.top }]}>
            <View style={tailwind('h-full w-full')}>
                <View style={tailwind('flex flex-row items-center p-4 z-10')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faTimes} />
                        </View>
                    </TouchableOpacity>
                    <View style={tailwind('flex flex-col items-start')}>
                        <Text style={tailwind('text-xl font-bold text-white')}>{store.getAttribute('name')}</Text>
                        <Text style={tailwind('text-sm font-semibold text-white')}>{translate('Shared.StorePhotosScreen.title', { storeMediaCount: store.getAttribute('media', [])?.length })}</Text>
                    </View>
                </View>
                <View style={tailwind('flex flex-row flex-wrap')}>
                    {store.getAttribute('media', []).map((media, index) => (
                        <TouchableOpacity key={index} onPress={() => setViewingPhoto(media)} style={tailwind('w-1/3 h-36 border-4 border-gray-900')}>
                            <FastImage source={{ uri: media.url }} style={tailwind('w-full h-full')} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            <Modal visible={isModalVisible} animationType={'slide'} transparent={true}>
                <View style={[tailwind('bg-black'), { paddingTop: insets.top }]}>
                    <View style={tailwind('flex flex-row items-center p-4 z-10')}>
                        <TouchableOpacity onPress={() => setViewingPhoto(null)} style={tailwind('mr-4')}>
                            <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                                <FontAwesomeIcon icon={faTimes} />
                            </View>
                        </TouchableOpacity>
                        <Text style={tailwind('text-xl font-bold text-white')}>{viewingPhoto?.caption ?? translate('Shared.StorePhotosScreen.viewingPhoto')}</Text>
                    </View>
                    <View style={tailwind('w-full h-3/4 flex items-center justify-center')}>
                        <FastImage source={{ uri: viewingPhoto?.url }} style={{ width: '100%', aspectRatio: 135 / 76 }} />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default StorePhotosScreen;
