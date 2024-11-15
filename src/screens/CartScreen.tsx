import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { Stack, Text, YStack, useTheme, Button } from 'tamagui';
import useCart from '../hooks/use-cart';

const CartScreen = () => {
    const theme = useTheme();
    const [cart, updateCart] = useCart();

    if (cart) {
        console.log('[cart]', cart);
    }

    const emptyCart = async () => {
        console.log('Emptying cart', cart);
        if (!cart) return false;

        try {
            const emptiedCart = await cart.empty();
            updateCart(emptiedCart);
            console.log('Cart emptied!', emptiedCart);
        } catch (error) {
            console.log(error.message);
        }
    };

    const reloadCart = async () => {
        console.log('Reloading cart', cart);
        if (!cart) return false;

        try {
            const refreshedCart = await cart.refresh();
            updateCart(refreshedCart);
            console.log('Cart reloaded!', refreshedCart);
        } catch (error) {
            console.log(error.message);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            {cart && (
                <YStack flex={1} alignItems='center' justifyContent='center' bg='$background' space='$3'>
                    <Text size='$7'>Cart has {cart.contents().length} items</Text>
                    <Button onPress={emptyCart} bg='$error' color='white' borderRadius='$3' animation='bouncy' hoverStyle={{ opacity: 0.8 }} pressStyle={{ scale: 0.95 }}>
                        <Button.Text>Empty Cart</Button.Text>
                    </Button>
                    <Button onPress={reloadCart} bg='$primary' color='white' borderRadius='$3' animation='quick' hoverStyle={{ opacity: 0.8 }} pressStyle={{ scale: 0.95 }}>
                        <Button.Text>Reload Cart</Button.Text>
                    </Button>
                </YStack>
            )}
        </SafeAreaView>
    );
};

export default CartScreen;
