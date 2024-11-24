import React, { useState, useCallback } from 'react';
import { Dimensions, TouchableOpacity } from 'react-native';
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

const ProductCard = ({
    product,
    onPress,
    onAddToCart,
    style = {},
    wrapperStyle = {},
    headerStyle = {},
    headerProps = {},
    footerStyle = {},
    footerProps = {},
    favoriteIcon,
    carouselStyle = {},
    buttonStyle = {},
    quantityButtonStyle = {},
    sliderHeight = 175,
}) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const [cardWidth, setCardWidth] = useState(0);
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
            console.log('Error Adding to Cart', error.message);
        }
    };

    return (
        <YStack wrapperStyle={wrapperStyle}>
            <TouchableOpacity
                onPress={handlePress}
                style={style}
                disabled={isLoading('addToCart')}
                onLayout={({
                    nativeEvent: {
                        layout: { width },
                    },
                }) => {
                    setCardWidth((prevWidth) => (prevWidth !== width ? width : prevWidth));
                }}
            >
                <Card bordered>
                    <Card.Header style={[{ paddingHorizontal: 0, paddingVertical: 0 }, headerStyle]} padding={0} {...headerProps}>
                        <YStack position='relative'>
                            <ImageSlider
                                images={product.getAttribute('images')}
                                sliderWidth={cardWidth}
                                sliderHeight={sliderHeight}
                                sliderStyle={{ borderTopRightRadius: 10, borderTopLeftRadius: 10 }}
                                autoplay
                            />
                            <XStack position='absolute' top='$2' right='$2' zIndex={10} alignItems='center' justifyContent='flex-end' space='$2'></XStack>
                        </YStack>
                    </Card.Header>
                    <Card.Footer style={footerStyle} {...footerProps}>
                        <YStack space='$2' padding='$2'>
                            <YStack minHeight={90}>
                                <YStack>
                                    <Text color='$color' fontWeight='$9' fontSize='$7' numberOfLines={1}>
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
                                            <Text fontSize='$6' color='$success' fontWeight='bold'>
                                                {formatCurrency(product.getAttribute('sale_price'), product.getAttribute('currency'))}
                                            </Text>
                                            <Text fontSize='$5' color='$secondary' textDecorationLine='line-through'>
                                                {formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}
                                            </Text>
                                        </YStack>
                                    ) : (
                                        <Text fontSize='$5' fontColor='$success' fontWeight='bold'>
                                            {formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}
                                        </Text>
                                    )}
                                </YStack>
                            </YStack>
                            <QuantityButton style={quantityButtonStyle} onChange={setQuantity} wrapperProps={{ minHeight: 35, width: '100%', flex: 1 }} />
                            <XStack>
                                <Button
                                    animation='bouncy'
                                    onPress={handleAddToCart}
                                    size='$4'
                                    style={buttonStyle}
                                    alignSelf='center'
                                    borderRadius='$4'
                                    bg='$primary'
                                    color='white'
                                    width='100%'
                                    hoverStyle={{
                                        scale: 0.75,
                                        opacity: 0.5,
                                    }}
                                    pressStyle={{
                                        scale: 0.75,
                                        opacity: 0.5,
                                    }}
                                >
                                    {isLoading('addToCart') && (
                                        <Button.Icon>
                                            <Spinner />
                                        </Button.Icon>
                                    )}

                                    <Button.Text fontSize='$6' fontWeight='$5'>
                                        Add to Cart
                                    </Button.Text>
                                </Button>
                            </XStack>
                        </YStack>
                    </Card.Footer>
                </Card>
            </TouchableOpacity>
        </YStack>
    );
};

export default ProductCard;
