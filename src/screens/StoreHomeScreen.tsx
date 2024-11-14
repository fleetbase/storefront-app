import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Spinner, Stack, Text, YStack, Button, useTheme } from 'tamagui';
import LocationMarker from '../components/LocationMarker';

const StoreHome = () => {
    const theme = useTheme();
    const [lifted, setLifted] = useState(false);

    const handleLift = () => {
        setLifted(true);
        setTimeout(() => {
            setLifted(false);
        }, 300 * 4);
    };
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} alignItems='center' justifyContent='center' bg='$background'>
                <Button onPress={handleLift} mb='$8'>
                    Lift Marker
                </Button>
                <LocationMarker lifted={lifted} />
            </YStack>
        </SafeAreaView>
    );
};

export default StoreHome;
