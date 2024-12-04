import React, { useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FlatList, Pressable } from 'react-native';
import { Button, Image, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../../utils/format';
import { loadPersistedResource, showActionSheet } from '../../utils';
import useCart from '../../hooks/use-cart';

const CartContents = ({}) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const [cart, updateCart] = useCart();

    const handleCartItemActions = (cartItem) => {
        showActionSheet({
            options: ['Update Item', 'Remove from Cart', 'Cancel'],
            cancelButtonIndex: 2,
            destructiveButtonIndex: 1,
            onSelect: (buttonIndex) => {
                switch (buttonIndex) {
                    case 0:
                        handleEdit(cartItem);
                        break;
                    case 1:
                        handleDelete(cartItem);
                        break;
                    default:
                        console.log('Action canceled');
                        break;
                }
            },
        });
    };

    const handleEdit = async (cartItem) => {
        const product = await loadPersistedResource((storefront) => storefront.products.findRecord(cartItem.product_id), { type: 'product', persistKey: `${cartItem.product_id}_product` });
        if (product) {
            navigation.navigate('CartItem', { cartItem, product: product.serialize() });
        }
    };

    const handleDelete = async (cartItem) => {
        try {
            const updatedCart = await cart.remove(cartItem.id);
            updateCart(updatedCart);
            toast.success(`${cartItem.name} removed from cart.`, { position: ToastPosition.BOTTOM });
        } catch (error) {
            toast.error('Failed to remove item from cart');
            console.error('Error removing cart item:', error.message);
        }
    };

    return (
        <YStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' space='$2'>
            <FlatList
                data={cart.contents()}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item: cartItem }) => {
                    return (
                        <XStack space='$3' p='$4'>
                            <XStack flex={1}>
                                <Pressable onPress={() => handleEdit(cartItem)} style={{ flex: 1 }}>
                                    <XStack flex={1} space='$3'>
                                        <YStack
                                            borderWidth={1}
                                            borderColor='$borderColor'
                                            borderRadius='$3'
                                            height={60}
                                            width={60}
                                            alignItems='center'
                                            justifyContent='center'
                                            position='relative'
                                        >
                                            <Image
                                                source={{ uri: cartItem.product_image_url }}
                                                style={{
                                                    height: '100%',
                                                    width: '100%',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    borderRadius: 5,
                                                }}
                                                resizeMode='cover'
                                            />
                                        </YStack>
                                        <YStack flex={1}>
                                            <Text fontSize='$5' fontWeight='bold' color='$textPrimary' mb='$1' numberOfLines={1}>
                                                {cartItem.name}
                                            </Text>
                                            <XStack space='$1'>
                                                <YStack pt='$1'>
                                                    <Text fontSize='$3' fontWeight='bold' color='$textSecondary'>
                                                        x{cartItem.quantity}
                                                    </Text>
                                                </YStack>
                                                <Text numberOfLines={1} fontSize='$5' fontWeight='bold' color='$textSecondary'>
                                                    {formatCurrency(cartItem.subtotal, cart.getAttribute('currency'))}
                                                </Text>
                                            </XStack>
                                            {cartItem.description && (
                                                <Text fontSize='$4' color='$textSecondary'>
                                                    {cartItem.description}
                                                </Text>
                                            )}
                                            <YStack>
                                                {cartItem.variants.map((variant) => (
                                                    <XStack key={variant.id} alignItems='center' space='$2'>
                                                        <Text flex={1} fontSize='$3' color='$textSecondary' numberOfLines={1}>
                                                            {variant.name}
                                                        </Text>
                                                    </XStack>
                                                ))}
                                                {cartItem.addons.map((addon) => (
                                                    <XStack key={addon.id} alignItems='center' space='$2'>
                                                        <Text flex={1} fontSize='$3' color='$textSecondary' numberOfLines={1}>
                                                            {addon.name}
                                                        </Text>
                                                    </XStack>
                                                ))}
                                            </YStack>
                                        </YStack>
                                    </XStack>
                                </Pressable>
                            </XStack>
                            <YStack space='$1' justifyContent='center'>
                                <Button size='$2' onPress={() => handleCartItemActions(cartItem)} alignItems='center' justifyContent='center' bg='$gray-200' circular>
                                    <Button.Icon>
                                        <FontAwesomeIcon icon={faEllipsis} color={theme['gray-600'].val} />
                                    </Button.Icon>
                                </Button>
                            </YStack>
                        </XStack>
                    );
                }}
                ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
            />
        </YStack>
    );
};

export default CartContents;
