import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TextInput, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import LocationPicker from '../shared/LocationPicker';
import StorePicker from '../shared/StorePicker';
import tailwind from '../../tailwind';

const Header = (props) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const searchProducts = () => {};

    return (
        <View>
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
                            <View style={tailwind('flex flex-row items-center justify-between px-3 py-2 bg-white w-full shadow-sm rounded-md')}>
                                <View style={tailwind('flex-1')}>
                                    <TextInput value={searchQuery} onChangeText={setSearchQuery} style={tailwind('h-7 text-left w-full text-gray-500')} placeholder={'Search for anything'} />
                                </View>
                                <View>
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                                            <View style={tailwind('rounded-full bg-red-50 w-6 h-6 flex items-center justify-center ml-1')}>
                                                <FontAwesomeIcon size={12} icon={faTimes} style={tailwind('text-red-900')} />
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                </ImageBackground>
            </View>
        </View>
    );
};

export default Header;
