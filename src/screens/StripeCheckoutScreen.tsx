import React, { useEffect, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView, ScrollView, Platform } from 'react-native';
import { Button, Text, YStack, XStack, useTheme } from 'tamagui';
import { PortalHost } from '@gorhom/portal';
import CustomerLocationSelect from '../components/CustomerLocationSelect';
import StripeCardFieldSheet from '../components/StripeCardFieldSheet';
import StripePaymentSheet from '../components/StripePaymentSheet';
import CartContents from '../components/CartContents';
import CheckoutOptions from '../components/CheckoutOptions';
import CheckoutTotal from '../components/CheckoutTotal';
import DeliveryRoutePreview from '../components/DeliveryRoutePreview';
import CheckoutButton from '../components/CheckoutButton';
import CheckoutPickupSwitch from '../components/CheckoutPickupSwitch';
import TextAreaSheet from '../components/TextAreaSheet';
import useStorefrontInfo from '../hooks/use-storefront-info';
import { useStripeCheckoutContext } from '../contexts/StripeCheckoutContext';
import { useLanguage } from '../contexts/LanguageContext';
import { storefrontConfig, firstRouteName, wasAccessedFromCartModal } from '../utils';

const isAndroid = Platform.OS === 'android';
const StripeCheckoutScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const tabBarHeight = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();
    const { enabled } = useStorefrontInfo();
    const { t } = useLanguage();
    const {
        customer,
        handleCompleteOrder,
        handleDeliveryLocationChange,
        setTipOptions,
        orderNotes,
        setOrderNotes,
        setPickup,
        isPickup,
        isPickupEnabled,
        lineItems,
        totalAmount,
        isNotReady,
        isLoading,
    } = useStripeCheckoutContext();
    const completeOrder = useCallback(() => {
        handleCompleteOrder((order) => {
            navigation.reset({
                index: 1,
                routes: [{ name: firstRouteName(navigation) }, { name: 'Order', params: { order: order.serialize() } }],
            });
        });
    }, [handleCompleteOrder, navigation]);
    const hasCheckoutOptions = enabled('tips') || enabled('delivery_tips');
    const isModalScreen = wasAccessedFromCartModal(navigation);
    const portalHost = isModalScreen === true ? 'StripeCheckoutPortal' : 'MainPortal';

    return (
        <YStack bg='$background'>
            <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                <YStack flex={1} bg='$background' space='$2'>
                    <YStack height={300}>
                        <DeliveryRoutePreview />
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
                                    {t('StripeCheckoutScreen.yourDeliveryLocation')}
                                </Text>
                                <CustomerLocationSelect onChange={handleDeliveryLocationChange} />
                            </YStack>
                        )}
                        <YStack space='$3' mb={!customer ? '$5' : 0}>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                {t('StripeCheckoutScreen.yourCart')}
                            </Text>
                            <CartContents />
                        </YStack>
                        {customer && (
                            <YStack space='$3'>
                                <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                    {t('StripeCheckoutScreen.yourPaymentMethod')}
                                </Text>
                                {storefrontConfig('stripePaymentMethod') === 'field' ? <StripeCardFieldSheet /> : <StripePaymentSheet />}
                            </YStack>
                        )}
                        <YStack space='$3'>
                            <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                {t('StripeCheckoutScreen.orderNotes')}
                            </Text>
                            <TextAreaSheet
                                value={orderNotes}
                                onChange={setOrderNotes}
                                title={t('StripeCheckoutScreen.orderNotesTitle')}
                                placeholder={t('StripeCheckoutScreen.enterAdditionalNotes')}
                                portalHost={portalHost}
                            />
                        </YStack>
                        {hasCheckoutOptions && (
                            <YStack space='$3'>
                                <Text fontSize='$7' color='$textPrimary' fontWeight='bold'>
                                    {t('StripeCheckoutScreen.checkoutOptions')}
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
            <XStack animate='bouncy' position='absolute' bottom={isModalScreen ? insets.bottom : tabBarHeight} left={0} right={0} padding='$4' zIndex={2}>
                <CheckoutButton onCheckout={completeOrder} total={totalAmount} disabled={isNotReady} isLoading={isLoading} />
            </XStack>
            <PortalHost name='StripeCheckoutPortal' />
        </YStack>
    );
};

export default StripeCheckoutScreen;
