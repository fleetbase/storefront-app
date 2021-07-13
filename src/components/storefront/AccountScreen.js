import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBox, faChevronRight, faLockOpen, faUser, faMapMarked, faCreditCard, faIdBadge } from '@fortawesome/free-solid-svg-icons';
import { Customer } from '@fleetbase/storefront';
import { useStorefrontSdk } from '../../utils';
import { useStorage, get, set, clear } from '../../utils/storage';
import { useCustomer } from '../../utils/customer';
import Header from './Header';
import tailwind from '../../tailwind';

const StorefrontAccountScreen = ({ navigation, route }) => {
    const storefront = useStorefrontSdk();
    const { info } = route.params;
    const [customer, setCustomer] = useCustomer();
    const [isLoading, setIsLoading] = useState(false);

    const signOut = () => {
        setIsLoading(true);
        clear();
        setIsLoading(false);
        setCustomer(null);
    };

    useEffect(() => {
        // Listen for customer created event
        const customerUpdatedListener = EventRegister.addEventListener('customer.updated', (customer) => {
            setCustomer(customer);
        });

        return () => {
            // Remove cart.changed event listener
            EventRegister.removeEventListener(customerUpdatedListener);
        };
    }, []);

    return (
        <View>
            <Header info={info} />
            {!customer && (
                <View style={tailwind('w-full bg-white h-full')}>
                    <View style={tailwind('flex items-center justify-center w-full')}>
                        <View style={tailwind('flex items-center justify-center my-6 rounded-full bg-gray-100 w-60 h-60')}>
                            <FontAwesomeIcon icon={faIdBadge} size={88} style={tailwind('text-gray-600')} />
                        </View>
                        <Text style={tailwind('text-lg text-center font-semibold mb-6')}>Create an account or login</Text>
                        <View style={tailwind('px-6 w-full')}>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={tailwind('mb-5')}>
                                <View style={tailwind('btn border border-gray-100 bg-gray-100')}>
                                    <Text style={tailwind('font-semibold text-gray-900 text-base')}>Login</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
                                <View style={tailwind('btn border border-gray-100 bg-gray-100')}>
                                    <Text style={tailwind('font-semibold text-gray-900 text-base')}>Create Account</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
            {customer && (
                <View style={tailwind('w-full h-full')}>
                    <View style={tailwind('p-4 mb-4 bg-white')}>
                        <View style={tailwind('flex flex-row')}>
                            <View style={tailwind('mr-4')}>
                                <Image source={{ uri: customer.getAttribute('photo_url') }} style={tailwind('w-12 h-12 rounded-full')} />
                            </View>
                            <View>
                                <Text style={tailwind('text-lg font-semibold')}>Hello, {customer.getAttribute('name')}</Text>
                                <Text style={tailwind('text-gray-500')}>{customer.getAttribute('phone')}</Text>
                            </View>
                        </View>
                    </View>
                    {/* <View style={tailwind('p-4 mb-4 bg-white')}>
                        <View style={tailwind('flex flex-row')}>
                            <Text style={tailwind('font-semibold text-base')}>Recent Orders</Text>
                        </View>
                    </View> */}
                    <View style={tailwind('mb-4 bg-white')}>
                        <View style={tailwind('flex flex-row p-4')}>
                            <Text style={tailwind('font-semibold text-base')}>My Account</Text>
                        </View>
                        <View>
                            <TouchableOpacity onPress={() => navigation.navigate('EditProfile', { attributes: customer.serialize() })}>
                                <View style={tailwind('flex flex-row items-center justify-between p-4 border-b border-gray-200')}>
                                    <View style={tailwind('flex flex-row items-center')}>
                                        <FontAwesomeIcon icon={faUser} size={18} style={tailwind('mr-3 text-gray-600')} />
                                        <Text style={tailwind('text-gray-700 text-base')}>Profile</Text>
                                    </View>
                                    <View>
                                        <FontAwesomeIcon icon={faChevronRight} size={18} style={tailwind('text-gray-600')} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')}>
                                <View style={tailwind('flex flex-row items-center justify-between p-4 border-b border-gray-200')}>
                                    <View style={tailwind('flex flex-row items-center')}>
                                        <FontAwesomeIcon icon={faBox} size={18} style={tailwind('mr-3 text-gray-600')} />
                                        <Text style={tailwind('text-gray-700 text-base')}>Orders</Text>
                                    </View>
                                    <View>
                                        <FontAwesomeIcon icon={faChevronRight} size={18} style={tailwind('text-gray-600')} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('SavedPlaces', { attributes: customer.serialize() })}>
                                <View style={tailwind('flex flex-row items-center justify-between p-4 border-b border-gray-200')}>
                                    <View style={tailwind('flex flex-row items-center')}>
                                        <FontAwesomeIcon icon={faMapMarked} size={18} style={tailwind('mr-3 text-gray-600')} />
                                        <Text style={tailwind('text-gray-700 text-base')}>Places</Text>
                                    </View>
                                    <View>
                                        <FontAwesomeIcon icon={faChevronRight} size={18} style={tailwind('text-gray-600')} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('PaymentMethods')}>
                                <View style={tailwind('flex flex-row items-center justify-between p-4 border-b border-gray-200')}>
                                    <View style={tailwind('flex flex-row items-center')}>
                                        <FontAwesomeIcon icon={faCreditCard} size={18} style={tailwind('mr-3 text-gray-600')} />
                                        <Text style={tailwind('text-gray-700 text-base')}>Payment Methods</Text>
                                    </View>
                                    <View>
                                        <FontAwesomeIcon icon={faChevronRight} size={18} style={tailwind('text-gray-600')} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('ChangePassword')}>
                                <View style={tailwind('flex flex-row items-center justify-between p-4')}>
                                    <View style={tailwind('flex flex-row items-center')}>
                                        <FontAwesomeIcon icon={faLockOpen} size={18} style={tailwind('mr-3 text-gray-600')} />
                                        <Text style={tailwind('text-gray-700 text-base')}>Change Password</Text>
                                    </View>
                                    <View>
                                        <FontAwesomeIcon icon={faChevronRight} size={18} style={tailwind('text-gray-600')} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={tailwind('p-4')}>
                        <View style={tailwind('flex flex-row items-center justify-center')}>
                            <TouchableOpacity style={tailwind('flex-1')} onPress={signOut}>
                                <View style={tailwind('btn border border-gray-400')}>
                                    {isLoading && <ActivityIndicator style={tailwind('mr-2')} />}
                                    <Text style={tailwind('font-semibold text-black text-base')}>Sign Out</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

export default StorefrontAccountScreen;
