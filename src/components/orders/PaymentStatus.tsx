import React, { useState } from 'react';
import { Linking, Platform, Share } from 'react-native';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { hasBalanceDue, paymentBadge, type OrderPayment } from '../../commerce/order-payment';
import { paymentLines } from '../../commerce/order-summary';
import { toast } from '../../utils/toast';
import { Badge, Button, UIText, radius } from '../../ui';

/** The payment's state as a badge: Paid, To pay on delivery, Refunded, Partly refunded, Balance due. */
export function PaymentBadge({ payment, size = 'sm' }: { payment: OrderPayment | null; size?: 'sm' | 'md' }) {
    const { t } = useLanguage();
    const badge = paymentBadge(payment);
    if (!badge) return null;
    return <Badge size={size} tone={badge.tone} label={t(`Payment.state.${badge.key}`)} />;
}

/**
 * What changed with the money after the order was placed: refunds, store credit (with its
 * code, to copy or share), cash still to collect and any balance due, with "Pay now"
 * opening the store's payment link.
 */
export default function PaymentStatus({ payment, money, showBadge = true }: { payment: OrderPayment | null; money: (value: number) => string; showBadge?: boolean }) {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);
    if (!payment) return null;
    const lines = paymentLines(payment);
    const due = hasBalanceDue(payment);
    if (!lines.length && !payment.storeCreditCode && !due && !(showBadge && payment.reported)) return null;

    const canCopy = Platform.OS === 'web' && typeof (globalThis as any).navigator?.clipboard?.writeText === 'function';
    const copyCode = async () => {
        const code = payment.storeCreditCode;
        if (!code) return;
        try {
            if (canCopy) {
                await (globalThis as any).navigator.clipboard.writeText(code);
                setCopied(true);
            } else {
                await Share.share({ message: code });
            }
        } catch {
            // Dismissed or unsupported; the code stays selectable on screen.
        }
    };
    const pay = () => {
        if (!payment.paymentLink) return;
        Linking.openURL(payment.paymentLink).catch(() => toast.error(t('Payment.linkFailed')));
    };

    return (
        <YStack gap={8} accessibilityLabel={t('Payment.title')}>
            {showBadge && payment.reported && (
                <XStack justifyContent='space-between' alignItems='center'>
                    <UIText tone='secondary'>{t('Payment.title')}</UIText>
                    <PaymentBadge payment={payment} />
                </XStack>
            )}
            {lines.map((line) => (
                <XStack key={line.key} justifyContent='space-between'>
                    <UIText tone={line.key === 'balanceDue' || line.key === 'cashDue' ? 'warning' : 'secondary'}>{t(`Receipt.${line.key}`)}</UIText>
                    <UIText tone={line.key === 'balanceDue' || line.key === 'cashDue' ? 'warning' : 'success'}>
                        {line.key === 'refunded' || line.key === 'credited' ? '−' : ''}
                        {money(line.amount)}
                    </UIText>
                </XStack>
            ))}
            {!!payment.storeCreditCode && (
                <YStack gap={6} padding={12} borderRadius={radius.button} backgroundColor='$primarySoft'>
                    <UIText variant='captionStrong'>{t('Payment.storeCreditTitle')}</UIText>
                    <XStack alignItems='center' gap={10}>
                        <UIText
                            flex={1}
                            variant='heading'
                            tone='brand'
                            style={{ letterSpacing: 1.5 }}
                            selectable
                            accessibilityLabel={t('Payment.storeCreditCode', { code: payment.storeCreditCode })}
                        >
                            {payment.storeCreditCode}
                        </UIText>
                        <Button variant='inverse' size='sm' onPress={copyCode}>
                            {canCopy ? (copied ? t('Offers.copied') : t('Offers.copy')) : t('Payment.shareCode')}
                        </Button>
                    </XStack>
                    <UIText variant='caption' tone='secondary'>
                        {t('Payment.storeCreditBody')}
                    </UIText>
                </YStack>
            )}
            {due && (
                <YStack gap={8} padding={12} borderRadius={radius.button} backgroundColor='$warningSoft' accessibilityRole='alert'>
                    <UIText variant='captionStrong'>{t('Payment.balanceDueTitle', { amount: money(payment.balanceDue) })}</UIText>
                    <UIText variant='caption' tone='secondary'>
                        {payment.paymentLink ? t('Payment.balanceDueBody') : t('Payment.balanceDueNoLink')}
                    </UIText>
                    {!!payment.paymentLink && (
                        <Button fullWidth icon={faArrowUpRightFromSquare} onPress={pay} testID='order-pay-now'>
                            {t('Payment.payNow')}
                        </Button>
                    )}
                </YStack>
            )}
        </YStack>
    );
}
