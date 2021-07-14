import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TextInput, TouchableOpacity, Modal, Image } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Collection } from '@fleetbase/sdk';
import { useNavigation } from '@react-navigation/native';
import useStorefrontSdk from '../../utils/use-storefront-sdk';
import LocationPicker from '../shared/LocationPicker';
import StorePicker from '../shared/StorePicker';
import tailwind from '../../tailwind';

const Header = (props) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(new Collection());
    const storefront = useStorefrontSdk();
    const navigation = useNavigation();

    const searchProducts = (query) => {
        if (query.length === 0) {
            return clearSearch();
        }
        
        setSearchQuery(query);

        return storefront.search(query).then((products) => {
            setResults(products);
        });
    };

    const clearSearch = () => {
        setSearchQuery('');
        setResults(new Collection());
    }

    const selectProduct = (product) => {
        clearSearch();
        navigation.navigate('ProductScreen', { attributes: product.serialize() });
    }

    return (
        <View style={[tailwind('z-50'), (props.style || {})]}>
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
                                    <TextInput
                                        value={searchQuery}
                                        onChangeText={searchProducts}
                                        autoCapitalize={'none'}
                                        autoCorrect={false}
                                        style={tailwind('h-7 text-left w-full text-gray-500')}
                                        placeholderTextColor={'rgba(156, 163, 175, 1)'}
                                        placeholder={'Search for anything...'}
                                    />
                                </View>
                                <View>
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={clearSearch}>
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
            <View style={tailwind(`mt-40 absolute w-full ${results.length === 0 ? 'hidden' : ''}`)}>
                <View style={tailwind('px-3')}>
                    <View style={tailwind('bg-white rounded-md shadow-sm border border-gray-50 mt-2')}>
                        {results.map((product, index) => (
                            <View key={index}>
                                <TouchableOpacity style={tailwind('p-4 border-b border-gray-200')} onPress={() => selectProduct(product)}>
                                    <View style={tailwind('flex flex-row items-start')}>
                                        <View style={tailwind('mr-3')}>
                                            <Image source={{ uri: product.getAttribute('primary_image_url') }} style={tailwind('w-12 h-12')} />
                                        </View>
                                        <View>
                                            <Text style={tailwind('font-bold mb-1')}>{product.getAttribute('name')}</Text>
                                            <Text style={tailwind('font-semibold text-green-700')}>{product.formattedAmount}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
};

export default Header;
