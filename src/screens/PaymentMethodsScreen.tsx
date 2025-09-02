import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Spinner, Stack, Text, YStack } from 'tamagui';

const PaymentMethodsScreen = () => {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <YStack flex={1} alignItems='center' justifyContent='center' bg='white'>
                <Spinner size='large' color='$blue10' />
                <Text mt='$4' color='gray'>
                    Payment Methods
                </Text>
            </YStack>
        </SafeAreaView>
    );
};

export default PaymentMethodsScreen;
