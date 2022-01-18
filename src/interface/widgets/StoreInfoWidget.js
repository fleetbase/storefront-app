import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faTwitter, faInstagram } from '@fortawesome/free-brands-svg-icons';
import { translate, config, isLastIndex, logError } from 'utils';
import { useLocale } from 'hooks';
import tailwind from 'tailwind';

const StoreInfoWidget = ({ info, store, storeLocation, wrapperStyle, containerStyle }) => {
    const [locale] = useLocale();
    const links = ['website', 'facebook', 'instagram', 'twitter'].filter((attr) => store.isAttributeFilled(attr));

    if (!links) {
        return <View />;
    }

    const openLink = (link) => {
        switch (link) {
            case 'website':
                const url = store.getAttribute('website');

                Linking.openURL(url).catch(logError);
                break;

            case 'facebook':
                const facebookId = store.getAttribute('facebook');

                Linking.openURL(`fb://page/${facebookId}`).catch(() => {
                    Linking.openURL(`https://www.facebook.com/${facebookId}`).catch(logError);
                });
                break;

            case 'instagram':
                const instagramId = store.getAttribute('instagram');

                Linking.openURL(`instagram://user?username=${instagramId}`).catch(() => {
                    Linking.openURL(`https://www.instagram.com/${instagramId}`).catch(logError);
                });
                break;

            case 'twitter':
                const twitterId = store.getAttribute('twitter');

                Linking.openURL(`twitter://user?screen_name=${twitterId}`).catch(() => {
                    Linking.openURL(`https://www.twitter.com/${twitterId}`).catch(logError);
                });
                break;

            default:
                break;
        }
    };

    const getIcon = (link) => {
        let icon = faGlobe;

        switch (link) {
            case 'facebook':
                icon = faFacebook;
                break;

            case 'instagram':
                icon = faInstagram;
                break;

            case 'twitter':
                icon = faTwitter;
                break;

            case 'website':
            default:
                icon = faGlobe;
                break;
        }

        return icon;
    };

    const getIconColor = (link) => {
        let color = 'text-gray-700';

        switch (link) {
            case 'facebook':
                color = 'text-blue-600';
                break;

            case 'instagram':
                color = 'text-purple-600';
                break;

            case 'twitter':
                color = 'text-blue-400';
                break;

            case 'website':
            default:
                color = 'text-green-500';
                break;
        }

        return color;
    };

    return (
        <View style={[wrapperStyle]}>
            <View style={[tailwind('bg-white p-4'), containerStyle]}>
                <Text style={tailwind('font-bold text-lg text-black mb-2')}>{translate('components.widgets.StoreInfoWidget.title')}</Text>
                {store.isAttributeFilled('description') && <Text style={tailwind('text-gray-500 mb-2')}>{store.getAttribute('description')}</Text>}
                <View>
                    {links.map((link, index) => (
                        <View key={index} style={tailwind('')}>
                            <TouchableOpacity
                                onPress={() => openLink(link)}
                                style={tailwind(`py-3 px-1 flex flex-row items-center justify-between ${!isLastIndex(links, index) ? 'border-b border-gray-200' : ''}`)}
                            >
                                <Text style={tailwind('text-sm font-semibold text-gray-800')} numberOfLines={1}>
                                    {store.getAttribute(link)}
                                </Text>
                                <FontAwesomeIcon icon={getIcon(link)} style={tailwind(getIconColor(link))} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

export default StoreInfoWidget;
