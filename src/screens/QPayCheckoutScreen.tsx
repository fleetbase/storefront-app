import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, YStack, XStack, useTheme } from 'tamagui';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import CustomerLocationSelect from '../components/CustomerLocationSelect';
import CartContents from '../components/CartContents';
import CheckoutOptions from '../components/CheckoutOptions';
import CheckoutTotal from '../components/CheckoutTotal';
import DeliveryRoutePreview from '../components/DeliveryRoutePreview';
import CheckoutButton from '../components/CheckoutButton';
import CheckoutPickupSwitch from '../components/CheckoutPickupSwitch';
import QPayPaymentSheet, { QPayPaymentSheetRef } from '../components/QPayPaymentSheet';
import useQpayCheckout from '../hooks/use-qpay-checkout';

const QPayCheckoutScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const paymentSheetRef = useRef<QPayPaymentSheetRef>(null);
    const { invoice, totalAmount, handleDeliveryLocationChange, receivingOptions, setPickup, isPickup, isPickupEnabled, lineItems, setTipOptions, isNotReady, isLoading } = useQpayCheckout({
        onOrderComplete: (order) => {
            navigation.reset({
                index: 1,
                routes: [{ name: 'Cart' }, { name: 'Order', params: { order: order.serialize() } }],
            });
        },
    });

    return (
        <YStack bg='$background'>
            <ScrollView showsVerticalScrollIndicator={false}>
                <YStack flex={1} bg='$background' space='$2'>
                    <YStack height={300}>
                        <DeliveryRoutePreview />
                    </YStack>
                    <YStack padding='$3' space='$5'>
                        {isPickupEnabled && (
                            <YStack space='$3'>
                                <CheckoutPickupSwitch onChange={(isPickup) => setPickup(isPickup)} />
                            </YStack>
                        )}
                        {!isPickup && (
                            <YStack space='$3'>
                                <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                    Your delivery location
                                </Text>
                                <CustomerLocationSelect onChange={handleDeliveryLocationChange} />
                            </YStack>
                        )}
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
                            <CheckoutOptions onChange={setTipOptions} isPickup={isPickup} />
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
                <CheckoutButton onCheckout={() => paymentSheetRef.current.open()} total={totalAmount} disabled={isNotReady} isLoading={isLoading} />
            </XStack>
            <QPayPaymentSheet ref={paymentSheetRef} invoice={invoice} />
        </YStack>
    );
};

export default QPayCheckoutScreen;
