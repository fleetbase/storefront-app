import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, FlatList, Pressable } from 'react-native';
import { Spinner, Avatar, Text, YStack, XStack, Separator, Button, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { showActionSheet, abbreviateName } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import DeviceInfo from 'react-native-device-info';
import storage from '../utils/storage';

const AccountScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { customer, logout, isSigningOut } = useAuth();

    const handleClearCache = () => {
        storage.clearStore();
        toast.success('Cache cleared.', { position: ToastPosition.BOTTOM });
    };

    const handleSignout = () => {
        logout();
        toast.success('Signed out.');
    };

    const handleChangeProfilePhoto = () => {
        showActionSheet({
            options: ['Take Photo', 'Photo Library', 'Delete Profile Photo', 'Cancel'],
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
                <Text fontSize='$6' fontWeight='bold' color='$textPrimary'>
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
            title: 'Profile Photo',
            rightComponent: (
                <Avatar rounded size='$2'>
                    <Avatar.Image src={customer.getAttribute('photo_url')} />
                    <Avatar.Fallback backgroundColor='$blue10'>
                        <Text color='white' fontWeight='bold'>
                            {abbreviateName(customer.getAttribute('name'))}
                        </Text>
                    </Avatar.Fallback>
                </Avatar>
            ),
            rightComponent: null,
            onPress: () => handleChangeProfilePhoto(),
        },
        {
            title: 'Email',
            rightComponent: <Text color='$textSecondary'>{customer.getAttribute('email')}</Text>,
            onPress: () => navigation.navigate('EditAccountProperty', { property: { name: 'Email', key: 'email', component: 'input' } }),
        },
        {
            title: 'Phone Number',
            rightComponent: <Text color='$textSecondary'>{customer.getAttribute('phone')}</Text>,
            onPress: () => navigation.navigate('EditAccountProperty', { property: { name: 'Phone Number', key: 'phone', component: 'phone-input' } }),
        },
        {
            title: 'Name',
            rightComponent: <Text color='$textSecondary'>{customer.getAttribute('name')}</Text>,
            onPress: () => navigation.navigate('EditAccountProperty', { property: { name: 'Name', key: 'name', component: 'input' } }),
        },
        {
            title: 'Language',
            rightComponent: <Text color='$textSecondary'>English</Text>, // Replace with dynamic value if available
            onPress: () => navigation.navigate('LanguageSettings'),
        },
        {
            title: 'Delete Account',
            rightComponent: null,
            onPress: () => navigation.navigate('DeleteAccount'),
        },
        {
            title: 'Terms of Service',
            rightComponent: null,
            onPress: () => navigation.navigate('TermsOfService'),
        },
    ];

    // Data Protection menu items
    const dataProtectionMenu = [
        {
            title: 'Privacy Policy',
            rightComponent: null,
            onPress: () => navigation.navigate('PrivacyPolicy'),
        },
        {
            title: 'Clear Cache',
            rightComponent: null,
            onPress: handleClearCache,
        },
        {
            title: 'Tracking',
            rightComponent: <Text color='$textSecondary'>Enabled</Text>, // Replace with dynamic value if available
            onPress: () => navigation.navigate('TrackingSettings'),
        },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background' space='$3' padding='$2'>
                <XStack paddingVertical='$3' paddingHorizontal='$3' justifyContent='space-between'>
                    <YStack>
                        <Text fontSize='$8' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                            Account
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
                />

                <YStack paddingHorizontal='$3'>
                    <Text fontSize='$6' fontWeight='bold' marginBottom='$1'>
                        Data Protection
                    </Text>
                </YStack>
                <FlatList
                    data={dataProtectionMenu}
                    keyExtractor={(item) => item.title}
                    renderItem={renderMenuItem}
                    ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                />

                <Button marginTop='$4' bg='$red-900' size='$5' onPress={handleSignout} rounded width='100%'>
                    <Button.Icon>{isSigningOut ? <Spinner color='$red-400' /> : <YStack />}</Button.Icon>
                    <Button.Text color='$red-400' fontWeight='bold'>
                        Sign Out
                    </Button.Text>
                </Button>
            </YStack>
        </SafeAreaView>
    );
};

export default AccountScreen;
