import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView, ScrollView, Platform } from 'react-native';
import { Button, Text, YStack, XStack, useTheme } from 'tamagui';
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
import QPayPaymentSheet, { QPayPaymentSheetRef } from '../components/QPayPaymentSheet';
import useQpayCheckout from '../hooks/use-qpay-checkout';
import useStorefrontInfo from '../hooks/use-storefront-info';
import { wasAccessedFromCartModal, firstRouteName } from '../utils';

const isAndroid = Platform.OS === 'android';
const QPayCheckoutScreen = ({ route }) => {
    const params = route.params ?? {};
    const theme = useTheme();
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const tabBarHeight = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();
    const { enabled } = useStorefrontInfo();
    const paymentSheetRef = useRef<QPayPaymentSheetRef>(null);
    const {
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
    const hasCheckoutOptions = enabled('tips') || enabled('delivery_tips');
    const isModalScreen = wasAccessedFromCartModal(navigation);
    const portalHost = isModalScreen === true ? 'QPayCheckoutPortal' : 'MainPortal';

    useEffect(() => {
        navigation.setOptions({
            gestureEnabled: !isBottomSheetPresenting,
        });
    }, [isBottomSheetPresenting]);

    return (
        <YStack bg='$background'>
            <LoadingOverlay visible={isCapturingOrder || !isFocused} text={isFocused ? 'Completing order...' : 'Checking payment...'} />
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
                                Order notes
                            </Text>
                            <TextAreaSheet
                                value={orderNotes}
                                onChange={setOrderNotes}
                                title='Order Notes'
                                placeholder='Enter additional notes for order'
                                portalHost={portalHost}
                                onBottomSheetPositionChanged={setIsBottomSheetPresenting}
                            />
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
                                Total
                            </Text>
                            <CheckoutTotal lineItems={lineItems} />
                        </YStack>
                        <YStack width='100%' height={200} />
                    </YStack>
                </YStack>
            </ScrollView>
            <XStack animate='bouncy' position='absolute' bottom={isModalScreen ? insets.bottom : tabBarHeight} left={0} right={0} padding='$4' zIndex={5}>
                <CheckoutButton onCheckout={() => paymentSheetRef.current?.open()} total={totalAmount} disabled={isNotReady} isLoading={isLoading} />
            </XStack>
            <QPayPaymentSheet ref={paymentSheetRef} invoice={invoice} portalHost={portalHost} onBottomSheetPositionChanged={setIsBottomSheetPresenting} />
            <PortalHost name='QPayCheckoutPortal' />
        </YStack>
    );
};

export default QPayCheckoutScreen;
