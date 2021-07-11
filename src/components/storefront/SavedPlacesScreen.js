import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faMapMarked, faPlus, faEdit } from '@fortawesome/free-solid-svg-icons';
import { Customer } from '@fleetbase/storefront';
import { Place, isResource } from '@fleetbase/sdk';
import { useStorefrontSdk } from '../../utils';
import { getCustomer } from '../../utils/customer';
import { adapter } from '../../utils/use-fleetbase-sdk';
import { useResourceStorage, get, set } from '../../utils/storage';
import tailwind from '../../tailwind';

const StorefrontSavedPlacesScreen = ({ navigation, route }) => {
    const { attributes, key } = route.params;
    const [places, setPlaces] = useResourceStorage('places', Place, adapter);
    const [isLoading, setIsLoading] = useState(false);
    const customer = getCustomer();
    const storefront = useStorefrontSdk();
    const insets = useSafeAreaInsets();

    const loadPlaces = (initialize = false) => {
        if (customer) {
            setIsLoading(initialize ? false : true);

            return customer.getAddresses().then((places) => {
                setPlaces(places);
                setIsLoading(false);
            });
        }
    };

    // fn to check if deliverTo location is indeed the place
    const isDeliverTo = (place) => {
        const deliverTo = get('deliver_to');

        if (deliverTo) {
            return deliverTo.id === place.id;
        }
    };

    // get addresses
    useEffect(() => {
        loadPlaces(true);

        // Listen for places collection mutate events
        const placesMutatedListener = EventRegister.addEventListener('places.mutated', (place) => {
            if (place.isSaved) {
                setPlaces(places.pushObject(place));
            } else if (place.isDeleted) {
                const index = places.findIndex(p => p.id === place.id);
                setPlaces(places.removeAt(index));
            }
        });

        return () => {
            // Remove places.mutated event listener
            EventRegister.removeEventListener(placesMutatedListener);
        };
    }, []);

    return (
        <View style={[tailwind('w-full h-full bg-white'), { paddingTop: insets.top }]}>
            <FlatList
                data={places}
                onRefresh={loadPlaces}
                refreshing={isLoading}
                renderItem={({ item, index }) => (
                    <View key={index}>
                        <TouchableOpacity onPress={() => navigation.navigate('EditPlaceForm', { attributes: item.serialize(), title: 'Edit place' })}>
                            <View style={tailwind('p-4 border-b border-gray-100')}>
                                <View style={tailwind('flex flex-row justify-between')}>
                                    <View style={tailwind('flex-1')}>
                                        <Text style={tailwind('font-semibold uppercase')}>{item.getAttribute('name')}</Text>
                                        <Text style={tailwind('uppercase')}>{item.getAttribute('street1')}</Text>
                                        <Text style={tailwind('uppercase')}>{item.getAttribute('postal_code')}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => navigation.navigate('EditPlaceForm', { attributes: item.serialize(), title: 'Edit place' })}>
                                        <View style={tailwind('rounded-full bg-gray-50 w-10 h-10 flex items-center justify-center')}>
                                            <FontAwesomeIcon icon={faEdit} style={tailwind('text-gray-900')} />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    <View style={tailwind('flex flex-row items-center justify-between p-4')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                                <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faTimes} />
                                </View>
                            </TouchableOpacity>
                            <Text style={tailwind('text-xl font-semibold')}>Your saved places</Text>
                        </View>
                        <View>
                            <TouchableOpacity onPress={() => navigation.navigate('AddNewPlace')}>
                                <View style={tailwind('rounded-full bg-blue-50 w-10 h-10 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faPlus} style={tailwind('text-blue-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
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
                            <TouchableOpacity style={tailwind('w-full')} onPress={() => navigation.navigate('AddNewPlace')}>
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
