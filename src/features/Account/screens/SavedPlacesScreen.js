import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faMapMarked, faPlus, faEdit, faStar, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Customer } from '@fleetbase/storefront';
import { Place, Collection, isResource } from '@fleetbase/sdk';
import { useStorefront, useCustomer, useDeliveryLocation } from 'hooks';
import { mutatePlaces } from 'utils';
import useFleetbase, { adapter as FleetbaseAdapter } from 'hooks/use-fleetbase';
import { useResourceStorage, useResourceCollection, get, set } from 'utils/Storage';
import tailwind from 'tailwind';

const { emit, addEventListener, removeEventListener } = EventRegister;

const SavedPlacesScreen = ({ navigation, route }) => {
    const { attributes, useLeftArrow } = route.params;

    const storefront = useStorefront();
    const fleetbase = useFleetbase();
    const insets = useSafeAreaInsets();

    const [places, setPlaces] = useResourceCollection('places', Place, FleetbaseAdapter, new Collection());
    const [deliverTo, setDeliverTo] = useDeliveryLocation();
    const [customer, setCustomer] = useCustomer();
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const isDefaultDeliveryLocation = (place) => deliverTo?.id === place?.id;

    const loadPlaces = (initialize = false) => {
        return new Promise((resolve) => {
            if (customer) {
                setIsInitializing(initialize === true);
                setIsLoading(initialize ? false : true);

                return customer.getSavedPlaces().then((places) => {
                    setPlaces(places);
                    setIsLoading(false);
                    setIsInitializing(false);

                    resolve(places);
                });
            }

            resolve(new Collection());
        });
    };

    // get addresses
    useEffect(() => {
        loadPlaces(true);

        // Listen for places collection mutate events
        const placesMutated = addEventListener('places.mutated', (place) => {
            mutatePlaces(places, place, (mutatedPlaces) => {
                setPlaces(mutatedPlaces);
            });
        });

        return () => {
            // Remove places.mutated event listener
            EventRegister.removeEventListener(placesMutated);
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
                                        <View style={tailwind('flex flex-row items-center mb-1')}>
                                            {isDefaultDeliveryLocation(item) && (
                                                <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-1')}>
                                                    <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                                </View>
                                            )}
                                            <Text style={tailwind('font-semibold uppercase')}>{item.getAttribute('name')}</Text>
                                        </View>
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
                                    <FontAwesomeIcon icon={useLeftArrow === true ? faArrowLeft : faTimes} />
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
                                {isInitializing ? <ActivityIndicator /> : <FontAwesomeIcon icon={faMapMarked} size={88} style={tailwind('text-gray-600')} />}
                            </View>

                            <View style={tailwind('w-full')}>
                                <View style={tailwind('flex items-center justify-center mb-10')}>
                                    <Text style={tailwind('font-bold text-xl mb-2 text-center text-gray-800')}>
                                        {isInitializing ? 'Loading your saved places' : 'You have no saved places'}
                                    </Text>
                                    {!isInitializing && <Text style={tailwind('w-52 text-center text-gray-600 font-semibold')}>Looks like you haven't saved any addresses.</Text>}
                                </View>
                                {!isInitializing && (
                                    <TouchableOpacity style={tailwind('w-full')} onPress={() => navigation.navigate('AddNewPlace')}>
                                        <View style={tailwind('flex items-center justify-center rounded-md px-8 py-2 bg-white border border-blue-500 shadow-sm')}>
                                            <Text style={tailwind('font-semibold text-blue-500 text-lg')}>Add new address</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                }
            />
        </View>
    );
};

export default SavedPlacesScreen;
