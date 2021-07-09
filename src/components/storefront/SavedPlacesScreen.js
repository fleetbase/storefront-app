import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faMapMarked } from '@fortawesome/free-solid-svg-icons';
import { Customer } from '@fleetbase/storefront';
import { useStorefrontSdk, getCustomer } from '../../utils';
import { get } from '../../utils/storage';
import tailwind from '../../tailwind';

const StorefrontSavedPlacesScreen = ({ navigation, route }) => {
    const { attributes, key } = route.params;
    const [customer, setCustomer] = useState(getCustomer());
    const [places, setPlaces] = useState([]);
    const storefront = useStorefrontSdk();
    const insets = useSafeAreaInsets();

    const loadPlaces = () => {
        if (customer) {
            return customer.getAddresses().then((places) => {
                setPlaces(places);
            });
        }
    }

    // get addresses
    useEffect(() => {
        loadPlaces();
    }, []);

    return (
        <View style={[tailwind('w-full h-full bg-white'), { paddingTop: insets.top }]}>
            <FlatList
                data={places}
                renderItem={({ item, index }) => (
                    <View key={index}>
                        <TouchableOpacity>
                            <View>{item.getAttribute('address')}</View>
                        </TouchableOpacity>
                    </View>
                )}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    <View style={tailwind('flex flex-row items-center p-4')}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                            <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                                <FontAwesomeIcon icon={faTimes} />
                            </View>
                        </TouchableOpacity>
                        <Text style={tailwind('text-xl font-semibold')}>Your saved places</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={tailwind('h-full bg-white flex items-center justify-center')}>
                        <View style={tailwind('flex items-center justify-center w-full px-8')}>
                            <View style={tailwind('flex items-center justify-center my-6 rounded-full bg-gray-200 w-60 h-60')}>
                                <FontAwesomeIcon icon={faMapMarked} size={88} style={tailwind('text-gray-600')} />
                            </View>
                            <View style={tailwind('flex items-center justify-center mb-10')}>
                                <Text style={tailwind('font-bold text-xl mb-2 text-center text-gray-800')}>Your address book is empty</Text>
                                <Text style={tailwind('w-52 text-center text-gray-600 font-semibold')}>Looks like you haven't saved any addresses.</Text>
                            </View>
                            <TouchableOpacity style={tailwind('w-full')} onPress={() => navigation.navigate('EditPlace')}>
                                <View style={tailwind('flex items-center justify-center rounded-md px-8 py-2 bg-white border border-blue-500 shadow-sm')}>
                                    <Text style={tailwind('font-semibold text-blue-500 text-lg')}>Add new address</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
            />
        </View>
    );
};

export default StorefrontSavedPlacesScreen;
