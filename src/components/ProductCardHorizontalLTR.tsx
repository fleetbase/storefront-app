import React, { useState, useCallback } from 'react';
import { Dimensions, Pressable } from 'react-native';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import { Spinner, Card, Text, YStack, XStack, H2, Paragraph, Button, Image, useTheme } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { formatCurrency } from '../utils/format';
import { productHasOptions } from '../utils/product';
import { usePromiseWithLoading } from '../hooks/use-promise-with-loading';
import QuantityButton from './QuantityButton';
import ImageSlider from './ImageSlider';
import useCart from '../hooks/use-cart';

const { width } = Dimensions.get('window');

const ProductCardHorizontalLTR = ({ product, onPress, onAddToCart, style = {}, favoriteIcon, carouselStyle = {}, buttonStyle = {}, quantityButtonStyle = {} }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const [cart, updateCart] = useCart();
    const [quantity, setQuantity] = useState(1);

    const handlePress = () => {
        if (isLoading('addToCart')) {
            return;
        }

        navigation.navigate('Product', { product: product.serialize(), quantity });
    };

    const handleAddToCart = async () => {
        if (isLoading('addToCart')) {
            return;
        }

        if (productHasOptions(product)) {
            return navigation.navigate('Product', { product: product.serialize(), quantity });
        }

        try {
            const updatedCart = await runWithLoading(cart.add(product.id, quantity), 'addToCart');
            updateCart(updatedCart);
            setQuantity(1);
            toast.success(`${product.getAttribute('name')} added to cart.`, { position: ToastPosition.BOTTOM });
        } catch (error) {
            console.error('Error Adding to Cart', error.message);
        }
    };

    return (
        <YStack borderBottomWidth={1} borderColor='$borderColorWithShadow'>
            <Pressable onPress={handlePress} style={[style, { width: '100%' }]} disabled={isLoading('addToCart')}>
                <XStack width='100%' borderRadius='$5' overflow='hidden' px='$3' py='$3'>
                    <YStack flex={1} width='100%'>
                        <YStack space='$2' pr='$1'>
                            <YStack>
                                <YStack>
                                    <Text color='$color' fontWeight='bold' fontSize='$7' mb='$2' numberOfLines={1}>
                                        {product.getAttribute('name')}
                                    </Text>
                                    {product.isAttributeFilled('description') && (
                                        <Text numberOfLines={2} color='$color' fontSize='$4'>
                                            {product.getAttribute('description')}
                                        </Text>
                                    )}
                                </YStack>
                                <YStack mt='$2'>
                                    {product.getAttribute('on_sale') ? (
                                        <YStack>
                                            <Text fontSize='$6' color='$green-600' fontWeight='bold'>
                                                {formatCurrency(product.getAttribute('sale_price'), product.getAttribute('currency'))}
                                            </Text>
                                            <Text fontSize='$5' color='$secondary' textDecorationLine='line-through'>
                                                {formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}
                                            </Text>
                                        </YStack>
                                    ) : (
                                        <Text fontSize='$5' color='$green-600' fontWeight='bold'>
                                            {formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}
                                        </Text>
                                    )}
                                </YStack>
                            </YStack>
                        </YStack>
                    </YStack>
                    <YStack padding={0}>
                        <YStack position='relative'>
                            <ImageSlider
                                images={product.getAttribute('images')}
                                sliderWidth={110}
                                sliderHeight={110}
                                sliderStyle={{ borderRadius: 10 }}
                                onImagePress={handlePress}
                                autoplay
                            />
                            <XStack position='absolute' top='$2' right='$2' zIndex={10} alignItems='center' justifyContent='flex-end' space='$2'></XStack>
                        </YStack>
                    </YStack>
                </XStack>
            </Pressable>
        </YStack>
    );
};

export default ProductCardHorizontalLTR;
