import React, { useState, useCallback } from 'react';
import { Dimensions, Pressable } from 'react-native';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import { Spinner, Card, Text, YStack, XStack, H2, Paragraph, Button, Image, useTheme } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { toast } from '../utils/toast';
import { formatCurrency } from '../utils/format';
import { productHasOptions } from '../utils/product';
import { storefrontConfig } from '../utils';
import { usePromiseWithLoading } from '../hooks/use-promise-with-loading';
import QuantityButton from './QuantityButton';
import ImageSlider from './ImageSlider';
import useCart from '../hooks/use-cart';
import { useLanguage } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

const ProductCard = ({
    product,
    onPress,
    onAddToCart,
    style = {},
    favoriteIcon,
    wrapperStyle = {},
    cardContainerStyle = {},
    cardHeaderStyle = {},
    cardFooterStyle = {},
    carouselStyle = {},
    buttonStyle = {},
    quantityButtonStyle = {},
    sliderHeight = 175,
    storeLocationId,
    width = null,
    additionalNavigationParams = {},
}) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { t } = useLanguage();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const [cardWidth, setCardWidth] = useState(width);
    const [cart, updateCart] = useCart();
    const [quantity, setQuantity] = useState(1);
    const productCardStyle = storefrontConfig('productCardStyle', 'bordered');
    let cardBorderWidth = 1;
    let cardBorderColor = '$borderColorWithShadow';
    let cardFooterBg = '$background';
    let cardFooterPx = '$2';
    let cardFooterPy = '$2';
    let cardFooterBorderRadius = 12;
    let additionalSliderStyles = {};

    if (productCardStyle === 'outlined') {
        cardBorderWidth = 6;
        cardFooterPx = 0;
        cardBorderColor = '$surface';
        cardFooterBg = '$surface';
        cardFooterBorderRadius = 0;
    }

    if (productCardStyle === 'visio') {
        cardBorderWidth = 0;
        cardFooterPx = 0;
        additionalSliderStyles = {
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
        };
    }

    const handlePress = () => {
        if (isLoading('addToCart')) {
            return;
        }

        navigation.navigate('Product', { product: product.serialize(), quantity, ...additionalNavigationParams });
    };

    const handleAddToCart = async () => {
        if (isLoading('addToCart')) {
            return;
        }

        if (productHasOptions(product)) {
            return navigation.navigate('Product', { product: product.serialize(), quantity, storeLocationId, ...additionalNavigationParams });
        }

        try {
            const updatedCart = await runWithLoading(cart.add(product.id, quantity, { store_location: storeLocationId }), 'addToCart');
            updateCart(updatedCart);
            setQuantity(1);
            toast.success(t('ProductCard.productAddedToCart', { productName: product.getAttribute('name') }));
        } catch (error) {
            console.error('Error Adding to Cart', error.message);
        }
    };

    const handleSetCardWidth = useCallback(
        ({
            nativeEvent: {
                layout: { width },
            },
        }) => {
            if (cardWidth === null) {
                setCardWidth((prevWidth) => (prevWidth !== width ? width : prevWidth));
            }
        },
        [setCardWidth]
    );

    return (
        <YStack style={[wrapperStyle, { width }]} width={width}>
            <Pressable onPress={handlePress} style={[style]} disabled={isLoading('addToCart')} onLayout={handleSetCardWidth}>
                <Card style={[cardContainerStyle]} bordered borderWidth={cardBorderWidth} borderColor={cardBorderColor} borderRadius={12}>
                    <Card.Header style={[cardHeaderStyle]} padding={0}>
                        <YStack position='relative'>
                            <ImageSlider
                                images={product.getAttribute('images')}
                                sliderWidth={cardWidth}
                                sliderHeight={sliderHeight}
                                sliderStyle={{ borderTopRightRadius: 8, borderTopLeftRadius: 8, ...additionalSliderStyles }}
                                onImagePress={handlePress}
                                autoplay
                            />
                            <XStack position='absolute' top='$2' right='$2' zIndex={10} alignItems='center' justifyContent='flex-end' space='$2'></XStack>
                        </YStack>
                    </Card.Header>
                    <Card.Footer style={[cardFooterStyle]} bg={cardFooterBg} borderRadius={cardFooterBorderRadius} overflow='hidden'>
                        <YStack flex={1} space='$2' px={cardFooterPx} py={cardFooterPy}>
                            <YStack minHeight={90}>
                                <YStack>
                                    <Text color='$color' fontWeight='bold' fontSize='$7' numberOfLines={1}>
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
                            <YStack minHeight={90} space='$2'>
                                <QuantityButton style={quantityButtonStyle} onChange={setQuantity} wrapperProps={{ minHeight: 35, width: '100%', flex: 1 }} />
                                <Button
                                    animation='bouncy'
                                    onPress={handleAddToCart}
                                    size='$4'
                                    style={buttonStyle}
                                    alignSelf='center'
                                    borderRadius='$4'
                                    borderWidth={1}
                                    bg='$primary'
                                    borderColor='$primaryBorder'
                                    color='white'
                                    width='100%'
                                    hoverStyle={{
                                        scale: 0.95,
                                        opacity: 0.5,
                                    }}
                                    pressStyle={{
                                        scale: 0.95,
                                        opacity: 0.5,
                                    }}
                                >
                                    {isLoading('addToCart') && (
                                        <Button.Icon>
                                            <Spinner />
                                        </Button.Icon>
                                    )}

                                    <Button.Text color='$primaryText' fontSize='$6' fontWeight='$5'>
                                        {t('ProductCard.addToCart')}
                                    </Button.Text>
                                </Button>
                            </YStack>
                        </YStack>
                    </Card.Footer>
                </Card>
            </Pressable>
        </YStack>
    );
};

export default ProductCard;
