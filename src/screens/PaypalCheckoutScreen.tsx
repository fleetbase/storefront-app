import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, YStack, XStack, useTheme } from 'tamagui';
import CustomerLocationSelect from '../components/CustomerLocationSelect';
import CartContents from '../components/CartContents';
import CheckoutOptions from '../components/CheckoutOptions';
import CheckoutTotal from '../components/CheckoutTotal';
import DeliveryRoutePreview from '../components/DeliveryRoutePreview';
import CheckoutButton from '../components/CheckoutButton';
import { storefrontConfig } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';

const PaypalCheckoutScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();

    const onCompleteOrder = () => {};
    const handleDeliveryLocationChange = () => {};
    const setTipOptions = () => {};
    const lineItems = [];
    const totalAmount = 0;
    const isNotReady = true;
    const isLoading = false;

    return (
        <YStack bg='$background'>
            <ScrollView showsVerticalScrollIndicator={false}>
                <YStack flex={1} bg='$background' space='$2'>
                    <YStack height={300}>
                        <DeliveryRoutePreview />
                    </YStack>
                    <YStack padding='$3' space='$5'>
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                Your delivery location
                            </Text>
                            <CustomerLocationSelect onChange={handleDeliveryLocationChange} />
                        </YStack>
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                Your cart
                            </Text>
                            <CartContents />
                        </YStack>
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                Checkout options
                            </Text>
                            <CheckoutOptions onChange={setTipOptions} />
                        </YStack>
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                Total
                            </Text>
                            <CheckoutTotal lineItems={lineItems} />
                        </YStack>
                        <YStack width='100%' height={200} />
                    </YStack>
                </YStack>
            </ScrollView>
            <XStack animate='bouncy' position='absolute' bottom={0} left={0} right={0} padding='$5' zIndex={5}>
                <CheckoutButton onPress={onCompleteOrder} total={totalAmount} disabled={isNotReady} isLoading={isLoading} />
            </XStack>
        </YStack>
    );
};

export default PaypalCheckoutScreen;
