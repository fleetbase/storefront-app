import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Spinner, Text, YStack, XStack, Button, Input, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { Place } from '@fleetbase/sdk';
import { adapter } from '../hooks/use-storefront';
import { useAuth } from '../contexts/AuthContext';
import { usePromiseWithLoading } from '../hooks/use-promise-with-loading';
import { formattedAddressFromPlace, savePlaceLocally } from '../utils/location';

const SaveLocationScreen = ({ route }) => {
    const place = new Place(route.params.place, adapter);
    const { customer, isAuthenticated } = useAuth();
    const [ready, setReady] = useState(false);

    const handleSavePlace = async () => {
        if (isAuthenticated) {
            try {
                place.setOwner(customer.id);
                await place.save();
                toast.success('Address saved.');
            } catch (error) {
                toast.error(error.message);
            }
        } else {
            savePlaceLocally(place);
            toast.success('Address saved.');
        }
    };

    console.log('[place]', place);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background' space='$3' padding='$5'>
                <XStack paddingVertical='$3' justifyContent='space-between' mb='$1'>
                    <Text fontSize='$9' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                        Address
                    </Text>
                </XStack>
                <XStack flex={1} width='100%'>
                    <Text fontSize='$6' color='$textSecondary'>
                        {formattedAddressFromPlace(place)}
                    </Text>
                </XStack>
                {ready && (
                    <XStack position='absolute' bottom={0} left={0} right={0} padding='$5'>
                        <Button onPress={handleSavePlace} size='$5' bg='$blue-500' flex={1} opacity={mutated ? 1 : 0.75} disabled={!mutated}>
                            <Button.Icon>{isLoading() && <Spinner color='$blur-800' />}</Button.Icon>
                            <Button.Text color='$blue-600' fontWeight='bold' fontSize='$5'>
                                Save
                            </Button.Text>
                        </Button>
                    </XStack>
                )}
            </YStack>
        </SafeAreaView>
    );
};

export default SaveLocationScreen;
