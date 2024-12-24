import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FlatList } from 'react-native';
import { Spinner, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { formatCurrency } from '../utils/format';
import useCart from '../hooks/use-cart';

const CheckoutTotal = ({ lineItems }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const [cart, updateCart] = useCart();

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
                                    {item.loading ? <Spinner size={5} /> : formatCurrency(item.value, cart.getAttribute('currency'))}{' '}
                                    {typeof item.tip === 'string' && item.tip.endsWith('%') && `(${item.tip})`}
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
