import React, { useState } from 'react';
import { Dimensions, TouchableOpacity } from 'react-native';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import { Card, Text, YStack, XStack, H2, Paragraph, Button, Image, useTheme } from 'tamagui';
import { formatCurrency } from '../utils/format';
import QuantityButton from './QuantityButton';
import ImageSlider from './ImageSlider';
import useCart from '../hooks/use-cart';

const { width } = Dimensions.get('window');

const ProductCard = ({
    product,
    onPress,
    onAddToCart,
    style = {},
    headerStyle = {},
    headerProps = {},
    footerStyle = {},
    footerProps = {},
    favoriteIcon,
    carouselStyle = {},
    buttonStyle = {},
    quantityButtonStyle = {},
}) => {
    const theme = useTheme();
    const [cardWidth, setCardWidth] = useState(0);
    const [cart, updateCart] = useCart();
    const [quantity, setQuantity] = useState(1);

    const handlePress = () => {
        if (typeof onPress === 'function') {
            onPress(product);
        }
    };

    const handleAddToCart = async () => {
        if (typeof onAddToCart === 'function') {
            onAddToCart(product);
        }

        try {
            const updatedCart = await cart.add(product.id, quantity, { addons: [], variants: [] });
            updateCart(updatedCart);
            console.log(`Product ${product.name} added to cart!`);
        } catch (error) {
            console.log('Cart Error: ' + error.message);
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={style}
            onLayout={({
                nativeEvent: {
                    layout: { width },
                },
            }) => {
                setCardWidth(width);
            }}
        >
            <Card bordered>
                <Card.Header style={[{ paddingHorizontal: 0, paddingVertical: 0 }, headerStyle]} padding={0} {...headerProps}>
                    <YStack position='relative'>
                        <ImageSlider
                            images={product.getAttribute('images')}
                            sliderWidth={cardWidth}
                            sliderHeight={175}
                            sliderStyle={{ borderTopRightRadius: 10, borderTopLeftRadius: 10 }}
                            autoplay
                        />
                        <XStack position='absolute' top='$2' right='$2' zIndex={10} alignItems='center' justifyContent='flex-end' space='$2'>
                            {/* {favoriteIcon} */}
                        </XStack>
                    </YStack>
                </Card.Header>

                <Card.Footer style={footerStyle} {...footerProps}>
                    <YStack space='$2' padding='$2'>
                        <YStack>
                            <Text color='$color' fontWeight='$9' fontSize='$7' numberOfLines={1}>
                                {product.getAttribute('name')}
                            </Text>
                            {product.isAttributeFilled('description') && (
                                <Text numberOfLines={2} color='$secondary' fontSize='$4'>
                                    {product.getAttribute('description')}
                                </Text>
                            )}
                        </YStack>

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

                        {/* Quantity Button */}
                        <QuantityButton style={quantityButtonStyle} onChange={(quantity) => console.log('Selected Quantity:', quantity)} />

                        <XStack>
                            <Button onPress={handleAddToCart} size='$4' style={buttonStyle} alignSelf='center' borderRadius='$4' bg='$primary' color='white' width='100%'>
                                <Button.Text fontSize='$6' fontWeight='$5'>
                                    Add to Cart
                                </Button.Text>
                            </Button>
                        </XStack>
                    </YStack>
                </Card.Footer>
            </Card>
        </TouchableOpacity>
    );
};

export default ProductCard;
