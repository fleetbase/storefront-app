import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Stack, Text, YStack, useTheme } from 'tamagui';

const QPayCheckoutScreen = () => {
    const theme = useTheme();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} alignItems='center' justifyContent='center' bg='$background'>
                <Text>QPay</Text>
            </YStack>
        </SafeAreaView>
    );
};

export default QPayCheckoutScreen;
