import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { Store, StoreLocation } from '@fleetbase/storefront';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircle, faPhone, faGlobe, faAt } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faInstagram, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { lowercase } from '../utils/format';
import useStorefront from '../hooks/use-storefront';
import StoreHeader from '../components/StoreHeader';
import StoreLocationSchedule from '../components/StoreLocationSchedule';
import StoreRating from '../components/StoreRating';
import StoreRecentReviews from '../components/StoreRecentReviews';

const StoreInfoScreen = ({ route }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { adapter } = useStorefront();
    const { t } = useLanguage();
    const params = route.params ?? {};
    const store = new Store(params.store, adapter);
    const storeLocation = new StoreLocation(params.storeLocation, adapter);

    const ContentPanel = ({ title = null, children }) => {
        return (
            <YStack borderRadius='$4' borderWidth={1} borderColor='$borderColor'>
                <XStack bg='$surface' px='$4' py='$3' justifyContent='space-between' borderTopLeftRadius='$4' borderTopRightRadius='$4' borderBottomWidth={1} borderColor='$borderColor'>
                    <YStack>
                        {typeof title !== 'string' ? (
                            title
                        ) : (
                            <Text color='$textPrimary' fontWeight='bold' fontSize={16}>
                                {title}
                            </Text>
                        )}
                    </YStack>
                </XStack>
                <YStack borderBottomLeftRadius='$4' borderBottomRightRadius='$4'>
                    {children}
                </YStack>
            </YStack>
        );
    };

    const Pill = ({ icon = faCircle, value, onPress }) => {
        return (
            <Pressable onPress={onPress}>
                <XStack alignItems='center' py='$1' ml='$3' pl='$2' pr='$3' space='$2' borderRadius='$6' backgroundColor='$surface' borderWidth={1} borderColor='$borderColorWithShadow'>
                    <FontAwesomeIcon icon={icon} color={theme.textPrimary.val} size={12} />
                    <Text fontSize='$5' color='$textPrimary' numberOfLines={1}>
                        {value}
                    </Text>
                </XStack>
            </Pressable>
        );
    };

    return (
        <YStack flex={1} bg='$background' width='100%' height='100%'>
            <StoreHeader
                storeName={store.getAttribute('name')}
                logoUrl={store.getAttribute('logo_url')}
                backgroundUrl={store.getAttribute('backdrop_url')}
                description={store.getAttribute('description')}
                defaultStoreLocation={storeLocation}
            />
            <YStack pt='$4'>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {store.isAttributeFilled('phone') && (
                        <Pill
                            icon={faPhone}
                            value={store.getAttribute('phone')}
                            onPress={() => {
                                const phone = store.getAttribute('phone');
                                Linking.openURL(`tel:${phone}`);
                            }}
                        />
                    )}
                    {store.isAttributeFilled('email') && (
                        <Pill
                            icon={faAt}
                            value={store.getAttribute('email')}
                            onPress={() => {
                                const email = store.getAttribute('email');
                                Linking.openURL(`mailto:${email}`);
                            }}
                        />
                    )}
                    {store.isAttributeFilled('website') && (
                        <Pill
                            icon={faGlobe}
                            value={store.getAttribute('website')}
                            onPress={() => {
                                let url = store.getAttribute('website');
                                if (!/^https?:\/\//i.test(url)) {
                                    url = 'http://' + url;
                                }
                                Linking.openURL(url);
                            }}
                        />
                    )}
                    {store.isAttributeFilled('instagram') && (
                        <Pill
                            icon={faInstagram}
                            value={lowercase(store.getAttribute('instagram'))}
                            onPress={async () => {
                                const username = store.getAttribute('instagram');
                                const appURL = `instagram://user?username=${username}`;
                                const webURL = `https://www.instagram.com/${username}`;
                                const supported = await Linking.canOpenURL(appURL);
                                Linking.openURL(supported ? appURL : webURL);
                            }}
                        />
                    )}
                    {store.isAttributeFilled('facebook') && (
                        <Pill
                            icon={faFacebook}
                            value={lowercase(store.getAttribute('facebook'))}
                            onPress={async () => {
                                const username = store.getAttribute('facebook');
                                const appURL = `fb://profile/${username}`;
                                const webURL = `https://www.facebook.com/${username}`;
                                const supported = await Linking.canOpenURL(appURL);
                                Linking.openURL(supported ? appURL : webURL);
                            }}
                        />
                    )}
                    {store.isAttributeFilled('twitter') && (
                        <Pill
                            icon={faXTwitter}
                            value={lowercase(store.getAttribute('twitter'))}
                            onPress={async () => {
                                const username = store.getAttribute('twitter');
                                const appURL = `x://user?screen_name=${username}`;
                                const webURL = `https://x.com/${username}`;
                                const supported = await Linking.canOpenURL(appURL);
                                Linking.openURL(supported ? appURL : webURL);
                            }}
                        />
                    )}
                </ScrollView>
            </YStack>
            <YStack py='$4' px='$3' gap='$4'>
                <ContentPanel title='Hours'>
                    <YStack py='$2' px='$1'>
                        <StoreLocationSchedule storeLocation={storeLocation} />
                    </YStack>
                </ContentPanel>
                <ContentPanel
                    title={
                        <XStack alignItems='center' gap='$2'>
                            <Text>{t('StoreInfoScreen.reviewsAndRating')}</Text>
                            <StoreRating rating={store.getAttribute('rating')} size={15} />
                        </XStack>
                    }
                >
                    <YStack padding='$4'>
                        <StoreRecentReviews store={store} />
                    </YStack>
                </ContentPanel>
            </YStack>
        </YStack>
    );
};

export default StoreInfoScreen;
