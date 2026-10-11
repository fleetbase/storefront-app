import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faArrowUpFromBracket, faChevronLeft, faReceipt } from '@fortawesome/free-solid-svg-icons';
import { format as formatDate } from 'date-fns';
import QRCode from 'react-native-qrcode-svg';
import { Order } from '@fleetbase/sdk';
import { XStack, YStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import useStorefront from '../../hooks/use-storefront';
import useStorage from '../../hooks/use-storage';
import { adapter as fleetbaseAdapter } from '../../hooks/use-fleetbase';
import { paymentKey, receiptText, summarizeOrder } from '../../commerce/order-summary';
import { formatCurrency } from '../../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, Skeleton, StoreLogo, UIText, radius, space } from '../../ui';
import useScreenTopInset from '../../hooks/use-screen-top-inset';

function Row({ label, value, tone, strong = false }: { label: string; value: string; tone?: 'secondary' | 'success'; strong?: boolean }) {
    return (
        <XStack justifyContent='space-between' gap={12}>
            <UIText variant={strong ? 'bodyStrong' : 'body'} tone={strong ? undefined : (tone ?? 'secondary')} flexShrink={1}>
                {label}
            </UIText>
            <UIText variant={strong ? 'bodyStrong' : 'body'} tone={tone === 'success' ? 'success' : undefined}>
                {value}
            </UIText>
        </XStack>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <YStack gap={10} paddingVertical={16} borderTopWidth={1} borderColor='$borderColor'>
            <UIText variant='captionStrong' tone='secondary' accessibilityRole='header' style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {title}
            </UIText>
            {children}
        </YStack>
    );
}

/**
 * Mongolian e-barimt tax receipt for orders paid with QPay: the QR code to register it,
 * the lottery number and the tax amounts. Comes from the order when checkout recorded
 * it, otherwise it is requested from the storefront.
 */
function TaxReceipt({ order }: { order: any }) {
    const { t } = useLanguage();
    const { adapter } = useStorefront();
    const { customer } = useAuth() as any;
    const recorded = order?.meta?.ebarimt ?? null;
    const [fetched, setFetched] = useState<any>(null);
    const [failed, setFailed] = useState(false);
    const [cachedQr, setCachedQr] = useStorage<string | null>(`receipt_qr_${order?.id}`, null);
    const data = fetched ?? recorded;
    const qr = data?.ebarimt_qr_data ?? order?.meta?.ebarimt_qr_data ?? cachedQr;

    const request = useCallback(async () => {
        if (!adapter || !order?.id) return;
        setFailed(false);
        try {
            const receiver = customer?.getAttribute?.('meta.ebarimt_registration_no', '') ?? '';
            setFetched(await adapter.post('orders/receipt', { order: order.id, ebarimt_receiver: receiver, ebarimt_receiver_type: receiver ? 'COMPANY' : 'CITIZEN' }));
        } catch {
            setFailed(true);
        }
    }, [adapter, customer, order?.id]);

    useEffect(() => {
        if (!recorded) request();
    }, [recorded, request]);

    useEffect(() => {
        if (qr && qr !== cachedQr) setCachedQr(qr);
    }, [qr, cachedQr, setCachedQr]);

    const tugrik = (value: unknown) => formatCurrency(Number(value) || 0, 'MNT');
    const na = t('ReceiptScreen.not_available');

    if (!data) {
        return (
            <Section title={t('Receipt.taxReceipt')}>
                {failed ? (
                    <XStack alignItems='center' justifyContent='space-between' gap={12}>
                        <UIText tone='secondary' flex={1}>
                            {t('ReceiptScreen.error_alert_message')}
                        </UIText>
                        <Button variant='outline' size='sm' onPress={request}>
                            {t('ReceiptScreen.retry')}
                        </Button>
                    </XStack>
                ) : (
                    <Skeleton height={180} radius={radius.card} />
                )}
            </Section>
        );
    }

    return (
        <Section title={t('Receipt.taxReceipt')}>
            <YStack alignItems='center' gap={10}>
                {qr ? (
                    <YStack padding={10} backgroundColor='#fff' borderRadius={radius.card} accessibilityLabel={t('ReceiptScreen.scan_qr_code')}>
                        <QRCode value={qr} size={170} backgroundColor='white' color='black' />
                    </YStack>
                ) : (
                    <UIText tone='secondary'>{t('ReceiptScreen.qr_not_available')}</UIText>
                )}
                {!!qr && (
                    <UIText variant='caption' tone='secondary'>
                        {t('ReceiptScreen.scan_qr_code')}
                    </UIText>
                )}
            </YStack>
            <Row label={t('ReceiptScreen.lottery_number')} value={data.ebarimt_lottery || na} />
            <Row label={t('ReceiptScreen.total_amount')} value={tugrik(data.amount)} />
            <Row label={t('ReceiptScreen.vat_amount')} value={tugrik(data.vat_amount)} />
            <Row label={t('ReceiptScreen.city_tax_amount')} value={tugrik(data.city_tax_amount)} />
            <Row label={t('ReceiptScreen.status')} value={data.barimt_status || na} />
            <Row label={t('ReceiptScreen.receiver_type')} value={data.ebarimt_receiver_type || na} />
            {!!data.ebarimt_receiver && <Row label={t('ReceiptScreen.receiver_id')} value={String(data.ebarimt_receiver)} />}
            <Row label={t('ReceiptScreen.register_no')} value={data.merchant_register_no || na} />
            <Row label={t('ReceiptScreen.tin')} value={data.merchant_tin || na} />
            {!!data.ebarimt_receipt_id && <Row label={t('Receipt.taxReceiptId')} value={String(data.ebarimt_receipt_id)} />}
        </Section>
    );
}

/**
 * The receipt for one order: the store, what was ordered with its options, every charge
 * and discount, how it was paid and where it went. Can be shared as text.
 */
const ReceiptScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const top = useScreenTopInset(true);
    const { t } = useLanguage();
    const params = route?.params ?? {};
    const initial = params.order ?? (params.orderId ? { id: params.orderId } : null);
    // A reloaded copy wins over the order passed in, while it is for the same order.
    const [reloaded, setReloaded] = useState<any>(null);
    const json = reloaded && reloaded.id === initial?.id ? reloaded : initial;
    const [state, setState] = useState<'ready' | 'loading' | 'refreshing' | 'error'>(initial?.meta ? 'ready' : 'loading');

    const reload = useCallback(
        async (kind: 'loading' | 'refreshing') => {
            if (!initial?.id) return setState('error');
            setState(kind);
            try {
                const order = await new Order({ id: initial.id }, fleetbaseAdapter).reload();
                setReloaded(order.serialize());
                setState('ready');
            } catch {
                setState(kind === 'refreshing' && json?.meta ? 'ready' : 'error');
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [initial?.id]
    );

    useEffect(() => {
        if (initial?.meta) setState('ready');
        else reload('loading');
    }, [initial?.meta, reload]);

    const summary = useMemo(() => (json?.meta ? summarizeOrder(json) : null), [json]);
    const money = (value: number) => formatCurrency(value, summary?.currency ?? undefined);
    const canShare = Platform.OS !== 'web' || typeof (globalThis as any).navigator?.share === 'function';

    const share = async () => {
        if (!summary) return;
        try {
            await Share.share({ message: receiptText(summary, { t, money, date: summary.createdAt ? formatDate(new Date(summary.createdAt), 'PPp') : null }), title: t('Receipt.title') });
        } catch {
            // Dismissed or unsupported; nothing to do.
        }
    };

    const header = (
        <XStack paddingTop={top + 4} paddingHorizontal={space.gutter - 10} alignItems='center' justifyContent='space-between'>
            <XStack alignItems='center' gap={4}>
                <IconButton icon={faChevronLeft} variant='plain' size={44} accessibilityLabel={t('UI.back')} onPress={() => navigation.goBack()} />
                <UIText variant='title' accessibilityRole='header'>
                    {t('Receipt.title')}
                </UIText>
            </XStack>
            {!!summary && canShare && <IconButton icon={faArrowUpFromBracket} variant='plain' size={44} accessibilityLabel={t('Receipt.share')} onPress={share} />}
        </XStack>
    );

    if (!summary) {
        return (
            <YStack flex={1} backgroundColor='$background'>
                {header}
                {state === 'error' ? (
                    <YStack flex={1} justifyContent='center'>
                        {initial?.id ? (
                            <ErrorState title={t('Receipt.loadFailed')} onRetry={() => reload('loading')} />
                        ) : (
                            <EmptyState icon={faReceipt} title={t('ReceiptScreen.no_receipt_title')} description={t('ReceiptScreen.no_receipt_message')} />
                        )}
                    </YStack>
                ) : (
                    <YStack padding={space.gutter} gap={14}>
                        <Skeleton height={56} radius={radius.card} />
                        <Skeleton height={18} width='70%' />
                        <Skeleton height={18} width='60%' />
                        <Skeleton height={160} radius={radius.card} />
                    </YStack>
                )}
            </YStack>
        );
    }

    const paidWith = t(`Receipt.paidWith.${paymentKey(summary.gateway)}`);

    return (
        <YStack flex={1} backgroundColor='$background'>
            {header}
            <ScrollView
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: insets.bottom + 32 }}
                refreshControl={<RefreshControl refreshing={state === 'refreshing'} onRefresh={() => reload('refreshing')} />}
            >
                <Card appearance='flat' padding={16} gap={12} marginTop={8} marginBottom={8} borderRadius={radius.card}>
                    <XStack gap={12} alignItems='center'>
                        <StoreLogo uri={null} name={summary.storeName} size={48} />
                        <YStack flex={1} gap={2}>
                            <UIText variant='bodyStrong' numberOfLines={1}>
                                {summary.storeName}
                            </UIText>
                            <UIText variant='caption' tone='secondary'>
                                {t('Receipt.orderNumber', { number: summary.reference })}
                            </UIText>
                            {!!summary.createdAt && (
                                <UIText variant='caption' tone='secondary'>
                                    {formatDate(new Date(summary.createdAt), 'PPp')}
                                </UIText>
                            )}
                        </YStack>
                        <Badge label={t(`Orders.status.${summary.phase}`)} tone={summary.canceled ? 'error' : summary.active ? 'brand' : 'success'} size='sm' />
                    </XStack>
                </Card>

                <Section title={t('Receipt.items', { count: summary.itemCount })}>
                    {summary.lines.map((line) => (
                        <XStack key={line.id} gap={12} alignItems='flex-start'>
                            <UIText variant='bodyStrong' style={{ minWidth: 26 }}>
                                {line.quantity}×
                            </UIText>
                            <YStack flex={1} gap={2}>
                                <UIText>{line.name}</UIText>
                                {!!line.options.length && (
                                    <UIText variant='caption' tone='secondary'>
                                        {line.options.join(' · ')}
                                    </UIText>
                                )}
                                {!!line.scheduledAt && (
                                    <UIText variant='caption' tone='secondary'>
                                        {t('Receipt.bookedFor', { when: formatDate(new Date(line.scheduledAt.replace(' ', 'T')), 'PPp') })}
                                    </UIText>
                                )}
                            </YStack>
                            <UIText>{money(line.subtotal)}</UIText>
                        </XStack>
                    ))}
                </Section>

                <Section title={t('Receipt.payment')}>
                    <Row label={t('Receipt.subtotal')} value={money(summary.subtotal)} />
                    {!summary.isPickup && <Row label={t('Receipt.deliveryFee')} value={money(summary.deliveryFee)} />}
                    {summary.tip > 0 && <Row label={t('Receipt.tip')} value={money(summary.tip)} />}
                    {summary.deliveryTip > 0 && <Row label={t('Receipt.driverTip')} value={money(summary.deliveryTip)} />}
                    {summary.promotions.length
                        ? summary.promotions.map((promotion) => (
                              <Row key={`${promotion.code}-${promotion.name}`} label={promotion.code ?? promotion.name} value={`−${money(promotion.amount)}`} tone='success' />
                          ))
                        : summary.discount > 0 && <Row label={t('Receipt.discount')} value={`−${money(summary.discount)}`} tone='success' />}
                    <YStack paddingTop={10} borderTopWidth={1} borderColor='$borderColor'>
                        <Row label={t('Receipt.total')} value={money(summary.total)} strong />
                    </YStack>
                    <UIText variant='caption' tone='secondary'>
                        {summary.canceled ? t('Receipt.canceledNote') : paidWith}
                    </UIText>
                </Section>

                {(!!summary.address || !!summary.notes) && (
                    <Section title={summary.isPickup ? t('Receipt.pickup') : t('Receipt.delivery')}>
                        {!!summary.address && <UIText>{summary.address}</UIText>}
                        {!!summary.notes && <UIText tone='secondary'>{t('Receipt.notes', { notes: summary.notes })}</UIText>}
                    </Section>
                )}

                {summary.gateway === 'qpay' && !summary.canceled && <TaxReceipt order={json} />}
            </ScrollView>
        </YStack>
    );
};

export default ReceiptScreen;
