import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, FlatList, Pressable } from 'react-native';
import { Avatar, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { formattedAddressFromPlace } from '../utils/location';
import useCurrentLocation from '../hooks/use-current-location';
import useSavedLocations from '../hooks/use-saved-locations';

const AddressBookScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { currentLocation, setCustomerDefaultLocation } = useCurrentLocation();
    const { savedLocations } = useSavedLocations();

    const renderSavedLocation = ({ item }) => (
        <Pressable
            onPress={() => navigation.navigate('EditLocation', { place: item.serialize() })}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            })}
        >
            <YStack flex={1} mb='$1' padding='$4' bg={item.id === currentLocation?.id ? '$primary' : 'transparent'}>
                <Text color={item.id === currentLocation?.id ? 'white' : '$textPrimary'} fontWeight='bold' mb='$1'>
                    {item.getAttribute('name')}
                </Text>
                <Text color={item.id === currentLocation?.id ? 'white' : '$textSecondary'}>{formattedAddressFromPlace(item)}</Text>
            </YStack>
        </Pressable>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <YStack flex={1} bg='$background' space='$3' padding='$4'>
                <YStack borderColor='$borderColorWithShadow' borderWidth={1} borderRadius='$4' overflow='hidden' bg='$surface'>
                    <FlatList
                        data={savedLocations}
                        keyExtractor={(item, index) => item.id || index}
                        renderItem={renderSavedLocation}
                        ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                    />
                </YStack>
            </YStack>
        </SafeAreaView>
    );
};

export default AddressBookScreen;
