import React, { useEffect, useState } from 'react';
import { ScrollView, Platform } from 'react-native';
import { Spinner, Image, Text, View, YStack, XStack, Button, Paragraph, Label, RadioGroup, Checkbox, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faAsterisk, faCheck, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { restoreSdkInstance, isEmpty } from '../utils';
import { formatCurrency } from '../utils/format';
import { calculateProductSubtotal, getCartItem } from '../utils/cart';
import { toast } from '../utils/toast';
import { isProductReadyForCheckout, getSelectedVariants, getSelectedAddons, getAddonSelectionsFromCartItem, getVariantSelectionsFromCartItem } from '../utils/product';
import { useLanguage } from '../contexts/LanguageContext';
import QuantityButton from '../components/QuantityButton';
import ProductOptionsForm from '../components/ProductOptionsForm';
import LinearGradient from 'react-native-linear-gradient';
import useCart from '../hooks/use-cart';
import usePromiseWithLoading from '../hooks/use-promise-with-loading';
import FastImage from 'react-native-fast-image';

const CartItemScreen = ({ route = {} }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const params = route.params ?? {};
    const { runWithLoading, isLoading } = usePromiseWithLoading();
    const { t } = useLanguage();
    const [cart, updateCart] = useCart();
    const [cartItem, setCartItem] = useState(route.params.cartItem);
    const [product, setProduct] = useState(restoreSdkInstance(route.params.product, 'product'));
    const [selectedAddons, setSelectedAddons] = useState(getAddonSelectionsFromCartItem(cartItem, product));
    const [selectedVariants, setSelectedVariants] = useState(getVariantSelectionsFromCartItem(cartItem, product));
    const [subtotal, setSubtotal] = useState(0);
    const [quantity, setQuantity] = useState(cartItem.quantity ?? 1);
    const [ready, setReady] = useState(false);
    const isService = product && product.getAttribute('is_service') === true;
    const hasOptions = product.variants().length > 0 && product.addons().length > 0;

    useEffect(() => {
        if (product) {
            setSubtotal(calculateProductSubtotal(product, selectedVariants, selectedAddons));
            setReady(isProductReadyForCheckout(product, selectedVariants));
        }
    }, [product, selectedAddons, selectedVariants]);

    useEffect(() => {
        if (product) {
            if (isEmpty(selectedVariants)) {
                setSelectedVariants(getVariantSelectionsFromCartItem(cartItem, product));
            }

            if (isEmpty(selectedAddons)) {
                setSelectedAddons(getAddonSelectionsFromCartItem(cartItem, product));
            }

            setReady(isProductReadyForCheckout(product, selectedVariants));
        }
    }, [product, cartItem]);

    const handleClose = () => {
        navigation.goBack();
    };

    const handleRemoveFromCart = async () => {
        try {
            const updatedCart = await runWithLoading(cart.remove(cartItem.id), 'removeCartItem');
            updateCart(updatedCart);
            toast.success(t('CartItemScreen.productRemovedFromCart', { productName: product.getAttribute('name') }));
            navigation.goBack();
        } catch (error) {
            toast.error(t('CartItemScreen.failedToRemoveFromCart'));
            console.error('Error removing cart item:', error.message);
        }
    };

    const handleAddToCart = async () => {
        if (!isProductReadyForCheckout(product, selectedVariants)) {
            console.log('Product is not ready for checkout');
            return;
        }

        // @TODO need to handle cases when item is already in cart/ we restore and update that existing cart item
        const addons = getSelectedAddons(selectedAddons);
        const variants = getSelectedVariants(selectedVariants);

        try {
            const updatedCart = await runWithLoading(cart.update(cartItem.id, quantity, { addons, variants }), 'updateCart');
            updateCart(updatedCart);
            toast.success(t('CartItemScreen.productUpdatedInCart', { productName: product.getAttribute('name') }));
            navigation.goBack();
        } catch (error) {
            console.warn('Error Adding to Cart', error.message);
        }
    };

    return (
        <ScreenWrapper isModal useSafeArea={false}>
            <YStack position='relative' height={200} width='100%' overflow='hidden'>
                <FastImage
                    source={{ uri: cartItem.product_image_url }}
                    style={{
                        height: '100%',
                        width: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                    }}
                />
                <XStack justifyContent='flex-end' alignItems='center' position='absolute' top={0} left={0} right={0} padding='$4' zIndex={1}>
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
            <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                <YStack space='$3'>
                    <YStack borderBottomWidth={hasOptions ? 1 : 0} borderColor='$borderColor' paddingVertical='$4'>
                        <XStack space='$2' paddingHorizontal='$4' mb='$1'>
                            <Text fontSize='$9' fontWeight='bold' color='$color'>
                                {product.getAttribute('name')}
                            </Text>
                            {isService && (
                                <Text fontSize='$5' color='white' opacity={0.8}>
                                    {t('common.service')}
                                </Text>
                            )}
                        </XStack>
                        <XStack paddingHorizontal='$4' alignItems='center' justifyContent='space-between'>
                            <Text fontSize='$6' fontWeight='bold' color='$green8'>
                                {formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}
                            </Text>
                        </XStack>
                        {product.isAttributeFilled('description') && (
                            <XStack paddingHorizontal='$4' alignItems='center' justifyContent='space-between'>
                                <Paragraph fontSize='$6' color='$color'>
                                    {product.getAttribute('description')}
                                </Paragraph>
                            </XStack>
                        )}
                    </YStack>
                    <ProductOptionsForm
                        product={product}
                        defaultSelectedAddons={selectedAddons}
                        defaultSelectedVariants={selectedVariants}
                        onAddonsChanged={setSelectedAddons}
                        onVariationsChanged={setSelectedVariants}
                        wrapperProps={{ space: '$4' }}
                    />
                </YStack>
            </ScrollView>
            <XStack position='absolute' px='$4' py='$3' bottom={0} left={0} right={0} alignItems='center' justifyContent='space-between' space='$2'>
                <XStack width='35%'>
                    <QuantityButton buttonSize='$3' quantity={quantity} onChange={setQuantity} disabled={isLoading('addToCart') || isLoading('removeCartItem')} />
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
                        disabled={!ready || isLoading('addToCart') || isLoading('removeCartItem')}
                        opacity={ready ? 1 : 0.5}
                    >
                        {isLoading('updateCart') && (
                            <Button.Icon>
                                <Spinner />
                            </Button.Icon>
                        )}
                        <Button.Text fontSize='$4' fontWeight='normal'>
                            {t('common.update')}
                        </Button.Text>
                        <Button.Text fontSize='$5' fontWeight='bold'>
                            {formatCurrency(subtotal * quantity, product.getAttribute('currency'))}
                        </Button.Text>
                    </Button>
                </XStack>
                <XStack width='12%'>
                    <Button
                        onPress={handleRemoveFromCart}
                        bg='$error'
                        color='white'
                        width='100%'
                        size='$4'
                        alignSelf='center'
                        alignItems='center'
                        justifyContent='center'
                        disabled={isLoading('addToCart') || isLoading('removeCartItem')}
                        rounded='true'
                    >
                        <Button.Icon>{isLoading('removeCartItem') ? <Spinner size='$4' color='white' /> : <FontAwesomeIcon icon={faTrash} color='white' size={15} />}</Button.Icon>
                    </Button>
                </XStack>
            </XStack>
        </ScreenWrapper>
    );
};

export default CartItemScreen;
