import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, Image, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBox, faChevronRight, faLockOpen, faUser, faMapMarked, faCreditCard, faIdBadge } from '@fortawesome/free-solid-svg-icons';
import { useCustomer, signOut } from 'utils/Customer';
import { config } from 'utils';
import StorefrontHeader from 'ui/headers/StorefrontHeader';
import NetworkHeader from 'ui/headers/NetworkHeader';
import tailwind from 'tailwind';

const displayHeaderComponent = config('ui.accountScreen.displayHeaderComponent');
const fullHeight = Dimensions.get('window').height;
const containerHeight = displayHeaderComponent === true ? fullHeight - 224 : fullHeight;

const AccountScreen = ({ navigation, route }) => {
    const { info } = route.params;

    const [customer, setCustomer] = useCustomer();
    const [isLoading, setIsLoading] = useState(false);

    const RenderHeader = ({ style }) => {
        if (info.is_store) {
            return <StorefrontHeader info={info} style={style} {...config('ui.accountScreen.headerComponentProps')} />;
        }

        if (info.is_network) {
            return <NetworkHeader info={info} hideCategoryPicker={true} style={[tailwind('bg-white'), style]} {...config('ui.accountScreen.headerComponentProps')} />;
        }
    };

    return (
        <ImageBackground
            source={config(customer ? 'ui.accountScreen.signedInContainerBackgroundImage' : 'ui.accountScreen.signedOutContainerBackgroundImage') ?? {}}
            resizeMode={config(customer ? 'ui.accountScreen.signedInBackgroundResizeMode' : 'ui.accountScreen.signedOutBackgroundResizeMode') ?? 'cover'}
            style={[config(customer ? 'ui.accountScreen.signedInContainerBackgroundImageStyle' : 'ui.accountScreen.signedOutContainerBackgroundImageStyle')]}
        >
            {displayHeaderComponent === true && <RenderHeader style={[tailwind('bg-white bg-opacity-50'), config('ui.accountScreen.headerContainerStyle')]} />}
            <View style={[tailwind('bg-white'), config('ui.accountScreen.containerStyle'), { height: containerHeight }]}>
                {!customer && (
                    <View style={tailwind('w-full h-full relative')}>
                        <View style={tailwind('flex items-center justify-center w-full h-full relative')}>
                            {config('ui.accountScreen.displayEmptyStatePlaceholder') === true && (
                                <View style={[tailwind('-mt-20'), config('ui.accountScreen.emptyStatePlaceholderContainerStyle')]}>
                                    <View
                                        style={[
                                            tailwind('flex items-center justify-center mb-10 rounded-full bg-gray-100 w-60 h-60'),
                                            config('ui.accountScreen.emptyStatePlaceholderIconContainerStyle'),
                                        ]}
                                    >
                                        <FontAwesomeIcon icon={faIdBadge} size={88} style={[tailwind('text-gray-600'), config('ui.accountScreen.emptyStatePlaceholderIconStyle')]} />
                                    </View>
                                    <Text style={[tailwind('text-lg text-center font-semibold mb-10'), config('ui.accountScreen.emptyStatePlaceholderTextStyle')]}>
                                        Create an account or login
                                    </Text>
                                </View>
                            )}
                            <View style={[tailwind('px-3 flex flex-row w-full'), config('ui.accountScreen.actionButtonsContainerStyle')]}>
                                <View style={tailwind('w-1/2 px-1')}>
                                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                        <View style={[tailwind('btn border border-gray-100 bg-gray-100'), config('ui.accountScreen.loginButtonStyle')]}>
                                            <Text style={[tailwind('font-semibold text-gray-900 text-sm'), config('ui.accountScreen.loginButtonTextStyle')]} numberOfLines={1}>
                                                Login
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                                <View style={tailwind('w-1/2 px-1')}>
                                    <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
                                        <View style={[tailwind('btn border border-gray-100 bg-gray-100'), config('ui.accountScreen.createAccountButtonStyle')]}>
                                            <Text style={[tailwind('font-semibold text-gray-900 text-sm'), config('ui.accountScreen.createAccountButtonTextStyle')]} numberOfLines={1}>
                                                Create Account
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
                {customer && (
                    <View style={tailwind('w-full h-full relative')}>
                        <View style={tailwind('p-4 mb-4 bg-white relative')}>
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
                            </View>
                        </View>
                        <View style={tailwind('p-4')}>
                            <View style={tailwind('flex flex-row items-center justify-center')}>
                                <TouchableOpacity style={tailwind('flex-1')} onPress={signOut}>
                                    <View style={tailwind('btn border border-gray-200')}>
                                        {isLoading && <ActivityIndicator style={tailwind('mr-2')} />}
                                        <Text style={tailwind('font-semibold text-black text-base')}>Sign Out</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </ImageBackground>
    );
};

export default AccountScreen;
