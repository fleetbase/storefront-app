import React, { useState, useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, FlatList, Pressable } from 'react-native';
import { Avatar, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { abbreviateName, storefrontConfig } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import storage from '../utils/storage';

const PAYMENT_GATEWAYS_NO_PAYMENT_METHODS = ['qpay'];
const ProfileScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { customer, logout } = useAuth();
    const { t } = useLanguage();

    const handleManagePaymentMethods = useCallback(() => {
        if (storefrontConfig('paymentGateway') === 'stripe') {
            return navigation.navigate('StripeCustomer');
        }
    }, [navigation]);

    const handlePressMenuItem = useCallback(
        (item) => {
            if (item && typeof item.handler === 'function') {
                return item.handler(item);
            }

            return navigation.navigate(item.screen);
        },
        [navigation]
    );

    const handleViewProfile = useCallback(() => {
        navigation.navigate('Account');
    }, [navigation]);

    const menuItems = useMemo(() => {
        const items = [
            { id: '1', title: t('ProfileScreen.orderHistory'), screen: 'OrderHistory' },
            { id: '2', title: t('ProfileScreen.account'), screen: 'Account' },
            {
                id: '3',
                title: t('ProfileScreen.paymentMethods'),
                screen: 'PaymentMethods',
                handler: handleManagePaymentMethods,
                hidden: PAYMENT_GATEWAYS_NO_PAYMENT_METHODS.includes(storefrontConfig('paymentGateway')),
            },
            { id: '4', title: t('ProfileScreen.addressBook'), screen: 'AddressBook' },
        ];

        return items.filter((item) => !item.hidden);
    }, [handleManagePaymentMethods]);

    const renderMenuItem = ({ item }) => (
        <Pressable
            onPress={() => handlePressMenuItem(item)}
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
            <YStack flex={1} bg='$background' space='$3' px='$5'>
                <XStack paddingVertical='$3' alignItems='center' justifyContent='space-between'>
                    <YStack>
                        <Text fontSize='$7' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                            {t('ProfileScreen.greeting', { customerName: customer.getAttribute('name') })}
                        </Text>
                    </YStack>
                    <YStack>
                        <Pressable onPress={handleViewProfile}>
                            <Avatar circular size='$7'>
                                <Avatar.Image accessibilityLabel={customer.getAttribute('name')} src={customer.getAttribute('photo_url')} />
                                <Avatar.Fallback delayMs={800} backgroundColor='$primary' textAlign='center' alignItems='center' justifyContent='center'>
                                    <Text fontSize='$8' fontWeight='bold' color='$white' textTransform='uppercase' textAlign='center'>
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
