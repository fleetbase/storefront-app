import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FlatList } from 'react-native';
import { Spinner, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { formatCurrency, numbersOnly } from '../utils/format';
import { percentage } from '../utils/math';

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
    const theme = useTheme();
    const currency = order.getAttribute('meta.currency');
    const subtotal = order.getAttribute('meta.subtotal');
    const deliveryFee = order.getAttribute('meta.delivery_fee');
    const tip = order.getAttribute('meta.tip');
    const deliveryTip = order.getAttribute('meta.delivery_tip');
    const total = order.getAttribute('meta.total');

    const lineItems = useMemo(() => {
        const items = [
            {
                name: 'Subtotal',
                value: subtotal,
            },
        ];

        if (deliveryFee) {
            items.push({
                name: 'Delivery Fee',
                value: deliveryFee,
            });
        }

        if (deliveryTip) {
            items.push({
                name: 'Delivery Tip',
                value: calculateTip(deliveryTip, subtotal),
                tip: deliveryTip,
            });
        }

        if (tip) {
            items.push({
                name: 'Tip',
                value: calculateTip(tip, subtotal),
                tip,
            });
        }

        items.push({
            name: 'Total',
            value: total,
        });

        return items;
    }, [order]);

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
                                <Text size='$5' color='$textPrimary' fontWeight={item.name === 'Total' ? 'bold' : 'normal'}>
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
