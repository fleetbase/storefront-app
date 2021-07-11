import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground } from 'react-native';
import LocationPicker from '../shared/LocationPicker';
import tailwind from '../../tailwind';

const Header = (props) => {
    return (
        <View>
            <View style={tailwind('flex h-32 overflow-hidden')}>
                <ImageBackground source={{ uri: props.info.backdrop_url }} style={tailwind('flex-1 relative')} imageStyle={tailwind('bg-cover absolute -bottom-12')}>
                    <View style={tailwind('flex flex-row justify-between items-end w-full h-full p-2')}>
                        <View>
                            <View style={tailwind('rounded-full px-3 py-2 bg-gray-900')}>
                                <Text style={tailwind('text-white')}>{props.info.name}</Text>
                            </View>
                        </View>
                        <View>
                            <LocationPicker />
                        </View>
                    </View>
                </ImageBackground>
            </View>
        </View>
    );
};

export default Header;
