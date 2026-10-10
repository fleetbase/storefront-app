import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Image } from 'react-native';
import { PortalHost } from '@gorhom/portal';
import { XStack, YStack } from 'tamagui';
import LoadingOverlay from '../components/LoadingOverlay';
import QPayTaxRegistrationSwitch from '../components/QPayTaxRegistrationSwitch';
import QPayPaymentSheet, { QPayPaymentSheetRef } from '../components/QPayPaymentSheet';
import CheckoutLayout from '../components/checkout/CheckoutLayout';
import useQpayCheckout from '../hooks/use-qpay-checkout';
import useFooterOffset from '../hooks/use-footer-offset';
import { wasAccessedFromCartModal, firstRouteName } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, TextField, UIText, radius } from '../ui';

const QPAY_ICON = require('../../assets/images/payment-logos/qpay-icon.png');

const QPayCheckoutScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const { t } = useLanguage();
    const paymentSheetRef = useRef<QPayPaymentSheetRef>(null);
    const checkout: any = useQpayCheckout({
        onOrderComplete: (order: any) => {
            (paymentSheetRef.current as any)?.forceClose?.();
            navigation.reset({
                index: 1,
                routes: [{ name: firstRouteName(navigation) }, { name: 'Order', params: { order: order.serialize(), justPlaced: true } }],
            });
        },
    });
    const { customer, invoice, isCapturingOrder, paymentStage, isCompany, setIsPersonal, companyRegistrationNumber, setCompanyRegistrationNumber } = checkout;
    // Back from the bank app: confirming → payment received → the order screen.
    const stageText =
        paymentStage === 'confirming'
            ? t('QPayCheckoutScreen.confirmingPayment')
            : paymentStage === 'paid'
              ? t('QPayCheckoutScreen.paymentReceived')
              : paymentStage === 'slow'
                ? t('QPayCheckoutScreen.paymentReceivedSlow')
                : null;
    const [isBottomSheetPresenting, setIsBottomSheetPresenting] = useState(false);
    const [registrationNumber, setRegistrationNumber] = useState(companyRegistrationNumber || '');
    const isModalScreen = wasAccessedFromCartModal(navigation);
    const footerOffset = useFooterOffset(isModalScreen);
    const portalHost = isModalScreen === true ? 'QPayCheckoutPortal' : 'MainPortal';

    const changeRegistrationNumber = useCallback(
        (text: string) => {
            setRegistrationNumber(text);
            setCompanyRegistrationNumber(text);
        },
        [setCompanyRegistrationNumber]
    );

    const changeTaxType = useCallback(
        (isPersonal: boolean) => {
            setIsPersonal(isPersonal);
            if (isPersonal) changeRegistrationNumber('');
        },
        [changeRegistrationNumber, setIsPersonal]
    );

    useEffect(() => {
        navigation.setOptions({ gestureEnabled: !isBottomSheetPresenting });
    }, [isBottomSheetPresenting, navigation]);

    return (
        <YStack flex={1}>
            <LoadingOverlay
                visible={!!customer && (isCapturingOrder || !isFocused || !!stageText)}
                text={
                    isCapturingOrder
                        ? t('QPayCheckoutScreen.finalizingOrder')
                        : (stageText ?? (isFocused ? t('QPayCheckoutScreen.finalizingOrder') : t('QPayCheckoutScreen.checkingOrderStatus')))
                }
            />
            <CheckoutLayout
                checkout={checkout}
                paymentReady
                onPlaceOrder={() => paymentSheetRef.current?.open()}
                footerOffset={footerOffset}
                payment={
                    <XStack gap={12} alignItems='center' minHeight={52}>
                        <Image source={QPAY_ICON} accessibilityIgnoresInvertColors style={{ width: 40, height: 40, borderRadius: 10 }} />
                        <YStack flex={1}>
                            <UIText variant='bodyStrong'>QPay</UIText>
                            <UIText variant='caption' tone='secondary'>
                                {t('Checkout.qpayNote')}
                            </UIText>
                        </YStack>
                    </XStack>
                }
                extra={
                    customer ? (
                        <Card padding={14} gap={10}>
                            <UIText variant='subheading'>{t('QPayCheckoutScreen.vatRegistration')}</UIText>
                            <QPayTaxRegistrationSwitch onChange={changeTaxType} isPersonal={!isCompany} />
                            {isCompany && (
                                <TextField
                                    value={registrationNumber}
                                    onChangeText={changeRegistrationNumber}
                                    placeholder={t('QPayCheckoutScreen.companyRegistrationNumber')}
                                    accessibilityLabel={t('QPayCheckoutScreen.companyRegistrationNumber')}
                                    style={{ borderRadius: radius.button }}
                                />
                            )}
                        </Card>
                    ) : null
                }
            />
            <QPayPaymentSheet ref={paymentSheetRef} invoice={invoice} portalHost={portalHost} onBottomSheetPositionChanged={setIsBottomSheetPresenting} />
            <PortalHost name='QPayCheckoutPortal' />
        </YStack>
    );
};

export default QPayCheckoutScreen;
