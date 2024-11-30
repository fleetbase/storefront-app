import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, FlatList, Pressable } from 'react-native';
import { Avatar, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { abbreviateName } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import storage from '../utils/storage';

const menuItems = [
    { id: '1', title: 'Order History', screen: 'OrderHistory' },
    { id: '2', title: 'Account', screen: 'Account' },
    { id: '3', title: 'Payment Methods', screen: 'PaymentMethods' },
    { id: '4', title: 'Address Book', screen: 'AddressBook' },
];

const ProfileScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { customer, logout } = useAuth();

    const handleClearCache = () => {
        storage.clearStore();
        toast.success('Cache cleared.', { position: ToastPosition.BOTTOM });
    };

    const handleLogin = () => {
        navigation.navigate('Login');
    };

    const handleSignout = () => {
        logout();
    };

    const handleViewProfile = () => {
        // navigate to profile view
    };

    const renderMenuItem = ({ item }) => (
        <Pressable
            onPress={() => navigation.navigate(item.screen)}
            style={({ pressed }) => ({
                backgroundColor: pressed ? theme.secondary.val : theme.background.val,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            })}
        >
            <Text fontWeight='bold' fontSize='$6' color='$textPrimary'>
                {item.title}
            </Text>
            <FontAwesomeIcon icon={faChevronRight} size={16} color={theme.textSecondary.val} />
        </Pressable>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background' space='$3' padding='$5'>
                <XStack paddingVertical='$3' alignItems='center' justifyContent='space-between'>
                    <YStack>
                        <Text fontSize='$7' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                            Hi {customer.getAttribute('name')}!
                        </Text>
                    </YStack>
                    <YStack>
                        <Pressable onPress={handleViewProfile}>
                            <Avatar circular size='$7'>
                                <Avatar.Image accessibilityLabel={customer.getAttribute('name')} src={customer.getAttribute('photo_url')} />
                                <Avatar.Fallback backgroundColor='$blue10'>
                                    <Text fontSize='$5' fontWeight='bold' color='white' textTransform='uppercase'>
                                        {abbreviateName(customer.getAttribute('name'))}
                                    </Text>
                                </Avatar.Fallback>
                            </Avatar>
                        </Pressable>
                    </YStack>
                </XStack>
                <YStack borderColor='$borderColorWithShadow' borderWidth={1} borderRadius='$4' overflow='hidden' bg='$surface'>
                    <FlatList
                        data={menuItems}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMenuItem}
                        ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                    />
                </YStack>
            </YStack>
        </SafeAreaView>
    );
};

export default ProfileScreen;
