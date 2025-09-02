import React, { useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Pressable } from 'react-native';
import { Spinner, Button, Text, YStack, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faSave, faPlus, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
// import { useStripe, CardForm } from '@stripe/stripe-react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Portal } from '@gorhom/portal';
import CardBrandLogo from './CardBrandLogo';
import { useStripeCheckoutContext } from '../contexts/StripeCheckoutContext';
import { useLanguage } from '../contexts/LanguageContext';

const StripeCardFieldSheet = forwardRef(({ onPaymentMethodSaved, onReady }, ref) => {
    const theme = useTheme();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['50%'], []);
    const { setupIntentLoading, paymentMethod, createSetupIntent, setupIntentClientSecret, handleAddPaymentMethod, storefront, customer } = useStripeCheckoutContext();
    const { t } = useLanguage();

    const [cardDetailsComplete, setCardDetailsComplete] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const disabled = !cardDetailsComplete || isSaving;
    const initialLoad = !setupIntentClientSecret && !paymentMethod && setupIntentLoading;

    // Expose open/close methods to parent via ref
    useImperativeHandle(ref, () => ({
        openBottomSheet: async () => {
            await createSetupIntent();
            bottomSheetRef.current?.snapToIndex(0);
        },
        closeBottomSheet: () => {
            bottomSheetRef.current?.close();
        },
    }));

    const openBottomSheet = async () => {
        setIsLoading(true);

        await createSetupIntent();
        bottomSheetRef.current?.snapToIndex(0);
        setIsLoading(false);
    };

    const closeBottomSheet = () => {
        bottomSheetRef.current?.close();
    };

    const handleSavePaymentMethod = useCallback(() => {
        setIsSaving(true);
        const callback = (paymentMethod) => {
            setIsSaving(false);
            closeBottomSheet(paymentMethod);
            if (typeof onPaymentMethodSaved === 'function') {
                onPaymentMethodSaved(paymentMethod);
            }
        };
        handleAddPaymentMethod(callback);
    }, [setupIntentClientSecret]);

    useEffect(() => {
        if (!customer || !storefront || setupIntentLoading || typeof setupIntentClientSecret === 'string') {
            return;
        }

        createSetupIntent();
    }, [storefront, customer, setupIntentClientSecret]);

    if (initialLoad) {
        return (
            <YStack>
                <XStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' alignItems='center' space='$2' px='$4' py='$3'>
                    <YStack>
                        <Spinner color='$blue-600' size='$1' mr='$3' />
                    </YStack>
                    <Text fontWeight='bold' fontSize='$4' color='$blue-600'>
                        {t('StripeCardFieldSheet.loadingPaymentDetails')}
                    </Text>
                </XStack>
            </YStack>
        );
    }
    return (
        <YStack>
            <YStack>
                {!paymentMethod ? (
                    <YStack>
                        <Pressable onPress={openBottomSheet}>
                            <XStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' alignItems='center' space='$2' px='$4' py='$3'>
                                <YStack>{isLoading ? <Spinner color='$blue-600' size='$1' mr='$3' /> : <FontAwesomeIcon icon={faPlus} color={theme['blue-600'].val} size={15} />}</YStack>
                                <Text fontWeight='bold' fontSize='$4' color='$blue-600'>
                                    {t('StripeCardFieldSheet.addNewPaymentMethod')}
                                </Text>
                            </XStack>
                        </Pressable>
                    </YStack>
                ) : (
                    <XStack alignItems='center' bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' px='$4' py='$3' justifyContent='space-between'>
                        <XStack alignItems='center' space='$2'>
                            <CardBrandLogo brand={paymentMethod.brand} />
                            <YStack>
                                <Text color='$textPrimary' fontSize='$4'>
                                    {t('StripeCardFieldSheet.cardEndingIn', { label: paymentMethod.label })}
                                </Text>
                            </YStack>
                        </XStack>
                        <YStack>
                            <Button onPress={openBottomSheet} borderWidth={1} bg='$primary' borderColor='$primaryBorder'>
                                {isLoading ? <Spinner color='$primaryText' /> : <FontAwesomeIcon icon={faPenToSquare} color={theme['$primaryText'].val} size={15} />}
                                <Button.Text color='$primaryText'>{t('StripeCardFieldSheet.change')}</Button.Text>
                            </Button>
                        </YStack>
                    </XStack>
                )}
            </YStack>
            <Portal hostName='MainPortal'>
                <BottomSheet
                    ref={bottomSheetRef}
                    index={-1}
                    snapPoints={snapPoints}
                    keyboardBehavior='extend'
                    keyboardBlurBehavior='none'
                    enableDynamicSizing={false}
                    style={{ flex: 1, padding: 10, width: '100%' }}
                >
                    <BottomSheetView style={{ flex: 1 }}>
                        <YStack>
                            <XStack alignItems='center' justifyContent='space-between' mb='$3'>
                                <YStack flex={1}>
                                    <Text fontSize='$6' fontWeight='bold' color='$textPrimary' mb='$2'>
                                        {t('StripeCardFieldSheet.addOrUpdatePaymentMethod')}
                                    </Text>
                                </YStack>
                                <Button size='$2' onPress={closeBottomSheet} bg='$gray-300' circular>
                                    <Button.Icon>
                                        <FontAwesomeIcon icon={faTimes} />
                                    </Button.Icon>
                                </Button>
                            </XStack>

                            {/* <CardForm
                                postalCodeEnabled={true}
                                autofocus={true}
                                style={{
                                    width: '100%',
                                    height: 180,
                                }}
                                onFormComplete={(cardDetails) => {
                                    // cardDetails.complete indicates if all fields are valid
                                    setCardDetailsComplete(cardDetails.complete);
                                }}
                            /> */}

                            <XStack justifyContent='flex-end'>
                                <Button
                                    onPress={handleSavePaymentMethod}
                                    size='$5'
                                    bg='$green-900'
                                    borderWidth={1}
                                    borderColor='$green-600'
                                    flex={1}
                                    opacity={disabled ? 0.75 : 1}
                                    disabled={disabled}
                                >
                                    <Button.Icon>{isSaving ? <Spinner color='$green-100' /> : <FontAwesomeIcon icon={faSave} color={theme['green-100'].val} />}</Button.Icon>
                                    <Button.Text color='$green-100' fontWeight='bold' fontSize='$5'>
                                        {isSaving ? t('StripeCardFieldSheet.saving') : t('StripeCardFieldSheet.savePaymentMethod')}
                                    </Button.Text>
                                </Button>
                            </XStack>
                        </YStack>
                    </BottomSheetView>
                </BottomSheet>
            </Portal>
        </YStack>
    );
});

export default StripeCardFieldSheet;
