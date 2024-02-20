import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator, Dimensions, Modal } from 'react-native';
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
import Carousel, { Pagination } from 'react-native-snap-carousel';
import FastImage from 'react-native-fast-image';
import tailwind from 'tailwind';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const carouselItemWidth = 265;
const carouselItemHeight = 170;

const StorePhotosScreen = ({ navigation, route }) => {
    const { info, storeData, initialMedia } = route.params;

    const storefront = useStorefront();
    const isMounted = useMountedState();
    const insets = useSafeAreaInsets();
    const carouselRef = useRef();
    const store = new Store(storeData, StorefrontAdapter);

    const [isLoading, setIsLoading] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState(initialMedia);

    const isModalVisible = viewingPhoto !== null && viewingPhoto !== undefined;
    const medias = store.getAttribute('media', []);
    const currentIndex = medias?.indexOf(viewingPhoto);

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
                        <Text style={tailwind('text-sm font-semibold text-white')}>
                            {translate('Shared.StorePhotosScreen.title', { storeMediaCount: store.getAttribute('media', [])?.length })}
                        </Text>
                    </View>
                </View>
                <ScrollView style={tailwind('w-full h-full pb-12')}>
                    <View style={tailwind('flex flex-row flex-wrap')}>
                        {medias?.map((media, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => setViewingPhoto(media)}
                                style={[tailwind('w-1/3 h-36 border-4 border-gray-900'), currentIndex === index ? tailwind('border-green-500') : null]}>
                                <FastImage source={{ uri: media.url }} style={tailwind('w-full h-full')} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>
            <Modal visible={isModalVisible} animationType={'slide'} transparent={true}>
                <View style={[tailwind('bg-black bg-opacity-75 mt-1'), { paddingTop: Math.max(insets.top, 24) }]}>
                    <View style={tailwind('flex flex-row items-center p-4 z-10')}>
                        <TouchableOpacity onPress={() => setViewingPhoto(null)} style={tailwind('mr-4')}>
                            <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                                <FontAwesomeIcon icon={faTimes} />
                            </View>
                        </TouchableOpacity>
                        <Text style={tailwind('text-xl font-bold text-white')}>{viewingPhoto?.caption ?? translate('Shared.StorePhotosScreen.viewingPhoto')}</Text>
                    </View>
                    <View style={tailwind('h-full w-full')}>
                        <View style={{ marginTop: width / 2.5 }}>
                            <Carousel
                                ref={carouselRef}
                                layout={'default'}
                                data={medias}
                                renderItem={({ item }) => <FastImage source={{ uri: item?.url }} style={{ width: '100%', aspectRatio: 135 / 76 }} />}
                                sliderWidth={width}
                                sliderHeight={height}
                                itemWidth={width}
                                itemHeight={height}
                                onSnapToItem={(slideIndex) => setViewingPhoto(medias[slideIndex])}
                                firstItem={currentIndex}
                                enableMomentum={true}
                            />
                            {/* <Pagination
                                dotsLength={medias.length}
                                activeDotIndex={currentIndex}
                                containerStyle={tailwind('py-4 mt-12')}
                                dotStyle={tailwind('rounded-full w-3 h-3 mx-2 bg-gray-600 border border-gray-600')}
                                inactiveDotStyle={tailwind('rounded-full w-3 h-3 mx-2 bg-gray-100 border border-gray-900')}
                                inactiveDotOpacity={0.4}
                                inactiveDotScale={0.6}
                            /> */}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default StorePhotosScreen;
