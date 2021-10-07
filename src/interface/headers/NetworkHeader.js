import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TextInput, TouchableOpacity, Modal, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Collection } from '@fleetbase/sdk';
import { useNavigation } from '@react-navigation/native';
import { useStorefront } from 'hooks';
import LocationPicker from '../LocationPicker';
import StorePicker from '../StorePicker';
import tailwind from 'tailwind';

const NetworkHeader = (props) => {
    const insets = useSafeAreaInsets();
    const storefront = useStorefront();
    const navigation = useNavigation();

    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(new Collection());

    // <LocationPicker />

    return (
        <View style={[tailwind('z-50'), { paddingTop: insets.top }, props.style ?? {}]}>
            <View style={tailwind('flex flex-row items-center justify-between p-4 border-b border-gray-100 overflow-hidden')}>
                <View>
                    <Text style={tailwind('font-bold text-lg')}>{props.info.name}</Text>
                </View>
                <View>
                    <LocationPicker />
                </View>
            </View>
        </View>
    );
};

export default NetworkHeader;
