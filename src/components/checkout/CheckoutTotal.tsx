import React, { useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FlatList } from 'react-native';
import { Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { formatCurrency, numbersOnly } from '../../utils/format';
import { percentage } from '../../utils/math';
import useCart from '../../hooks/use-cart';

const calculateTip = (tip, cart) => {
    let amount = tip;

    if (typeof tip === 'string' && tip.endsWith('%')) {
        amount = percentage(numbersOnly(tip), cart.subtotal());

        return amount;
    }

    return amount;
};

const calculateTotal = (lineItems = []) => {
    return lineItems.reduce((accumulator, current) => accumulator + numbersOnly(current.value), 0);
};

const CheckoutTotal = ({ tip, deliveryTip }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const [cart, updateCart] = useCart();
    const lineItems = [
        {
            name: 'Cart Subtotal',
            value: cart.subtotal(),
        },
    ];

    if (tip) {
        lineItems.push({
            name: 'Tip',
            value: calculateTip(tip, cart),
            tip,
        });
    }

    if (deliveryTip) {
        lineItems.push({
            name: 'Delivery Tip',
            value: calculateTip(deliveryTip, cart),
            tip: deliveryTip,
        });
    }

    lineItems.push({
        name: 'Total',
        value: calculateTotal([...lineItems]),
    });

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
                                <Text size='$5' color='$textPrimary'>
                                    {formatCurrency(item.value, cart.getAttribute('currency'))} {typeof item.tip === 'string' && item.tip.endsWith('%') && `(${tip})`}
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

export default CheckoutTotal;
