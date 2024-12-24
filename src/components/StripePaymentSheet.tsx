import React, { useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Pressable } from 'react-native';
import { Image, Spinner, Button, Text, YStack, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTriangleExclamation, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useStripeCheckoutContext } from '../contexts/StripeCheckoutContext';

const StripePaymentSheet = () => {
    const theme = useTheme();
    const { createPaymentSheet, paymentSheetEnabled, handleAddPaymentMethodViaSheet, paymentMethod, stripeLoading, serviceQuote, cart, storefront, customer, error } =
        useStripeCheckoutContext();

    useEffect(() => {
        if (!customer || !storefront || !cart || !serviceQuote) {
            return;
        }

        createPaymentSheet();
    }, [storefront, customer, cart, serviceQuote]);

    if (!paymentSheetEnabled) {
        return (
            <YStack>
                <XStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' alignItems='center' space='$2' px='$4' py='$3'>
                    <YStack>
                        <Spinner color='$blue-600' size='$1' mr='$3' />
                    </YStack>
                    <Text fontWeight='bold' fontSize='$4' color='$blue-600'>
                        Loading payment details...
                    </Text>
                </XStack>
            </YStack>
        );
    }

    if (error) {
        return (
            <XStack bg='$red-700' borderWidth={1} borderColor='$red-500' borderRadius='$4' alignItems='center' space='$3' px='$3' py='$3'>
                <YStack>
                    <FontAwesomeIcon icon={faTriangleExclamation} color={theme['red-100'].val} size={15} />
                </YStack>
                <Text fontSize='$4' color='$red-100'>
                    {error}
                </Text>
            </XStack>
        );
    }

    if (!paymentMethod) {
        return (
            <YStack>
                <Pressable onPress={handleAddPaymentMethodViaSheet} disabled={!paymentSheetEnabled}>
                    <XStack
                        bg='$surface'
                        borderWidth={1}
                        borderColor='$borderColorWithShadow'
                        borderRadius='$4'
                        alignItems='center'
                        space='$2'
                        px='$4'
                        py='$3'
                        opacity={paymentSheetEnabled ? 1 : 0.5}
                    >
                        <YStack>
                            <FontAwesomeIcon icon={faPlus} color={theme['blue-600'].val} size={15} />
                        </YStack>
                        <Text fontWeight='bold' fontSize='$4' color='$blue-600'>
                            Add a new payment method
                        </Text>
                    </XStack>
                </Pressable>
            </YStack>
        );
    }

    return (
        <XStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' px='$4' py='$3' justifyContent='space-between'>
            <XStack space='$2'>
                {paymentMethod.image && <Image source={{ uri: `data:image/png;base64,${paymentMethod.image}` }} width={55} height={35} />}
                <YStack py='$1'>
                    <Text color='$textPrimary' fontSize='$4' fontWeight='bold'>
                        Card ending in {paymentMethod.label}
                    </Text>
                </YStack>
            </XStack>
            <YStack>
                <Button onPress={handleAddPaymentMethodViaSheet} rounded bg='$blue-600' borderWidth={1} borderColor='$blue-700' disabled={!paymentSheetEnabled}>
                    <Button.Text color='$blue-100'>Change</Button.Text>
                </Button>
            </YStack>
        </XStack>
    );
};

export default StripePaymentSheet;
