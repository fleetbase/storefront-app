import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Text, YStack, XStack, Spinner, useTheme } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';
import { CustomerSheetBeta, CustomerSheetError, initStripe } from '@stripe/stripe-react-native';
import { Portal } from '@gorhom/portal';
import { config } from '../utils';
import useAppTheme from '../hooks/use-app-theme';

const APP_IDENTIFIER = config('APP_IDENTIFIER');
const STRIPE_KEY = config('STRIPE_KEY');

const StripeCustomerScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { isDarkMode } = useAppTheme();
    const { customer, updateCustomerMeta } = useAuth();
    const [customerSheetReady, setCustomerSheetReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!customer || customerSheetReady) {
            return;
        }

        // Initialize the customer sheet
        const initializeCustomerSheet = async () => {
            try {
                const { setupIntent, customerId } = await customer.getStripeSetupIntent();
                const { ephemeralKey } = await customer.getStripeEphemeralKey();
                const { error } = await CustomerSheetBeta.initialize({
                    setupIntentClientSecret: setupIntent,
                    customerEphemeralKeySecret: ephemeralKey,
                    customerId,
                    headerTextForSelectionScreen: 'Manage your payment method',
                    returnURL: `${APP_IDENTIFIER}://stripe-customer`,
                    style: isDarkMode ? 'alwaysDark' : 'alwaysLight',
                });

                if (error) {
                    console.error('Error initializing stripe customer sheet:', error);
                    return navigation.goBack();
                }

                setCustomerSheetReady(true);
            } catch (err) {
                console.error('Error initializing stripe customer sheet:', err);
                return navigation.goBack();
            }
        };

        // Start loading indicator
        setIsLoading(true);

        // Initialize Stripe
        initStripe({
            publishableKey: STRIPE_KEY,
            merchantIdentifier: APP_IDENTIFIER,
            setReturnUrlSchemeOnAndroid: true,
        });

        // Initialize customer sheet
        initializeCustomerSheet();
    }, [customer]);

    useEffect(() => {
        const showCustomerSheet = async () => {
            try {
                const { error, paymentMethod } = await CustomerSheetBeta.present();
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

    return (
        <Portal hostName='MainPortal'>
            <YStack position='absolute' bottom={0} left={0} right={0}>
                <YStack
                    height={210}
                    width='100%'
                    bg='$surface'
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
                    style={{
                        transform: [{ scale: isLoading ? 1.05 : 1 }, { translateY: isLoading ? -210 : 0 }],
                    }}
                >
                    <XStack space='$2'>
                        <Spinner />
                        <Text color='$textPrimary' fontWeight='bold'>
                            Loading payment methods...
                        </Text>
                    </XStack>
                </YStack>
            </YStack>
        </Portal>
    );
};

export default StripeCustomerScreen;
