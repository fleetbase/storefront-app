import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, ScrollView } from 'react-native';
import { Stack, Text, YStack, useTheme } from 'tamagui';
import SelectDropoffLocation from '../components/checkout/SelectDropoffLocation';
import CartContents from '../components/checkout/CartContents';
import CheckoutOptions from '../components/checkout/CheckoutOptions';
import CheckoutTotal from '../components/checkout/CheckoutTotal';
import DeliveryRoutePreview from '../components/checkout/DeliveryRoutePreview';

const CheckoutScreen = () => {
    const theme = useTheme();
    const [tip, setTip] = useState(0);
    const [deliveryTip, setDeliveryTip] = useState(0);

    const handleUpdateOptions = ({ tip, leavingTip, deliveryTip, leavingDeliveryTip }) => {
        setTip(leavingTip ? tip : 0);
        setDeliveryTip(leavingDeliveryTip ? deliveryTip : 0);
    };

    return (
        <YStack bg='$background'>
            <ScrollView showsVerticalScrollIndicator={false}>
                <YStack flex={1} bg='$background' space='$2'>
                    <YStack height={300}>
                        <DeliveryRoutePreview />
                    </YStack>
                    <YStack padding='$3' space='$3'>
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                Your delivery location
                            </Text>
                            <SelectDropoffLocation />
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
                            <CheckoutOptions onChange={handleUpdateOptions} />
                        </YStack>
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                Total
                            </Text>
                            <CheckoutTotal tip={tip} deliveryTip={deliveryTip} />
                        </YStack>
                        <YStack width='100%' height={200} />
                    </YStack>
                </YStack>
            </ScrollView>
        </YStack>
    );
};

export default CheckoutScreen;
