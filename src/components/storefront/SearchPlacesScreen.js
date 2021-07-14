import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faMap } from '@fortawesome/free-solid-svg-icons';
import { Place, GoogleAddress } from '@fleetbase/sdk';
import { useStorefrontSdk } from '../../utils';
import Config from 'react-native-config';
import tailwind from '../../tailwind';

navigator.geolocation = require('react-native-geolocation-service');
const { GOOGLE_MAPS_KEY } = Config;

const StorefrontSearchPlacesScreen = ({ navigation, route }) => {
    const storefront = useStorefrontSdk();
    const insets = useSafeAreaInsets();

    const selectEditingPlace = (result) => {
        const googleAddress = new GoogleAddress(result);
        const place = Place.fromGoogleAddress(googleAddress);

        console.log(place);

        navigation.navigate('EditPlace', { attributes: place.serialize() });
    };

    return (
        <View style={[tailwind('w-full h-full bg-white relative'), { paddingTop: insets.top }]}>
            <View style={tailwind('flex flex-row items-center justify-between p-4')}>
                <View style={tailwind('flex flex-row items-center')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faTimes} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>Add a new place</Text>
                </View>
                <View>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <View style={tailwind('flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faMap} size={22} style={tailwind('text-gray-400')} />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={tailwind('flex items-center justify-center w-full h-full bg-gray-200')}>
                <GooglePlacesAutocomplete
                    placeholder={'Enter address...'}
                    placeholderTextColor={'rgba(156, 163, 175, 1)'}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                    currentLocation={true}
                    enableHighAccuracyLocation={true}
                    fetchDetails={true}
                    onPress={(data, details = null) => selectEditingPlace(details)}
                    query={{
                        key: GOOGLE_MAPS_KEY,
                        language: 'en',
                    }}
                    styles={{
                        textInputContainer: tailwind('w-full border-b border-gray-200 py-0 rounded-none'),
                        textInput: tailwind('h-14 text-xl font-semibold text-gray-500 my-0 rounded-none'),
                        predefinedPlacesDescription: tailwind('text-gray-600'),
                    }}
                    enablePoweredByContainer={true}
                />
            </View>
        </View>
    );
};

export default StorefrontSearchPlacesScreen;
