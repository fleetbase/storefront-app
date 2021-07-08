import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { getUniqueId } from 'react-native-device-info';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Place, GoogleAddress } from '@fleetbase/sdk';
import Storefront from '@fleetbase/storefront';
import Config from 'react-native-config';
import tailwind from '../../tailwind';

navigator.geolocation = require('react-native-geolocation-service');

const StorefrontEditPlaceScreen = ({ navigation, route }) => {
    const storefront = new Storefront(Config.STOREFRONT_KEY, { host: 'https://v2api.fleetbase.engineering' });
    const insets = useSafeAreaInsets();
    const { attributes, title } = route.params;
    const [editingPlace, setEditingPlace] = useState(null);

    useEffect(() => {
        if (attributes) {
            setEditingPlace(new Place(attributes, storefront.getAdapter()));
        }
    }, []);

    return (
        <View style={[tailwind('w-full h-full bg-white relative'), { paddingTop: insets.top }]}>
            <View style={tailwind('flex flex-row items-center justify-between p-4')}>
                <View style={tailwind('flex flex-row items-center')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>{title || 'Save new place'}</Text>
                </View>
            </View>
            <View style={tailwind('flex items-center justify-center w-full h-full bg-gray-200')}></View>
        </View>
    );
};

export default StorefrontEditPlaceScreen;
