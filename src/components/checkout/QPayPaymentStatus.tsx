import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, AccessibilityInfo, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faClock, faXmark } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/format';
import { Button, UIText, space } from '../../ui';

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
 * What the customer sees after paying with QPay, over the checkout: checking the payment,
 * payment successful (amount and wallet) while the order is placed, and what to do when the
 * payment hasn't come through or failed. Hidden while idle or still in the bank app.
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

    const badge = (background: string, icon: any, color: string, animated = false) => {
        const inner = (
            <YStack width={88} height={88} borderRadius={44} alignItems='center' justifyContent='center' backgroundColor={background as any}>
                <FontAwesomeIcon icon={icon} size={38} color={color} />
            </YStack>
        );
        return animated ? <Animated.View style={{ transform: [{ scale: pop }], opacity: pop }}>{inner}</Animated.View> : inner;
    };

    let content: React.ReactNode;
    if (stage === 'verifying') {
        content = (
            <>
                <YStack width={88} height={88} alignItems='center' justifyContent='center'>
                    <ActivityIndicator size='large' color={theme.primary.val} />
                </YStack>
                <UIText variant='title' textAlign='center' accessibilityRole='header'>
                    {t('QPayCheckoutScreen.status.verifyingTitle')}
                </UIText>
                <UIText tone='secondary' textAlign='center'>
                    {t('QPayCheckoutScreen.status.verifyingBody')}
                </UIText>
            </>
        );
    } else if (paid) {
        content = (
            <>
                {badge('$successSoft', faCheck, theme.successForeground.val, true)}
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
            </>
        );
    } else if (stage === 'not_received') {
        content = (
            <>
                {badge('$warningSoft', faClock, theme.warningForeground.val)}
                <UIText variant='title' textAlign='center' accessibilityRole='header'>
                    {t('QPayCheckoutScreen.status.notReceivedTitle')}
                </UIText>
                <UIText tone='secondary' textAlign='center'>
                    {t('QPayCheckoutScreen.status.notReceivedBody')}
                </UIText>
                <YStack alignSelf='stretch' gap={10} marginTop={12}>
                    <Button size='lg' fullWidth onPress={onCheckAgain}>
                        {t('QPayCheckoutScreen.status.checkAgain')}
                    </Button>
                    <Button size='lg' variant='outline' fullWidth onPress={onOpenBank}>
                        {t('QPayCheckoutScreen.status.openBank')}
                    </Button>
                    <Button size='lg' variant='ghost' fullWidth onPress={onDismiss}>
                        {t('QPayCheckoutScreen.status.backToCheckout')}
                    </Button>
                </YStack>
            </>
        );
    } else {
        content = (
            <>
                {badge('$errorSoft', faXmark, theme.errorForeground.val)}
                <UIText variant='title' textAlign='center' accessibilityRole='header'>
                    {t('QPayCheckoutScreen.status.failedTitle')}
                </UIText>
                <UIText tone='secondary' textAlign='center'>
                    {error || t('QPayCheckoutScreen.status.failedBody')}
                </UIText>
                <YStack alignSelf='stretch' gap={10} marginTop={12}>
                    <Button size='lg' fullWidth onPress={onOpenBank}>
                        {t('QPayCheckoutScreen.status.tryAgain')}
                    </Button>
                    <Button size='lg' variant='ghost' fullWidth onPress={onDismiss}>
                        {t('QPayCheckoutScreen.status.backToCheckout')}
                    </Button>
                </YStack>
            </>
        );
    }

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
            {content}
        </YStack>
    );
}

export default QPayPaymentStatus;
