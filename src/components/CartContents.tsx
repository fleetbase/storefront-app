import React, { useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FlatList, Pressable } from 'react-native';
import { Button, Image, Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/format';
import { loadPersistedResource, showActionSheet } from '../utils';
import { toast } from '../utils/toast';
import FastImage from 'react-native-fast-image';
import useCart from '../hooks/use-cart';
import { useLanguage } from '../contexts/LanguageContext';

const CartContents = ({}) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { t } = useLanguage();
    const [cart, updateCart] = useCart();

    const handleCartItemActions = (cartItem) => {
        showActionSheet({
            options: [t('CartContents.updateItem'), t('CartContents.removeFromCart'), t('common.cancel')],
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
            navigation.navigate('CartItem', { cartItem, product: product.serialize(), isModal: true });
        }
    };

    const handleDelete = async (cartItem) => {
        try {
            const updatedCart = await cart.remove(cartItem.id);
            updateCart(updatedCart);
            toast.success(t('CartContents.removedFromCart', { cartItemName: cartItem.name }));
        } catch (error) {
            toast.error(t('CartContents.failedToRemove'));
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
                                        <YStack>
                                            <XStack
                                                width={40}
                                                height={40}
                                                borderWidth={1}
                                                bg='$background'
                                                borderColor='$borderColorWithShadow'
                                                borderRadius='$3'
                                                alignItems='center'
                                                justifyContent='center'
                                            >
                                                <XStack alignItems='flex-end'>
                                                    <Text fontSize='$1' color='$primary'>
                                                        x
                                                    </Text>
                                                    <Text fontSize='$5' fontWeight='bold' color='$primary'>
                                                        {cartItem.quantity}
                                                    </Text>
                                                </XStack>
                                            </XStack>
                                        </YStack>
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
                                            <FastImage
                                                source={{ uri: cartItem.product_image_url }}
                                                style={{
                                                    height: '100%',
                                                    width: '100%',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    borderRadius: 5,
                                                }}
                                            />
                                        </YStack>
                                        <YStack flex={1}>
                                            <Text fontSize='$5' fontWeight='bold' color='$textPrimary' mb='$1' numberOfLines={1}>
                                                {cartItem.name}
                                            </Text>
                                            <XStack space='$1'>
                                                <Text numberOfLines={1} fontSize='$4' fontWeight='bold' color='$textSecondary'>
                                                    {formatCurrency(cartItem.subtotal, cart.getAttribute('currency'))}
                                                </Text>
                                            </XStack>
                                            {cartItem.description && (
                                                <Text fontSize='$4' color='$textSecondary' numberOfLines={2}>
                                                    {cartItem.description}
                                                </Text>
                                            )}
                                            <YStack>
                                                {cartItem.variants.filter(Boolean).map((variant, i) => (
                                                    <XStack key={i} alignItems='center' space='$2'>
                                                        <Text flex={1} fontSize='$3' color='$textSecondary' numberOfLines={1}>
                                                            {variant.name}
                                                        </Text>
                                                    </XStack>
                                                ))}
                                                {cartItem.addons.filter(Boolean).map((addon, i) => (
                                                    <XStack key={i} alignItems='center' space='$2'>
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
                                <Button size='$2' onPress={() => handleCartItemActions(cartItem)} alignItems='center' justifyContent='center' bg='$background' circular>
                                    <Button.Icon>
                                        <FontAwesomeIcon icon={faEllipsis} color={theme['$textSecondary'].val} />
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
