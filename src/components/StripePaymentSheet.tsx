import React, { useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Pressable } from 'react-native';
import { Image, Spinner, Button, Text, YStack, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTriangleExclamation, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useStripeCheckoutContext } from '../contexts/StripeCheckoutContext';
import { useLanguage } from '../contexts/LanguageContext';

const StripePaymentSheet = () => {
    const theme = useTheme();
    const { t } = useLanguage();
    const { checkoutOptions, createPaymentSheet, paymentSheetEnabled, handleAddPaymentMethodViaSheet, paymentMethod, stripeLoading, serviceQuote, cart, storefront, customer, error } =
        useStripeCheckoutContext();

    useEffect(() => {
        if (!customer || !storefront || !cart || (!checkoutOptions.pickup && !serviceQuote)) {
            return;
        }
        createPaymentSheet();
    }, [storefront, customer, cart, serviceQuote, checkoutOptions.pickup]);

    if (!customer) {
        return (
            <YStack>
                <XStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' alignItems='center' space='$2' px='$4' py='$3'>
                    <Text fontWeight='bold' fontSize='$4' color='$textPrimary'>
                        {t('StripePaymentSheet.loginToCheckout')}
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

    if (!paymentSheetEnabled) {
        return (
            <YStack>
                <XStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' alignItems='center' space='$2' px='$4' py='$3'>
                    <YStack>
                        <Spinner color='$blue-600' size='$1' mr='$3' />
                    </YStack>
                    <Text fontWeight='bold' fontSize='$4' color='$blue-600'>
                        {t('StripePaymentSheet.loadingPaymentDetails')}
                    </Text>
                </XStack>
            </YStack>
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
                            {t('StripePaymentSheet.addNewPaymentMethod')}
                        </Text>
                    </XStack>
                </Pressable>
            </YStack>
        );
    }

    return (
        <XStack bg='$surface' alignItems='center' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' px='$3' py='$2' justifyContent='space-between'>
            <XStack alignItems='center' flex={1} space={4}>
                <YStack>{paymentMethod.image && <Image source={{ uri: `data:image/png;base64,${paymentMethod.image}` }} width={40} height={25} borderRadius={2} />}</YStack>
                <YStack flex={1}>
                    <Text color='$textPrimary' fontSize='$4' numberOfLines={1}>
                        {t('StripePaymentSheet.cardEndingIn', { label: paymentMethod.label })}
                    </Text>
                </YStack>
            </XStack>
            <YStack>
                <Button onPress={handleAddPaymentMethodViaSheet} borderWidth={1} bg='$primary' borderColor='$primaryBorder' px='$3' py='$1' disabled={!paymentSheetEnabled}>
                    <Button.Text fontSize={13} color='$primaryText'>
                        {t('StripePaymentSheet.change')}
                    </Button.Text>
                </Button>
            </YStack>
        </XStack>
    );
};

export default StripePaymentSheet;
