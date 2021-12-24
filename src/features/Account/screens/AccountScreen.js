import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, Image, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBox, faChevronRight, faLockOpen, faUser, faMapMarked, faCreditCard, faIdBadge } from '@fortawesome/free-solid-svg-icons';
import { useCustomer, signOut } from 'utils/Customer';
import { config, translate } from 'utils';
import { useLocale } from 'hooks';
import FastImage from 'react-native-fast-image';
import StorefrontHeader from 'ui/headers/StorefrontHeader';
import NetworkHeader from 'ui/headers/NetworkHeader';
import tailwind from 'tailwind';

const fullHeight = Dimensions.get('window').height;

const AccountScreen = ({ navigation, route }) => {
    const { info } = route.params;

    const [customer, setCustomer] = useCustomer();
    const [locale, setLocale] = useLocale();
    const [isLoading, setIsLoading] = useState(false);

    const displayHeaderComponent = config(customer ? 'ui.accountScreen.displaySignedInHeaderComponent' : 'ui.accountScreen.displaySignedOutHeaderComponent') ?? true;
    const containerHeight = displayHeaderComponent === true ? fullHeight - 224 : fullHeight;

    const RenderHeader = ({ style }) => {
        if (info.is_store) {
            return <StorefrontHeader info={info} style={style} {...config('ui.accountScreen.headerComponentProps')} />;
        }

        if (info.is_network) {
            return <NetworkHeader info={info} hideCategoryPicker={true} style={[tailwind('bg-white'), style]} {...config('ui.accountScreen.headerComponentProps')} />;
        }
    };

    const RenderBackground = (props) => {
        if (customer) {
            return (
                <ImageBackground
                    source={config('ui.accountScreen.signedInContainerBackgroundImage')}
                    resizeMode={config('ui.accountScreen.signedInBackgroundResizeMode') ?? 'cover'}
                    style={[config('ui.accountScreen.signedInContainerBackgroundImageStyle')]}
                >
                    {props.children}
                </ImageBackground>
            );
        }

        return (
            <ImageBackground
                source={config('ui.accountScreen.signedOutContainerBackgroundImage')}
                resizeMode={config('ui.accountScreen.signedOutBackgroundResizeMode') ?? 'cover'}
                style={[config('ui.accountScreen.signedOutContainerBackgroundImageStyle')]}
            >
                {props.children}
            </ImageBackground>
        );
    };

    return (
        <RenderBackground>
            {displayHeaderComponent === true && (
                <RenderHeader
                    style={[
                        tailwind('bg-white'),
                        config('ui.accountScreen.headerContainerStyle'),
                        customer ? config('ui.accountScreen.signedInHeaderContainerStyle') : config('ui.accountScreen.signedOutHeaderContainerStyle'),
                    ]}
                />
            )}
            <View
                style={[
                    tailwind('bg-white'),
                    config('ui.accountScreen.containerStyle'),
                    customer ? config('ui.accountScreen.signedInContainerStyle') : config('ui.accountScreen.signedOutContainerStyle'),
                    { height: containerHeight },
                ]}
            >
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
                                        {translate('Account.AccountScreen.title')}
                                    </Text>
                                </View>
                            )}
                            <View style={[tailwind('px-3 flex flex-row w-full'), config('ui.accountScreen.actionButtonsContainerStyle')]}>
                                <View style={tailwind('w-1/2 px-1')}>
                                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                        <View style={[tailwind('btn border border-gray-100 bg-gray-100'), config('ui.accountScreen.loginButtonStyle')]}>
                                            <Text style={[tailwind('font-semibold text-gray-900 text-sm'), config('ui.accountScreen.loginButtonTextStyle')]} numberOfLines={1}>
                                                {translate('Account.AccountScreen.loginButtonText')}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                                <View style={tailwind('w-1/2 px-1')}>
                                    <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
                                        <View style={[tailwind('btn border border-gray-100 bg-gray-100'), config('ui.accountScreen.createAccountButtonStyle')]}>
                                            <Text style={[tailwind('font-semibold text-gray-900 text-sm'), config('ui.accountScreen.createAccountButtonTextStyle')]} numberOfLines={1}>
                                                {translate('Account.AccountScreen.createAccountButtonText')}
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
                                    <FastImage source={{ uri: customer.getAttribute('photo_url') }} style={tailwind('w-12 h-12 rounded-full')} />
                                </View>
                                <View>
                                    <Text style={tailwind('text-lg font-semibold')}>
                                        {translate('Account.AccountScreen.userGreetingTitle', {
                                            customerName: customer.getAttribute('name'),
                                        })}
                                    </Text>
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
                                <Text style={tailwind('font-semibold text-base')}>{translate('Account.AccountScreen.accountMenuTitle')}</Text>
                            </View>
                            <View>
                                <TouchableOpacity onPress={() => navigation.navigate('EditProfile', { attributes: customer.serialize() })}>
                                    <View style={tailwind('flex flex-row items-center justify-between p-4 border-b border-gray-200')}>
                                        <View style={tailwind('flex flex-row items-center')}>
                                            <FontAwesomeIcon icon={faUser} size={18} style={tailwind('mr-3 text-gray-600')} />
                                            <Text style={tailwind('text-gray-700 text-base')}>{translate('Account.AccountScreen.profileLinkText')}</Text>
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
                                            <Text style={tailwind('text-gray-700 text-base')}>{translate('Account.AccountScreen.ordersLinkText')}</Text>
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
                                            <Text style={tailwind('text-gray-700 text-base')}>{translate('Account.AccountScreen.placesLinkText')}</Text>
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
                                        <Text style={tailwind('font-semibold text-black text-base')}>{translate('Account.AccountScreen.signoutButtonText')}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </RenderBackground>
    );
};

export default AccountScreen;
