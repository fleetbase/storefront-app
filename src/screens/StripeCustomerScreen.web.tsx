import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Text, YStack, XStack, Spinner, useTheme } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';
// import { CustomerSheet, CustomerSheetError, initStripe } from '@stripe/stripe-react-native';
import { Portal } from '@gorhom/portal';
import { config } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';
import useAppTheme from '../hooks/use-app-theme';

const APP_IDENTIFIER = config('APP_IDENTIFIER');
const STRIPE_KEY = config('STRIPE_KEY');

const StripeCustomerScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isDarkMode } = useAppTheme();
    const { t } = useLanguage();
    const { customer, updateCustomerMeta } = useAuth();
    const [customerSheetReady, setCustomerSheetReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Animated value for sliding the panel
    const slideAnim = useRef(new Animated.Value(300)).current;

    // useEffect(() => {
    //     if (!customer || customerSheetReady) {
    //         return;
    //     }

    //     // Initialize the customer sheet
    //     const initializeCustomerSheet = async () => {
    //         try {
    //             const { setupIntent, customerId } = await customer.getStripeSetupIntent();
    //             const { ephemeralKey } = await customer.getStripeEphemeralKey();
    //             const { error } = await CustomerSheet.initialize({
    //                 setupIntentClientSecret: setupIntent,
    //                 customerEphemeralKeySecret: ephemeralKey,
    //                 customerId,
    //                 headerTextForSelectionScreen: t('StripeCustomerScreen.manageYourPaymentMethod'),
    //                 returnURL: `${APP_IDENTIFIER}://stripe-customer`,
    //                 style: isDarkMode ? 'alwaysDark' : 'alwaysLight',
    //             });

    //             if (error) {
    //                 console.error('Error initializing stripe customer sheet:', error);
    //                 return navigation.goBack();
    //             }

    //             setCustomerSheetReady(true);
    //             setIsLoading(false);
    //         } catch (err) {
    //             console.error('Error initializing stripe customer sheet:', err);
    //             return navigation.goBack();
    //         }
    //     };

    //     // Start loading indicator
    //     setIsLoading(true);

    //     // Initialize Stripe
    //     initStripe({
    //         publishableKey: STRIPE_KEY,
    //         merchantIdentifier: APP_IDENTIFIER,
    //         setReturnUrlSchemeOnAndroid: true,
    //     });

    //     // Initialize customer sheet
    //     initializeCustomerSheet();
    // }, [customer]);

    useEffect(() => {
        const showCustomerSheet = async () => {
            try {
                const { error, paymentMethod } = await CustomerSheet.present();
                if (error) {
                    if (error.code === CustomerSheetError.Canceled) {
                        return navigation.goBack();
                    }

                    console.error('Error presenting stripe customer sheet:', error);
                    return;
                }

                if (paymentMethod) {
                    await updateCustomerMeta({ stripe_payment_method_id: paymentMethod.id });
                }
            } catch (err) {
                console.error('Error presenting stripe customer sheet:', err);
            }
        };
        if (customerSheetReady) {
            showCustomerSheet();
        }
    }, [customerSheetReady]);

    // Animate panel into view
    useEffect(() => {
        if (isLoading) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 700,
                useNativeDriver: true,
            }).start();
        }
    }, [isLoading]);

    return (
        <Portal hostName='MainPortal'>
            {isLoading && (
                <YStack position='absolute' zIndex={1} flex={1} bg='rgba(0, 0, 0, .20)' width='100%' height='100%'>
                    <Animated.View
                        style={{
                            transform: [{ translateY: slideAnim }],
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            zIndex: 2,
                        }}
                    >
                        <YStack
                            height={230}
                            width='100%'
                            position='absolute'
                            bottom={0}
                            left={0}
                            right={0}
                            bg='$background'
                            alignItems='center'
                            justifyContent='center'
                            padding='$4'
                            borderWidth={1}
                            borderBottomWidth={0}
                            borderColor='$borderColorWithShadow'
                            borderTopRightRadius={20}
                            borderTopLeftRadius={20}
                            shadowColor='$shadowColor'
                            shadowOffset={{ width: 0, height: 1 }}
                            shadowRadius={3}
                            shadowOpacity={0.1}
                            opacity={isLoading ? 1 : 0}
                        >
                            <XStack space='$3'>
                                <Spinner size='small' />
                                <Text fontSize='$4' color='$textPrimary'>
                                    {t('StripeCustomerScreen.loadingAccountInfo')}
                                </Text>
                            </XStack>
                        </YStack>
                    </Animated.View>
                </YStack>
            )}
        </Portal>
    );
};

export default StripeCustomerScreen;
