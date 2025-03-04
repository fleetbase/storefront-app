import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, FlatList, Pressable, ScrollView, Linking } from 'react-native';
import { Spinner, Avatar, Text, YStack, XStack, Separator, Button, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { showActionSheet, abbreviateName, storefrontConfig } from '../utils';
import { toast } from '../utils/toast';
import { titleize } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import useAppTheme from '../hooks/use-app-theme';
import DeviceInfo from 'react-native-device-info';
import storage from '../utils/storage';
import AbsoluteTabBarScreenWrapper from '../components/AbsoluteTabBarScreenWrapper';

const AccountScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { t, language, languages, setLocale } = useLanguage();
    const { userColorScheme, appTheme, changeScheme, schemes } = useAppTheme();
    const { customer, logout, isSigningOut } = useAuth();

    const handleClearCache = () => {
        storage.clearStore();
        toast.success(t('AccountScreen.cacheCleared'));
    };

    const handleSignout = () => {
        logout();
        toast.success(t('AccountScreen.signedOut'));
    };

    const handleOpenTermsOfService = () => {
        const termsUrl = storefrontConfig('termsUrl');
        if (termsUrl) {
            Linking.openURL(termsUrl);
        }
    };

    const handleOpenPrivacyPolicy = () => {
        const privacyUrl = storefrontConfig('privacyUrl');
        if (privacyUrl) {
            Linking.openURL(privacyUrl);
        }
    };

    const handleChangeProfilePhoto = () => {
        showActionSheet({
            options: [
                t('AccountScreen.changeProfilePhotoOptions.takePhoto'),
                t('AccountScreen.changeProfilePhotoOptions.photoLibrary'),
                t('AccountScreen.changeProfilePhotoOptions.deleteProfilePhoto'),
                t('common.cancel'),
            ],
            cancelButtonIndex: 3,
            destructiveButtonIndex: 2,
            onSelect: (buttonIndex) => {
                switch (buttonIndex) {
                    case 0:
                        console.log('Take Photo selected');
                        // Trigger Take Photo functionality here
                        break;
                    case 1:
                        console.log('Photo Library selected');
                        // Trigger Photo Library functionality here
                        break;
                    case 2:
                        console.log('Delete Profile Photo selected');
                        // Trigger Delete functionality here
                        break;
                    default:
                        console.log('Action canceled');
                        break;
                }
            },
        });
    };

    const handleSelectScheme = () => {
        const options = [...schemes.map((scheme) => titleize(scheme)), t('common.cancel')];
        showActionSheet({
            options,
            cancelButtonIndex: options.length - 1,
            onSelect: (buttonIndex) => {
                if (buttonIndex !== options.length - 1) {
                    const selectedScheme = schemes[buttonIndex];
                    changeScheme(selectedScheme);
                    toast.success(t('AccountScreen.schemeChanged', { selectedScheme }));
                }
            },
        });
    };

    const handleLanguageSelect = () => {
        const options = [...languages.map((lang) => lang.native), t('common.cancel')];
        showActionSheet({
            options,
            cancelButtonIndex: options.length - 1,
            onSelect: (buttonIndex) => {
                if (buttonIndex !== options.length - 1) {
                    const selectedLanguage = languages[buttonIndex];
                    setLocale(selectedLanguage.code);
                    toast.success(t('AccountScreen.languageChanged', { selectedLanguage: selectedLanguage.native }));
                }
            },
        });
    };

    // Render an item in the menu
    const renderMenuItem = ({ item }) => (
        <Pressable
            onPress={item.onPress}
            style={({ pressed }) => ({
                backgroundColor: pressed ? theme.secondary.val : theme.background.val,
                paddingVertical: 12,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            })}
        >
            <XStack alignItems='center' space='$3'>
                {item.leftComponent}
                <Text fontSize='$6' fontWeight='bold' color='$textSecondary'>
                    {item.title}
                </Text>
            </XStack>
            <XStack alignItems='center' space='$2'>
                {item.rightComponent}
                <FontAwesomeIcon icon={faChevronRight} size={16} color={theme.textSecondary.val} />
            </XStack>
        </Pressable>
    );

    // Account menu items
    const accountMenu = [
        {
            title: t('AccountScreen.profilePhoto'),
            rightComponent: (
                <Avatar circular size='$2'>
                    <Avatar.Image src={customer.getAttribute('photo_url')} />
                    <Avatar.Fallback backgroundColor='$primary'>
                        <Text color='$white' fontWeight='bold'>
                            {abbreviateName(customer.getAttribute('name'))}
                        </Text>
                    </Avatar.Fallback>
                </Avatar>
            ),
            onPress: () => handleChangeProfilePhoto(),
        },
        {
            title: t('AccountScreen.email'),
            rightComponent: (
                <Text color='$textSecondary' opacity={0.5}>
                    {customer.getAttribute('email')}
                </Text>
            ),
            onPress: () => navigation.navigate('EditAccountProperty', { property: { name: t('AccountScreen.email'), key: 'email', component: 'input' } }),
        },
        {
            title: t('AccountScreen.phoneNumber'),
            rightComponent: (
                <Text color='$textSecondary' opacity={0.5}>
                    {customer.getAttribute('phone')}
                </Text>
            ),
            onPress: () => navigation.navigate('EditAccountProperty', { property: { name: t('AccountScreen.phoneNumber'), key: 'phone', component: 'phone-input' } }),
        },
        {
            title: t('AccountScreen.name'),
            rightComponent: (
                <Text color='$textSecondary' opacity={0.5}>
                    {customer.getAttribute('name')}
                </Text>
            ),
            onPress: () => navigation.navigate('EditAccountProperty', { property: { name: t('AccountScreen.name'), key: 'name', component: 'input' } }),
        },
        {
            title: 'Language',
            rightComponent: (
                <Text color='$textSecondary' opacity={0.5}>
                    {language.native}
                </Text>
            ),
            onPress: handleLanguageSelect,
        },
        {
            title: t('AccountScreen.theme'),
            rightComponent: (
                <Text color='$textSecondary' opacity={0.5}>
                    {titleize(userColorScheme)}
                </Text>
            ),
            onPress: handleSelectScheme,
        },
        {
            title: t('AccountScreen.deleteAccount'),
            rightComponent: null,
            onPress: () => navigation.navigate('DeleteAccount'),
        },
        {
            title: t('AccountScreen.termsOfService'),
            rightComponent: null,
            onPress: handleOpenTermsOfService,
        },
    ];

    // Data Protection menu items
    const dataProtectionMenu = [
        {
            title: t('AccountScreen.privacyPolicy'),
            rightComponent: null,
            onPress: handleOpenPrivacyPolicy,
        },
        {
            title: t('AccountScreen.clearCache'),
            rightComponent: null,
            onPress: handleClearCache,
        },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <AbsoluteTabBarScreenWrapper>
                    <YStack flex={1} bg='$background' space='$8' pt='$3'>
                        <YStack space='$2'>
                            <XStack px='$3' justifyContent='space-between'>
                                <YStack>
                                    <Text fontSize='$8' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                                        {t('AccountScreen.account')}
                                    </Text>
                                </YStack>
                                <YStack>
                                    <Text fontSize='$3' color='$textSecondary' numberOfLines={1}>
                                        v{DeviceInfo.getVersion()}
                                    </Text>
                                </YStack>
                            </XStack>
                            <FlatList
                                data={accountMenu}
                                keyExtractor={(item) => item.title}
                                renderItem={renderMenuItem}
                                ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                                scrollEnabled={false}
                            />
                        </YStack>
                        <YStack space='$2'>
                            <YStack px='$3'>
                                <Text color='$textPrimary' fontSize='$8' fontWeight='bold'>
                                    {t('AccountScreen.dataProtection')}
                                </Text>
                            </YStack>
                            <FlatList
                                data={dataProtectionMenu}
                                keyExtractor={(item) => item.title}
                                renderItem={renderMenuItem}
                                ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                                scrollEnabled={false}
                            />
                        </YStack>
                        <YStack padding='$4' mb='$5'>
                            <Button marginTop='$4' bg='$error' borderColor='$errorBorder' borderWidth={1} size='$5' onPress={handleSignout} rounded='true' width='100%'>
                                <Button.Icon>{isSigningOut ? <Spinner color='$errorText' /> : <YStack />}</Button.Icon>
                                <Button.Text color='$errorText' fontWeight='bold'>
                                    {t('AccountScreen.signOut')}
                                </Button.Text>
                            </Button>
                        </YStack>
                    </YStack>
                </AbsoluteTabBarScreenWrapper>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AccountScreen;
