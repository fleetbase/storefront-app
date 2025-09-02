import React, { useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, SafeAreaView, Pressable, StyleSheet, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Separator, Spinner, View, Image, Text, YStack, XStack, Button, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons';
import { toast } from '../utils/toast';
import { formatCurrency } from '../utils/format';
import { delay, loadPersistedResource, storefrontConfig } from '../utils';
import { calculateCartTotal } from '../utils/cart';
import { useLanguage } from '../contexts/LanguageContext';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import FastImage from 'react-native-fast-image';
import useCart from '../hooks/use-cart';
import usePromiseWithLoading from '../hooks/use-promise-with-loading';
import StorefrontConfig from '../../storefront.config';
import Spacer from '../components/Spacer';

const isAndroid = Platform.OS === 'android';
if (isAndroid && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CartScreen = ({ route }) => {
    const routeName = route.name;
    const theme = useTheme();
    const navigation = useNavigation();
    const tabBarHeight = useBottomTabBarHeight();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { runWithLoading, isLoading, isAnyLoading } = usePromiseWithLoading();
    const [cart, updateCart] = useCart();
    const [displayedItems, setDisplayedItems] = useState(cart ? cart.contents() : []);
    const rowRefs = useRef({});
    const isModalScreen = Platform.OS === 'ios' && typeof routeName === 'string' && routeName.endsWith('Modal');

    const handleCheckout = () => {
        const params = {};
        if (storefrontConfig('paymentGateway') === 'stripe') {
            return navigation.navigate('StripeCheckout', params);
        }

        if (storefrontConfig('paymentGateway') === 'qpay') {
            return navigation.navigate('QPayCheckout', params);
        }

        if (storefrontConfig('paymentGateway') === 'paypal') {
            return navigation.navigate('PaypalCheckout', params);
        }
    };

    const handleEdit = async (cartItem) => {
        const product = await loadPersistedResource((storefront) => storefront.products.findRecord(cartItem.product_id), { type: 'product', persistKey: `${cartItem.product_id}_product` });
        if (product) {
            navigation.navigate('CartItem', { cartItem, product: product.serialize() });
        }
    };

    const handleDelete = async (cartItem) => {
        const rowRef = rowRefs.current[cartItem.id];

        if (!rowRef) {
            toast.error(t('CartScreen.couldNotFindItemToDelete'));
            return;
        }

        try {
            await new Promise((resolve) => {
                Animated.parallel([
                    Animated.timing(rowRef.opacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rowRef.translateX, {
                        toValue: -100,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start(resolve);
            });

            // Remove item visually
            setDisplayedItems((prevItems) => prevItems.filter((item) => item.id !== cartItem.id));
            toast.success(t('CartScreen.itemRemovedFromCart', { cartItemName: cartItem.name }));

            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

            const updatedCart = await runWithLoading(cart.remove(cartItem.id), `removeCartItem_${cartItem.id}`);
            updateCart(updatedCart);
        } catch (error) {
            toast.error(t('CartScreen.failedToRemoveItemFromCart'));
            console.error('Error removing cart item:', error.message);
        }
    };

    const handleEmpty = async () => {
        const cartItems = cart.contents();

        if (!cartItems.length) {
            toast.error(t('CartScreen.cartIsAlreadyEmpty'));
            return;
        }

        try {
            const animations = cartItems.map((cartItem) => {
                const rowRef = rowRefs.current[cartItem.id];

                if (rowRef) {
                    return new Promise((resolve) => {
                        Animated.parallel([
                            Animated.timing(rowRef.opacity, {
                                toValue: 0,
                                duration: 300,
                                useNativeDriver: true,
                            }),
                            Animated.timing(rowRef.translateX, {
                                toValue: -100,
                                duration: 300,
                                useNativeDriver: true,
                            }),
                        ]).start(resolve);
                    });
                }

                return Promise.resolve();
            });

            await Promise.all(animations);
            toast.success(t('CartScreen.cartEmptied'));

            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

            const emptiedCart = await runWithLoading(cart.empty(), 'emptyCart');
            updateCart(emptiedCart);
        } catch (error) {
            toast.error(t('CartScreen.failedToEmptyCart'));
            console.error('Error emptying cart:', error.message);
        }
    };

    // Make sure cart items is latest
    useEffect(() => {
        setDisplayedItems(cart ? cart.contents() : []);
    }, [cart]);

    const renderRightActions = (cartItem) => (
        <XStack height='100%' width={200} minHeight={100} maxHeight={125}>
            <Pressable style={{ flex: 1 }} onPress={() => handleEdit(cartItem)}>
                <YStack flex={1} width='100%' height='100%' bg='$warning' justifyContent='center' alignItems='center' borderRadius={0}>
                    <FontAwesomeIcon icon={faPencilAlt} size={20} color={theme['$warningText'].val} />
                </YStack>
            </Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => handleDelete(cartItem)}>
                <YStack flex={1} width='100%' height='100%' bg='$error' justifyContent='center' alignItems='center' borderRadius={0}>
                    {isLoading(`removeCartItem_${cartItem.id}`) ? (
                        <Spinner size={40} color={theme['$errorText'].val} />
                    ) : (
                        <FontAwesomeIcon icon={faTrash} size={20} color={theme['$errorText'].val} />
                    )}
                </YStack>
            </Pressable>
        </XStack>
    );

    const renderItem = ({ item: cartItem }) => {
        const opacity = new Animated.Value(1);
        const translateX = new Animated.Value(0);
        rowRefs.current[cartItem.id] = { opacity, translateX };

        return (
            <Animated.View
                style={[
                    {
                        borderBottomWidth: 1,
                        borderColor: theme.borderColor.val,
                        backgroundColor: theme.background.val,
                        opacity,
                        transform: [{ translateX }],
                    },
                ]}
            >
                <Swipeable renderRightActions={() => renderRightActions(cartItem)}>
                    <YStack flex={1} bg='$background' padding='$4' height={125} minHeight={100} maxHeight={350}>
                        <XStack space='$3' justifyContent='space-between'>
                            <XStack flex={1}>
                                <Pressable onPress={() => handleEdit(cartItem)} style={{ flex: 1 }}>
                                    <XStack flex={1} space='$3' height='100%'>
                                        <YStack>
                                            <XStack width={40} height={40} borderWidth={1} borderColor='$borderColor' borderRadius='$3' alignItems='center' justifyContent='center'>
                                                <XStack alignItems='flex-end'>
                                                    <Text fontSize='$1' color='$textPrimary'>
                                                        x
                                                    </Text>
                                                    <Text fontSize='$5' fontWeight='bold' color='$textPrimary'>
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
                                        <YStack height={125} minHeight={100} maxHeight={350} overflow='hidden' width='90%' space='$1'>
                                            <YStack>
                                                <XStack space='$2' alignItems='center'>
                                                    <Text fontSize='$4' fontWeight='bold' color='$textPrimary' numberOfLines={1}>
                                                        {cartItem.name}
                                                    </Text>
                                                </XStack>
                                                {cartItem.description && (
                                                    <Text fontSize='$3' color='$textSecondary' numberOfLines={2}>
                                                        {cartItem.description}
                                                    </Text>
                                                )}
                                            </YStack>
                                            <YStack>
                                                {cartItem.variants.filter(Boolean).map((variant, index) => (
                                                    <XStack key={index} space='$2'>
                                                        <Text flex={1} fontSize='$3' color='$textSecondary' numberOfLines={1}>
                                                            {variant.name}
                                                        </Text>
                                                    </XStack>
                                                ))}
                                                {cartItem.addons.filter(Boolean).map((addon, index) => (
                                                    <XStack key={index} space='$2'>
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
                            <YStack width={150} alignItems='flex-end'>
                                <YStack>
                                    <Text fontSize='$4' color='$textPrimary' fontWeight='bold'>
                                        {formatCurrency(cartItem.subtotal, cart.getAttribute('currency'))}
                                    </Text>
                                </YStack>
                            </YStack>
                        </XStack>
                    </YStack>
                </Swipeable>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.val }}>
            <XStack justifyContent='space-between' alignItems='center' padding='$5'>
                <XStack alignItems='center'>
                    <Text fontSize='$7' fontWeight='bold'>
                        {t('CartScreen.orderItems', { count: displayedItems.length })}
                    </Text>
                    {isAnyLoading() && (
                        <YStack ml='$2'>
                            <Spinner color='$primary' />
                        </YStack>
                    )}
                </XStack>
                <YStack>
                    <Pressable onPress={handleEmpty}>
                        <Text color='$errorBorder' fontSize='$4'>
                            {t('CartScreen.emptyCart')}
                        </Text>
                    </Pressable>
                </YStack>
            </XStack>
            <Animated.FlatList
                data={displayedItems}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <Separator borderBottomWidth={1} borderColor='$borderColorWithShadow' />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 16 }}
            />
            {cart.isNotEmpty && (
                <YStack
                    position='absolute'
                    bg='$background'
                    bottom={isModalScreen ? 0 : tabBarHeight}
                    paddingBottom={isModalScreen ? insets.bottom : tabBarHeight}
                    borderTopWidth={1}
                    borderColor='$borderColorWithShadow'
                    width='100%'
                    padding='$4'
                    shadowColor='$shadowColor'
                    shadowOffset={{ width: 0, height: 1 }}
                    shadowOpacity={0.15}
                    shadowRadius={3}
                >
                    <XStack alignItems='center' justifyContent='space-between'>
                        <YStack flex={1} space={isAndroid ? 0 : '$1'}>
                            <Text color='$textSecondary' fontSize='$2' fontWeight='bold' textTransform='uppercase'>
                                {t('lineItems.subtotal')}
                            </Text>
                            <Text color='$textPrimary' fontSize='$9' fontWeight='bold'>
                                {formatCurrency(calculateCartTotal(), cart.getAttribute('currency'))}
                            </Text>
                        </YStack>
                        <YStack>
                            <Button onPress={handleCheckout} bg='$success' borderColor='$successBorder' borderWidth={1} width={180} paddingVertical='$2' rounded='true'>
                                <Button.Text fontSize='$6' fontWeight='bold' color='$successText'>
                                    {t('CartScreen.checkout')}
                                </Button.Text>
                            </Button>
                        </YStack>
                    </XStack>
                    <Spacer height={isModalScreen ? 20 : 0} />
                </YStack>
            )}
        </SafeAreaView>
    );
};

export default CartScreen;
