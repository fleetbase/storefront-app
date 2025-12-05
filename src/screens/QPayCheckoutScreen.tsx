import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSafeTabBarHeight as useBottomTabBarHeight } from '../hooks/use-safe-tab-bar-height';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView, ScrollView, Platform } from 'react-native';
import { Input, Button, Text, YStack, XStack, useTheme } from 'tamagui';
import { PortalHost } from '@gorhom/portal';
import CustomerLocationSelect from '../components/CustomerLocationSelect';
import CartContents from '../components/CartContents';
import CheckoutOptions from '../components/CheckoutOptions';
import CheckoutTotal from '../components/CheckoutTotal';
import DeliveryRoutePreview from '../components/DeliveryRoutePreview';
import CheckoutButton from '../components/CheckoutButton';
import CheckoutPickupSwitch from '../components/CheckoutPickupSwitch';
import TextAreaSheet from '../components/TextAreaSheet';
import LoadingOverlay from '../components/LoadingOverlay';
import QPayTaxRegistrationSwitch from '../components/QPayTaxRegistrationSwitch';
import QPayPaymentSheet, { QPayPaymentSheetRef } from '../components/QPayPaymentSheet';
import useQpayCheckout from '../hooks/use-qpay-checkout';
import useStorefrontInfo from '../hooks/use-storefront-info';
import { wasAccessedFromCartModal, firstRouteName } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';

const isAndroid = Platform.OS === 'android';
const QPayCheckoutScreen = ({ route }) => {
    const params = route.params ?? {};
    const theme = useTheme();
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const tabBarHeight = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();
    const { enabled } = useStorefrontInfo();
    const { t } = useLanguage();
    const paymentSheetRef = useRef<QPayPaymentSheetRef>(null);
    const {
        customer,
        invoice,
        totalAmount,
        handleDeliveryLocationChange,
        receivingOptions,
        setPickup,
        isPickup,
        isPickupEnabled,
        lineItems,
        setTipOptions,
        isNotReady,
        isLoading,
        orderNotes,
        setOrderNotes,
        originLocationId,
        store,
        isCapturingOrder,
        isCompany,
        setIsPersonal,
        companyRegistrationNumber,
        setCompanyRegistrationNumber,
    } = useQpayCheckout({
        onOrderComplete: (order) => {
            paymentSheetRef.current?.forceClose();
            navigation.reset({
                index: 1,
                routes: [{ name: firstRouteName(navigation) }, { name: 'Order', params: { order: order.serialize() } }],
            });
        },
    });
    const [isBottomSheetPresenting, setIsBottomSheetPresenting] = useState(false);
    const [localRegistrationNumber, setLocalRegistrationNumber] = useState(companyRegistrationNumber || '');
    const hasCheckoutOptions = enabled('tips') || enabled('delivery_tips');
    const isModalScreen = wasAccessedFromCartModal(navigation);
    const portalHost = isModalScreen === true ? 'QPayCheckoutPortal' : 'MainPortal';

    const handleRegistrationNumberChange = useCallback(
        (text) => {
            setLocalRegistrationNumber(text); // Immediate UI update
            setCompanyRegistrationNumber(text); // Debounced API call
        },
        [setCompanyRegistrationNumber]
    );

    const handleTaxTypeChange = useCallback((isPersonal) => {
        setIsPersonal(isPersonal);
        if (isPersonal) {
            handleRegistrationNumberChange('');
        }
    });

    // // Sync local state when hook value changes
    // useEffect(() => {
    //     setLocalRegistrationNumber(companyRegistrationNumber || '');
    // }, [companyRegistrationNumber]);

    useEffect(() => {
        navigation.setOptions({
            gestureEnabled: !isBottomSheetPresenting,
        });
    }, [isBottomSheetPresenting]);

    return (
        <YStack bg='$background'>
            <LoadingOverlay visible={customer && (isCapturingOrder || !isFocused)} text={isFocused ? t('QPayCheckoutScreen.completingOrder') : t('QPayCheckoutScreen.checkingPayment')} />
            <ScrollView showsVerticalScrollIndicator={false}>
                <YStack flex={1} bg='$background' space='$2'>
                    <YStack height={300}>
                        <DeliveryRoutePreview customOrigin={originLocationId} />
                    </YStack>
                    <YStack px='$3' py='$1' space='$5'>
                        {isPickupEnabled && (
                            <YStack space='$3'>
                                <CheckoutPickupSwitch onChange={(isPickup) => setPickup(isPickup)} />
                            </YStack>
                        )}
                        {!isPickup && (
                            <YStack space='$3'>
                                <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                    {t('QPayCheckoutScreen.yourDeliveryLocation')}
                                </Text>
                                <CustomerLocationSelect onChange={handleDeliveryLocationChange} />
                            </YStack>
                        )}
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                {t('QPayCheckoutScreen.yourCart')}
                            </Text>
                            <CartContents />
                        </YStack>
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                {t('QPayCheckoutScreen.orderNotes')}
                            </Text>
                            <TextAreaSheet
                                value={orderNotes}
                                onChange={setOrderNotes}
                                title={t('QPayCheckoutScreen.orderNotesTitle')}
                                placeholder={t('QPayCheckoutScreen.enterAdditionalNotes')}
                                portalHost={portalHost}
                                onBottomSheetPositionChanged={setIsBottomSheetPresenting}
                            />
                        </YStack>
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                {t('QPayCheckoutScreen.vatRegistration')}
                            </Text>
                            <QPayTaxRegistrationSwitch onChange={handleTaxTypeChange} isPersonal={!isCompany} />
                            {isCompany && (
                                <Input
                                    value={localRegistrationNumber}
                                    onChangeText={handleRegistrationNumberChange}
                                    placeholder={t('QPayCheckoutScreen.companyRegistrationNumber')}
                                    color='$textPrimary'
                                    placeholderTextColor='$textSecondary'
                                />
                            )}
                        </YStack>
                        {hasCheckoutOptions && (
                            <YStack space='$3'>
                                <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                    Checkout options
                                </Text>
                                <CheckoutOptions onChange={setTipOptions} isPickup={isPickup} />
                            </YStack>
                        )}
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                {t('lineItems.total')}
                            </Text>
                            <CheckoutTotal lineItems={lineItems} />
                        </YStack>
                        <YStack width='100%' height={200} />
                    </YStack>
                </YStack>
            </ScrollView>
            <XStack animate='bouncy' position='absolute' bottom={isModalScreen ? insets.bottom : tabBarHeight} left={0} right={0} padding='$4' zIndex={0}>
                <CheckoutButton onCheckout={() => paymentSheetRef.current?.open()} total={totalAmount} disabled={isNotReady} isLoading={isLoading} />
            </XStack>
            <QPayPaymentSheet ref={paymentSheetRef} invoice={invoice} portalHost={portalHost} onBottomSheetPositionChanged={setIsBottomSheetPresenting} />
            <PortalHost name='QPayCheckoutPortal' />
        </YStack>
    );
};

export default QPayCheckoutScreen;
