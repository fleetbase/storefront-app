import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FlatList } from 'react-native';
import { Spinner, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { formatCurrency, numbersOnly } from '../utils/format';
import { percentage } from '../utils/math';
import { useLanguage } from '../contexts/LanguageContext';

const calculateTip = (tip, subtotal) => {
    let amount = tip;

    if (typeof tip === 'string' && tip.endsWith('%')) {
        amount = percentage(numbersOnly(tip), subtotal);

        return amount;
    }

    return amount;
};

const calculateTotal = (lineItems = []) => {
    return lineItems.reduce((accumulator, current) => accumulator + numbersOnly(current.value), 0);
};

const OrderTotal = ({ order }) => {
    const { t } = useLanguage();
    const theme = useTheme();
    const currency = order.getAttribute('meta.currency');
    const subtotal = order.getAttribute('meta.subtotal');
    const deliveryFee = order.getAttribute('meta.delivery_fee');
    const tip = order.getAttribute('meta.tip');
    const deliveryTip = order.getAttribute('meta.delivery_tip');
    const total = order.getAttribute('meta.total');
    const isPickup = order.getAttribute('meta.is_pickup');

    const lineItems = useMemo(() => {
        const items = [
            {
                name: t('lineItems.subtotal'),
                value: subtotal,
            },
        ];

        if (deliveryFee && !isPickup) {
            items.push({
                name: t('lineItems.deliveryFee'),
                value: deliveryFee,
            });
        }

        if (deliveryTip > 0) {
            items.push({
                name: t('lineItems.deliveryTip'),
                value: calculateTip(deliveryTip, subtotal),
                tip: deliveryTip,
            });
        }

        if (tip > 0) {
            items.push({
                name: t('lineItems.tip'),
                value: calculateTip(tip, subtotal),
                tip,
            });
        }

        items.push({
            name: t('lineItems.total'),
            value: total,
        });

        return items;
    }, [order, tip, deliveryTip, deliveryFee, isPickup]);

    return (
        <YStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' space='$2'>
            <FlatList
                data={lineItems}
                scrollEnabled={false}
                keyExtractor={(item, index) => index}
                renderItem={({ item }) => {
                    return (
                        <XStack space='$3' p='$4' justifyContent='space-between'>
                            <YStack>
                                <Text size='$5' color='$textPrimary' fontWeight='bold'>
                                    {item.name}
                                </Text>
                            </YStack>
                            <YStack justifyContent='flex-end'>
                                <Text size='$5' color='$textPrimary' fontWeight={item.name === t('lineItems.total') ? 'bold' : 'normal'}>
                                    {formatCurrency(item.value, currency)} {typeof item.tip === 'string' && item.tip.endsWith('%') && `(${tip})`}
                                </Text>
                            </YStack>
                        </XStack>
                    );
                }}
                ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
            />
        </YStack>
    );
};

export default OrderTotal;
