import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Stack, Text, YStack, useTheme } from 'tamagui';

const CheckoutScreen = () => {
    const theme = useTheme();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} alignItems='center' justifyContent='center' bg='$background'></YStack>
        </SafeAreaView>
    );
};

export default CheckoutScreen;
