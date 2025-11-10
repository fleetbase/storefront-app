import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Button, Image, Stack, Text, YStack, XStack, useTheme, Separator } from 'tamagui';
import { Order } from '@fleetbase/sdk';
import { adapter as fleetbaseAdapter } from '../hooks/use-fleetbase';
import { format as formatDate } from 'date-fns';
import useStorefront from '../hooks/use-storefront';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import QRCode from 'react-native-qrcode-svg';

/**
 * Receipt Screen Component
 *
 * Displays ebarimt receipt information for QPay orders including:
 * - QR code for verification
 * - Amount breakdown (total, VAT, city tax)
 * - Receipt date and lottery number
 * - Merchant information
 * - Ebarimt provider details
 */
const ReceiptScreen = ({ route }) => {
    const params = route.params || {};
    const theme = useTheme();
    const { customer } = useAuth();
    const { t } = useLanguage();
    const { storefront, adapter: storefrontAdapter } = useStorefront();
    const [order, setOrder] = useState(() => new Order(params.order, fleetbaseAdapter));
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Determine receipt data source
     * Priority: API response > Order meta > null
     */
    const receiptData = useMemo(() => {
        if (response) return response;
        if (order.getAttribute('payload.payment_method') === 'qpay' && order.getAttribute('meta.ebarimt')) {
            return order.getAttribute('meta.ebarimt');
        }
        return null;
    }, [order, response]);

    /**
     * Determine receipt data source
     * Priority: API response > Order meta > null
     */
    const qrData = useMemo(() => {
        if (response) return null;
        const orderMeta = order.getAttribute('meta', {}) ?? {};
        return orderMeta?.ebarimt_qr_data ?? orderMeta?.ebarimt?.ebarimt_qr_data ?? null;
    }, [order, response]);

    /**
     * Check if receipt data already exists in order meta
     */
    const hasExistingReceipt = useMemo(() => {
        return order.getAttribute('payload.payment_method') === 'qpay' && order.getAttribute('meta.ebarimt') !== null && order.getAttribute('meta.ebarimt') !== undefined;
    }, [order]);

    /**
     * Fetch receipt data from API
     */
    const getReceiptData = useCallback(
        async (isRefresh = false) => {
            // Skip API call if receipt already exists in meta and not refreshing
            if (hasExistingReceipt && !isRefresh) {
                return;
            }

            try {
                if (isRefresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }
                setError(null);

                const data = await storefrontAdapter.post('orders/receipt', { order: order.id });
                setResponse(data);
            } catch (err) {
                console.error('Error fetching receipt:', err);
                setError(err.message || 'Failed to load receipt data');
                Alert.alert(t('ReceiptScreen.error_alert_title'), t('ReceiptScreen.error_alert_message'));
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [storefrontAdapter, order.id, hasExistingReceipt, t]
    );

    /**
     * Handle pull-to-refresh
     */
    const onRefresh = useCallback(() => {
        getReceiptData(true);
    }, [getReceiptData]);

    /**
     * Load receipt data on mount if needed
     */
    useEffect(() => {
        if (storefrontAdapter && !hasExistingReceipt) {
            getReceiptData();
        }
    }, [storefrontAdapter, hasExistingReceipt, getReceiptData]);

    /**
     * Format currency amount
     */
    const formatAmount = (amount) => {
        const numAmount = parseFloat(amount || 0);
        return numAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    /**
     * Format date string
     */
    const formatReceiptDate = (dateString) => {
        if (!dateString) return t('ReceiptScreen.not_available');
        try {
            return formatDate(new Date(dateString), 'MMM dd, yyyy HH:mm');
        } catch (err) {
            return dateString;
        }
    };

    /**
     * Render loading state
     */
    if (loading && !receiptData) {
        return (
            <YStack flex={1} justifyContent='center' alignItems='center' backgroundColor={theme.background.val}>
                <ActivityIndicator size='large' color={theme.color.val} />
                <Text marginTop='$4' color={theme.color.val}>
                    {t('ReceiptScreen.loading_receipt')}
                </Text>
            </YStack>
        );
    }

    /**
     * Render error state
     */
    if (error && !receiptData) {
        return (
            <YStack flex={1} justifyContent='center' alignItems='center' padding='$4' backgroundColor={theme.background.val}>
                <Text fontSize='$6' color={theme['red-100'].val} marginBottom='$4'>
                    ⚠️ {t('ReceiptScreen.error_title')}
                </Text>
                <Text color={theme.color.val} textAlign='center' marginBottom='$4'>
                    {error}
                </Text>
                <Button onPress={() => getReceiptData()} theme='blue'>
                    {t('ReceiptScreen.retry')}
                </Button>
            </YStack>
        );
    }

    /**
     * Render no receipt state
     */
    if (!receiptData) {
        return (
            <YStack flex={1} justifyContent='center' alignItems='center' padding='$4' backgroundColor={theme.background.val}>
                <Text fontSize='$6' color={theme.color.val} marginBottom='$4'>
                    📄 {t('ReceiptScreen.no_receipt_title')}
                </Text>
                <Text color={theme.color.val} textAlign='center'>
                    {t('ReceiptScreen.no_receipt_message')}
                </Text>
            </YStack>
        );
    }

    /**
     * Main receipt display
     */
    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.background.val }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.val} />}>
            <YStack space='$2'>
                {/* Header */}
                <YStack alignItems='center' space='$2' pt='$10' pb='$2'>
                    <Text fontSize='$8' fontWeight='bold' color={theme.color.val}>
                        {t('ReceiptScreen.title')}
                    </Text>
                    <Text fontSize='$3' color={theme['gray-100'].val}>
                        {receiptData.ebarimt_receipt_id || t('ReceiptScreen.not_available')}
                    </Text>
                </YStack>

                <Separator borderColor={theme.borderColor.val} />

                {/* QR Code Section */}
                <YStack alignItems='center' space='$3' py='$2'>
                    <Text fontSize='$5' fontWeight='600' color={theme.color.val}>
                        {t('ReceiptScreen.scan_qr_code')}
                    </Text>
                    {qrData ? (
                        <YStack padding='$2' backgroundColor='white' borderRadius='$4' borderWidth={1} borderColor={theme.borderColor.val}>
                            <QRCode value={qrData} size={180} backgroundColor='white' color='black' />
                        </YStack>
                    ) : (
                        <Text color={theme['gray-100'].val}>{t('ReceiptScreen.qr_not_available')}</Text>
                    )}
                </YStack>

                <Separator borderColor={theme.borderColor.val} />

                {/* Amount Breakdown Section */}
                <YStack space='$2' py='$2' px='$4'>
                    <Text fontSize='$6' fontWeight='600' color={theme.color.val} marginBottom='$2'>
                        {t('ReceiptScreen.amount_details')}
                    </Text>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.total_amount')}
                        </Text>
                        <Text fontSize='$5' fontWeight='600' color={theme.color.val}>
                            ₮{formatAmount(receiptData.amount)}
                        </Text>
                    </XStack>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.vat_amount')}
                        </Text>
                        <Text fontSize='$4' color={theme.color.val}>
                            ₮{formatAmount(receiptData.vat_amount)}
                        </Text>
                    </XStack>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.city_tax_amount')}
                        </Text>
                        <Text fontSize='$4' color={theme.color.val}>
                            ₮{formatAmount(receiptData.city_tax_amount)}
                        </Text>
                    </XStack>
                </YStack>

                <Separator borderColor={theme.borderColor.val} />

                {/* Receipt Information Section */}
                <YStack space='$2' py='$2' px='$4'>
                    <Text fontSize='$6' fontWeight='600' color={theme.color.val} marginBottom='$2'>
                        {t('ReceiptScreen.receipt_information')}
                    </Text>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.date')}
                        </Text>
                        <Text fontSize='$4' color={theme.color.val}>
                            {formatReceiptDate(receiptData.barimt_status_date || receiptData.created_date)}
                        </Text>
                    </XStack>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.lottery_number')}
                        </Text>
                        <Text fontSize='$5' fontWeight='600' color={theme['green-100'].val}>
                            {receiptData.ebarimt_lottery || t('ReceiptScreen.not_available')}
                        </Text>
                    </XStack>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.status')}
                        </Text>
                        <Text fontSize='$4' fontWeight='600' color={receiptData.barimt_status === 'REGISTERED' ? theme['green-100'].val : theme['orange-100'].val}>
                            {receiptData.barimt_status || t('ReceiptScreen.not_available')}
                        </Text>
                    </XStack>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.receiver_type')}
                        </Text>
                        <Text fontSize='$4' color={theme.color.val}>
                            {receiptData.ebarimt_receiver_type || t('ReceiptScreen.not_available')}
                        </Text>
                    </XStack>

                    {receiptData.ebarimt_receiver && (
                        <XStack justifyContent='space-between' alignItems='center'>
                            <Text fontSize='$4' color={theme['gray-200'].val}>
                                {t('ReceiptScreen.receiver_id')}
                            </Text>
                            <Text fontSize='$4' color={theme.color.val}>
                                {receiptData.ebarimt_receiver}
                            </Text>
                        </XStack>
                    )}
                </YStack>

                <Separator borderColor={theme.borderColor.val} />

                {/* Merchant Information Section */}
                <YStack space='$2' py='$2' px='$4'>
                    <Text fontSize='$6' fontWeight='600' color={theme.color.val} marginBottom='$2'>
                        {t('ReceiptScreen.merchant_information')}
                    </Text>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.merchant_id')}
                        </Text>
                        <Text fontSize='$4' color={theme.color.val}>
                            {receiptData.g_merchant_id || t('ReceiptScreen.not_available')}
                        </Text>
                    </XStack>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.register_no')}
                        </Text>
                        <Text fontSize='$4' color={theme.color.val}>
                            {receiptData.merchant_register_no || t('ReceiptScreen.not_available')}
                        </Text>
                    </XStack>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.tin')}
                        </Text>
                        <Text fontSize='$4' color={theme.color.val}>
                            {receiptData.merchant_tin || t('ReceiptScreen.not_available')}
                        </Text>
                    </XStack>

                    {receiptData.merchant_branch_code && (
                        <XStack justifyContent='space-between' alignItems='center'>
                            <Text fontSize='$4' color={theme['gray-200'].val}>
                                {t('ReceiptScreen.branch_code')}
                            </Text>
                            <Text fontSize='$4' color={theme.color.val}>
                                {receiptData.merchant_branch_code}
                            </Text>
                        </XStack>
                    )}

                    {receiptData.merchant_staff_code && (
                        <XStack justifyContent='space-between' alignItems='center'>
                            <Text fontSize='$4' color={theme['gray-200'].val}>
                                {t('ReceiptScreen.staff_code')}
                            </Text>
                            <Text fontSize='$4' color={theme.color.val}>
                                {receiptData.merchant_staff_code}
                            </Text>
                        </XStack>
                    )}
                </YStack>

                <Separator borderColor={theme.borderColor.val} />

                {/* Provider Information Section */}
                <YStack space='$2' py='$2' px='$4'>
                    <Text fontSize='$6' fontWeight='600' color={theme.color.val} marginBottom='$2'>
                        {t('ReceiptScreen.provider_information')}
                    </Text>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.ebarimt_by')}
                        </Text>
                        <Text fontSize='$5' fontWeight='600' color={theme['blue-100'].val}>
                            {receiptData.ebarimt_by || t('ReceiptScreen.not_available')}
                        </Text>
                    </XStack>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.payment_id')}
                        </Text>
                        <Text fontSize='$3' color={theme.color.val} numberOfLines={1}>
                            {receiptData.g_payment_id || t('ReceiptScreen.not_available')}
                        </Text>
                    </XStack>

                    <XStack justifyContent='space-between' alignItems='center'>
                        <Text fontSize='$4' color={theme['gray-200'].val}>
                            {t('ReceiptScreen.paid_by')}
                        </Text>
                        <Text fontSize='$4' color={theme.color.val}>
                            {receiptData.paid_by || t('ReceiptScreen.not_available')}
                        </Text>
                    </XStack>
                </YStack>

                {/* Footer spacing */}
                <YStack height='$4' />
            </YStack>
        </ScrollView>
    );
};

export default ReceiptScreen;
