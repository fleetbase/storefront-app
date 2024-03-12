import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TextInput, TouchableOpacity, Modal, Image } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Collection } from '@fleetbase/sdk';
import { Store } from '@fleetbase/storefront';
import { useNavigation } from '@react-navigation/native';
import { useStorefront } from 'hooks';
import LocationPicker from '../LocationPicker';
import StorePicker from '../StorePicker';
import StoreSearch from '../StoreSearch';
import tailwind from 'tailwind';

const StorefrontHeader = (props) => {
    const storefront = useStorefront();
    const navigation = useNavigation();

    const viewProduct = (product, closeDialog) => {
        closeDialog();
        navigation.navigate('ProductScreen', { attributes: product.serialize() });
    };

    return (
        <View style={[tailwind('z-50'), props.style || {}]}>
            <View style={tailwind('flex h-40 overflow-hidden')}>
                <ImageBackground source={{ uri: props.info.backdrop_url }} style={tailwind('flex-1 relative')} imageStyle={tailwind('bg-cover absolute -bottom-12')}>
                    <View style={tailwind('h-full p-2 flex justify-end')}>
                        <View style={tailwind('flex flex-row justify-between items-end w-full mb-2')}>
                            <View>
                                <StorePicker info={props.info} />
                            </View>
                            <View>
                                <LocationPicker />
                            </View>
                        </View>
                        <View>
                            <StoreSearch
                                store={new Store(props.info)}
                                onResultPress={viewProduct}
                                buttonStyle={tailwind('flex flex-row items-center justify-start bg-gray-100 rounded-md px-3 pr-2 h-10')}
                            />
                        </View>
                    </View>
                </ImageBackground>
            </View>
        </View>
    );
};

export default StorefrontHeader;
