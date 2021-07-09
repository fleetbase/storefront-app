import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Place, GoogleAddress } from '@fleetbase/sdk';
import { adapter } from '../../utils/use-fleetbase-sdk';
import { getCustomer } from '../../utils';
import useStorefrontSdk from '../../utils/use-storefront-sdk';
import tailwind from '../../tailwind';
import PhoneInput from '../ui/PhoneInput';

navigator.geolocation = require('react-native-geolocation-service');

const StorefrontEditPlaceScreen = ({ navigation, route }) => {
    const storefront = useStorefrontSdk();
    const customer = getCustomer();
    const insets = useSafeAreaInsets();
    const { attributes, title } = route.params;
    const [place, setPlace] = useState(new Place(attributes || {}, adapter));
    const [name, setName] = useState(place.getAttribute('name'));
    const [phone, setPhone] = useState(place.getAttribute('phone'));
    const [street1, setStreet1] = useState(place.getAttribute('street1'));
    const [street2, setStreet2] = useState(place.getAttribute('street2'));
    const [postalCode, setPostalCode] = useState(place.getAttribute('postal_code'));
    const [city, setCity] = useState(place.getAttribute('city'));
    const [province, setProvince] = useState(place.getAttribute('province'));
    const [country, setCountry] = useState(place.getAttribute('country'));
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const savePlace = () => {
        setIsLoading(true);

        return place
            .setAttributes({
                owner: customer.id,
                name,
                phone,
                street1,
                street2,
                postal_code: postalCode,
                city,
                province,
                country,
            })
            .save()
            .then(() => {
                setIsLoading(false);
                navigation.navigate('SavedPlaces');
            });
    };

    const deletePlace = () => {
        setIsDeleting(true);

        return place.destroy().then(() => {
            setIsDeleting(false);
            navigation.navigate('SavedPlaces');
        });
    }

    return (
        <View style={[tailwind('w-full h-full bg-white relative'), { paddingTop: insets.top }]}>
            <View style={tailwind('flex flex-row items-center justify-between p-4')}>
                <View style={tailwind('flex flex-row items-center')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={place.id ? faTimes : faArrowLeft} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>{title || 'Save new place'}</Text>
                </View>
                <View>
                    <TouchableOpacity onPress={savePlace} disabled={isDeleting || isLoading}>
                        <View style={tailwind('rounded-full bg-green-50 w-10 h-10 flex items-center justify-center')}>
                            {isLoading ? <ActivityIndicator color={'rgba(6, 78, 59, 1)'} /> : <FontAwesomeIcon icon={faSave} style={tailwind('text-green-900')} />}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView style={tailwind('w-full h-full bg-white pb-60')}>
                <View style={tailwind('p-4')}>
                    <View style={tailwind('mb-4')}>
                        <Text style={tailwind('font-semibold text-base text-black mb-2')}>Name</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            keyboardType={'default'}
                            placeholder={'e.g. Home / Work / School'}
                            placeholderTextColor={'rgba(107, 114, 128, 1)'}
                            style={tailwind('form-input')}
                        />
                    </View>
                    <View style={tailwind('mb-4')}>
                        <Text style={tailwind('font-semibold text-base text-black mb-2')}>Street address or P.O. Box</Text>
                        <TextInput
                            value={street1}
                            onChangeText={setStreet1}
                            keyboardType={'default'}
                            placeholder={'Street address or P.O. Box'}
                            placeholderTextColor={'rgba(107, 114, 128, 1)'}
                            style={tailwind('form-input')}
                        />
                    </View>
                    <View style={tailwind('mb-4')}>
                        <Text style={tailwind('font-semibold text-base text-black mb-2')}>Apt, suite, unit, building, floor, etc.</Text>
                        <TextInput
                            value={street2}
                            onChangeText={setStreet2}
                            keyboardType={'default'}
                            placeholder={'Apt, suite, unit, building, floor, etc.'}
                            placeholderTextColor={'rgba(107, 114, 128, 1)'}
                            style={tailwind('form-input')}
                        />
                    </View>
                    <View style={tailwind('mb-4')}>
                        <Text style={tailwind('font-semibold text-base text-black mb-2')}>City</Text>
                        <TextInput
                            value={city}
                            onChangeText={setCity}
                            keyboardType={'default'}
                            placeholder={'City'}
                            placeholderTextColor={'rgba(107, 114, 128, 1)'}
                            style={tailwind('form-input')}
                        />
                    </View>
                    <View style={tailwind('mb-4')}>
                        <Text style={tailwind('font-semibold text-base text-black mb-2')}>State or province</Text>
                        <TextInput
                            value={province}
                            onChangeText={setProvince}
                            keyboardType={'default'}
                            placeholder={'State or province'}
                            placeholderTextColor={'rgba(107, 114, 128, 1)'}
                            style={tailwind('form-input')}
                        />
                    </View>
                    <View style={tailwind('mb-4')}>
                        <Text style={tailwind('font-semibold text-base text-black mb-2')}>Postal code</Text>
                        <TextInput
                            value={postalCode}
                            onChangeText={setPostalCode}
                            keyboardType={'default'}
                            placeholder={'Postal code, zip'}
                            placeholderTextColor={'rgba(107, 114, 128, 1)'}
                            style={tailwind('form-input')}
                        />
                    </View>
                    <View style={tailwind('mb-4')}>
                        <Text style={tailwind('font-semibold text-base text-black mb-2')}>Country</Text>
                        <TextInput
                            value={country}
                            onChangeText={setCountry}
                            keyboardType={'default'}
                            placeholder={'Country'}
                            placeholderTextColor={'rgba(107, 114, 128, 1)'}
                            style={tailwind('form-input')}
                        />
                    </View>
                    <View style={tailwind('mb-4')}>
                        <Text style={tailwind('font-semibold text-base text-black mb-2')}>Phone number</Text>
                        <PhoneInput value={phone} onChangeText={setPhone} defaultCountry={country} />
                    </View>
                    <View style={tailwind('mb-4')}>
                        <TouchableOpacity onPress={savePlace} disabled={isDeleting || isLoading}>
                            <View style={tailwind('btn border bg-green-50 border-green-50')}>
                                {isLoading && <ActivityIndicator color={'rgba(6, 78, 59, 1)'} style={tailwind('mr-2')} />}
                                <Text style={tailwind('font-semibold text-green-900 text-lg text-center')}>Save place details</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View style={tailwind('mb-10')}>
                        <TouchableOpacity onPress={deletePlace} disabled={isDeleting || isLoading}>
                            <View style={tailwind('btn border bg-red-50 border-red-50')}>
                                {isDeleting && <ActivityIndicator color={'rgba(127, 29, 29, 1)'} style={tailwind('mr-2')} />}
                                <Text style={tailwind('font-semibold text-red-900 text-lg text-center')}>Delete place</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

export default StorefrontEditPlaceScreen;
