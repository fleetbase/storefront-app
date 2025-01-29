import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Spinner, Image, Text, View, YStack, XStack, Button, Paragraph, Label, RadioGroup, Checkbox, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faAsterisk, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { toast, ToastPosition } from '@backpackapp-io/react-native-toast';
import { restoreSdkInstance } from '../utils';
import { formatCurrency } from '../utils/format';
import { calculateProductSubtotal, getCartItem } from '../utils/cart';
import { isProductReadyForCheckout, getSelectedVariants, getSelectedAddons } from '../utils/product';
import QuantityButton from '../components/QuantityButton';
import ProductOptionsForm from '../components/ProductOptionsForm';
import ProductYoutubeVideos from '../components/ProductYoutubeVideos';
import ContainerDimensions from '../components/ContainerDimensions';
import ImageSlider from '../components/ImageSlider';
import LinearGradient from 'react-native-linear-gradient';
import useCart from '../hooks/use-cart';
import usePromiseWithLoading from '../hooks/use-promise-with-loading';
import FastImage from 'react-native-fast-image';

const ProductScreen = ({ route = {} }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const [cart, updateCart] = useCart();
    const product = restoreSdkInstance(route.params.product, 'product');
    const isService = product.getAttribute('is_service') === true;
    const youtubeUrls = product.getAttribute('youtube_urls', []);
    const [selectedAddons, setSelectedAddons] = useState({});
    const [selectedVariants, setSelectedVariants] = useState({});
    const [subtotal, setSubtotal] = useState(calculateProductSubtotal(product, selectedVariants, selectedAddons));
    const [quantity, setQuantity] = useState(route.params.quantity ?? 1);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setSubtotal(calculateProductSubtotal(product, selectedVariants, selectedAddons));
        setReady(isProductReadyForCheckout(product, selectedVariants));
    }, [selectedAddons, selectedVariants]);

    useEffect(() => {
        setReady(isProductReadyForCheckout(product, selectedVariants));
    }, []);

    const handleClose = () => {
        navigation.goBack();
    };

    const handleAddToCart = async () => {
        if (isLoading('addToCart') || !isProductReadyForCheckout(product, selectedVariants)) {
            console.log('Product is not ready for checkout');
            return;
        }

        // @TODO need to handle cases when item is already in cart/ we restore and update that existing cart item
        const addons = getSelectedAddons(selectedAddons);
        const variants = getSelectedVariants(selectedVariants);

        try {
            const updatedCart = await runWithLoading(cart.add(product.id, quantity, { addons, variants }), 'addToCart');
            updateCart(updatedCart);
            toast.success(`${product.getAttribute('name')} added to cart.`, { position: ToastPosition.BOTTOM });
            navigation.goBack();
        } catch (error) {
            console.log('Error Adding to Cart', error.message);
        }
    };

    return (
        <YStack flex={1} bg='$background'>
            <YStack position='relative' height={200} width='100%' overflow='hidden'>
                <ContainerDimensions>
                    {(width, height) => (
                        <ImageSlider
                            images={product.getAttribute('images')}
                            sliderWidth={width}
                            sliderHeight={height}
                            sliderStyle={{ borderTopRightRadius: 8, borderTopLeftRadius: 8 }}
                            autoplay
                        />
                    )}
                </ContainerDimensions>
                <XStack justifyContent='flex-end' alignItems='center' position='absolute' top={0} left={0} right={0} py='$2' px='$2' zIndex={1}>
                    <Button size={35} onPress={handleClose} bg='$secondary' circular>
                        <Button.Icon>
                            <FontAwesomeIcon icon={faTimes} />
                        </Button.Icon>
                    </Button>
                </XStack>
                <LinearGradient
                    colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.2)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        height: '100%',
                        width: '100%',
                    }}
                />
            </YStack>
            <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled' nestedScrollEnabled={true} scrollEventThrottle={16}>
                <YStack space='$3'>
                    <YStack borderBottomWidth={1} borderColor='$borderColor' py='$4'>
                        <XStack space='$2' px='$4' mb='$1'>
                            <Text fontSize='$9' fontWeight='bold' color='$color'>
                                {product.getAttribute('name')}
                            </Text>
                            {isService && (
                                <Text fontSize='$5' color='white' opacity={0.8}>
                                    Service
                                </Text>
                            )}
                        </XStack>
                        <XStack px='$4' alignItems='center' justifyContent='space-between'>
                            <Text fontSize='$6' fontWeight='bold' color='$green8'>
                                {formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}
                            </Text>
                        </XStack>
                        {product.isAttributeFilled('description') && (
                            <XStack mt='$2' px='$4' alignItems='center' justifyContent='space-between'>
                                <Paragraph fontSize='$6' color='$color'>
                                    {product.getAttribute('description')}
                                </Paragraph>
                            </XStack>
                        )}
                    </YStack>
                    {console.log('youtubeUrls.length', youtubeUrls.length, youtubeUrls)}
                    {youtubeUrls.length > 0 && (
                        <YStack borderBottomWidth={1} borderColor='$borderColor' py='$1'>
                            <ProductYoutubeVideos product={product} />
                        </YStack>
                    )}
                    <ProductOptionsForm product={product} onAddonsChanged={setSelectedAddons} onVariationsChanged={setSelectedVariants} />
                </YStack>
            </ScrollView>
            <XStack position='absolute' paddingHorizontal='$4' paddingTop='$2' paddingBottom='$8' bottom={0} left={0} right={0} alignItems='center' justifyContent='space-between' space='$3'>
                <XStack width='38%'>
                    <QuantityButton buttonSize='$3' quantity={quantity} onChange={setQuantity} />
                </XStack>
                <XStack flex={1}>
                    <Button
                        onPress={handleAddToCart}
                        size='$4'
                        alignSelf='center'
                        borderRadius='$4'
                        bg='$primary'
                        color='white'
                        width='100%'
                        alignItems='center'
                        justifyContent='space-between'
                        disabled={!ready || isLoading('addToCart')}
                        opacity={ready ? 1 : 0.5}
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
                        <Button.Text fontSize='$5' fontWeight='normal'>
                            Add to Cart
                        </Button.Text>
                        <Button.Text fontSize='$6' fontWeight='bold'>
                            {formatCurrency(subtotal * quantity, product.getAttribute('currency'))}
                        </Button.Text>
                    </Button>
                </XStack>
            </XStack>
        </YStack>
    );
};

export default ProductScreen;
