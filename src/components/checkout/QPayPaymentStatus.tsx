import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, AccessibilityInfo, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faClock, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Pressable } from 'react-native';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/format';
import { Button, UIText, elevation, radius, space } from '../../ui';

export type QPayPaymentStage = 'idle' | 'awaiting' | 'verifying' | 'paid' | 'slow' | 'not_received' | 'failed';

type Props = {
    stage: QPayPaymentStage;
    /** QPay's payment summary (payment_amount, payment_currency, payment_wallet), once known. */
    payment?: { payment_amount?: string | number | null; payment_currency?: string | null; payment_wallet?: string | null } | null;
    currency?: string | null;
    error?: string | null;
    onCheckAgain: () => void;
    onOpenBank: () => void;
    onDismiss: () => void;
};

/**
 * What the customer sees after going to pay with QPay. Payment successful (amount and
 * wallet, while the order is placed) takes the whole screen: there is nothing left to do.
 * Checking, not received and failed are a card over the checkout instead, always with the
 * way back to the bank list: bank apps often fail to open the payment (signed out, crashed,
 * wrong bank chosen) and the customer needs to start again from it. Hidden while idle or
 * still in the bank app.
 */
export function QPayPaymentStatus({ stage, payment, currency, error, onCheckAgain, onOpenBank, onDismiss }: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const pop = useRef(new Animated.Value(0)).current;
    const visible = stage === 'verifying' || stage === 'paid' || stage === 'slow' || stage === 'not_received' || stage === 'failed';
    const paid = stage === 'paid' || stage === 'slow';

    // The success mark pops in, and the change is announced to screen readers.
    useEffect(() => {
        if (paid) {
            pop.setValue(0);
            Animated.timing(pop, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
            AccessibilityInfo.announceForAccessibility?.(t('QPayCheckoutScreen.status.paidTitle'));
        }
    }, [paid, pop, t]);

    if (!visible) return null;

    const amount = payment?.payment_amount != null ? formatCurrency(Number(payment.payment_amount), payment.payment_currency || currency || 'MNT') : null;
    const amountLine = [amount, payment?.payment_wallet].filter(Boolean).join(' · ');

    if (paid) {
        return (
            <YStack
                position='absolute'
                top={0}
                left={0}
                right={0}
                bottom={0}
                zIndex={9999}
                backgroundColor='$background'
                alignItems='center'
                justifyContent='center'
                paddingHorizontal={space.gutter + 8}
                paddingTop={insets.top}
                paddingBottom={insets.bottom + 16}
                gap={12}
                accessibilityViewIsModal
            >
                <Animated.View style={{ transform: [{ scale: pop }], opacity: pop }}>
                    <YStack width={88} height={88} borderRadius={44} alignItems='center' justifyContent='center' backgroundColor='$successSoft'>
                        <FontAwesomeIcon icon={faCheck} size={38} color={theme.successForeground.val} />
                    </YStack>
                </Animated.View>
                <UIText variant='title' textAlign='center' accessibilityRole='header'>
                    {t('QPayCheckoutScreen.status.paidTitle')}
                </UIText>
                {!!amountLine && (
                    <UIText variant='bodyStrong' tone='secondary' textAlign='center'>
                        {amountLine}
                    </UIText>
                )}
                {stage === 'paid' ? (
                    <XStack alignItems='center' gap={10} marginTop={8} accessibilityLiveRegion='polite'>
                        <ActivityIndicator size='small' color={theme.textSecondary.val} />
                        <UIText tone='secondary'>{t('QPayCheckoutScreen.status.placingOrder')}</UIText>
                    </XStack>
                ) : (
                    <UIText tone='secondary' textAlign='center' marginTop={8} accessibilityLiveRegion='polite'>
                        {t('QPayCheckoutScreen.status.slowBody')}
                    </UIText>
                )}
            </YStack>
        );
    }

    const verifying = stage === 'verifying';
    const failed = stage === 'failed';
    const iconTint = failed ? theme.errorForeground.val : theme.warningForeground.val;

    return (
        <YStack position='absolute' left={space.gutter} right={space.gutter} bottom={insets.bottom + 12} zIndex={9999} style={elevation.sheet}>
            <YStack padding={16} gap={12} borderRadius={radius.sheet} backgroundColor='$background' borderWidth={1} borderColor='$borderColor' accessibilityLiveRegion='polite'>
                <XStack alignItems='flex-start' gap={12}>
                    <YStack width={36} height={36} borderRadius={18} alignItems='center' justifyContent='center' backgroundColor={verifying ? '$surface' : failed ? '$errorSoft' : '$warningSoft'}>
                        {verifying ? <ActivityIndicator size='small' color={theme.primary.val} /> : <FontAwesomeIcon icon={failed ? faXmark : faClock} size={16} color={iconTint} />}
                    </YStack>
                    <YStack flex={1} gap={2}>
                        <UIText variant='bodyStrong' accessibilityRole='header'>
                            {verifying ? t('QPayCheckoutScreen.status.verifyingTitle') : failed ? t('QPayCheckoutScreen.status.failedTitle') : t('QPayCheckoutScreen.status.notReceivedTitle')}
                        </UIText>
                        <UIText variant='caption' tone='secondary'>
                            {verifying ? t('QPayCheckoutScreen.status.verifyingHint') : failed ? error || t('QPayCheckoutScreen.status.failedBody') : t('QPayCheckoutScreen.status.notReceivedBody')}
                        </UIText>
                    </YStack>
                    {!verifying && (
                        <Pressable onPress={onDismiss} accessibilityRole='button' accessibilityLabel={t('QPayCheckoutScreen.status.backToCheckout')} hitSlop={10} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                            <FontAwesomeIcon icon={faXmark} size={14} color={theme.textSecondary.val} />
                        </Pressable>
                    )}
                </XStack>
                <XStack gap={8}>
                    <YStack flex={1}>
                        <Button fullWidth onPress={onOpenBank}>
                            {failed ? t('QPayCheckoutScreen.status.tryAgain') : t('QPayCheckoutScreen.status.chooseBankAgain')}
                        </Button>
                    </YStack>
                    {!verifying && !failed && (
                        <YStack flex={1}>
                            <Button variant='outline' fullWidth onPress={onCheckAgain}>
                                {t('QPayCheckoutScreen.status.checkAgain')}
                            </Button>
                        </YStack>
                    )}
                </XStack>
            </YStack>
        </YStack>
    );
}

export default QPayPaymentStatus;
