import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Stack, Text, YStack, useTheme, Button } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import storage from '../utils/storage';

const ProfileScreen = () => {
    const theme = useTheme();

    const handleClearCache = () => {
        storage.clearStore();
        toast.success('Cache cleared.', { position: ToastPosition.BOTTOM });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} alignItems='center' justifyContent='center' bg='$background'>
                <Button onPress={handleClearCache}>Clear Cache</Button>
            </YStack>
        </SafeAreaView>
    );
};

export default ProfileScreen;
