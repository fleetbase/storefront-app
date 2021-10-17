import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUniqueId } from 'react-native-device-info';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faAsterisk, faPlus, faMinus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Product, StoreLocation } from '@fleetbase/storefront';
import { useStorefront, useCart } from 'hooks';
import { formatCurrency, isLastIndex, stripIframeTags, logError } from 'utils';
import { useResourceStorage } from 'utils/Storage';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import Checkbox from 'react-native-bouncy-checkbox';
import RadioButton from 'react-native-animated-radio-button';
import RenderHtml from 'react-native-render-html';
import tailwind from 'tailwind';

const { isArray } = Array;
const { emit } = EventRegister;

const ProductScreen = ({ navigation, route }) => {
    const { attributes, cartItemAttributes, store, info } = route.params;
    const storefront = useStorefront();
    const product = new Product(attributes);
    // const images = product.getAttribute('images');
    // const videos = product.getAttribute('videos');
    const fullWidth = Dimensions.get('window').width;
    const fullHeight = Dimensions.get('window').height;
    const scrollViewMinHeight = fullHeight / 2;
    const insets = useSafeAreaInsets();

    // only if store has been passed in
    const [storeLocation, setStoreLocation] = useResourceStorage(store?.id ? `${store.id}_store_location` : 'store_location', StoreLocation, storefront.getAdapter());
    // relevant product state
    const [images, setImages] = useState(product.getAttribute('images'));
    const [activeSlide, setActiveSlide] = useState(0);
    const [subtotal, setSubtotal] = useState(product.isOnSale ? product.getAttribute('sale_price') : product.getAttribute('price'));
    const [selectedVariations, s1e1tSelectedVariations] = useState({});
    const [selectedAddons, setSele114ctedAddons] = useState({});
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [isInCart, setIsInCart] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [cart, setCart] = useCart();
    const [cartItem, setCartItem] = useState(cartItemAttributes);

    const canAddToCart = isValid && !isAddingToCart;
    const cannotAddToCart = !canAddToCart;
    const canDecreaseQuantity = quantity > 1;
    const canIncreaseQuantity = quantity < 99;
    const isNetwork = info?.is_network === true;
    const isMultiCartEnabled = info?.is_network === true && info?.options?.multi_cart_enabled === true;
    const isMultiCartDisabled = !isMultiCartEnabled;

    const checkIfCanAddToCart = () => {
        if (isNetwork && isMultiCartDisabled && cart.isNotEmpty) {
            return cart.contents().every((cartItem) => cartItem.store_id !== store?.id);
        }

        return false;
    };

    const renderImages = ({ item, index }) => {
        return (
            <View key={index} style={tailwind('flex items-center justify-center w-56 h-56')}>
                <Image source={{ uri: item }} style={tailwind('h-56 w-56')} />
            </View>
        );
    };

    const decreaseQuantity = () => {
        if (!canDecreaseQuantity) {
            return;
        }

        setQuantity(quantity - 1);
    };

    const increaseQuantity = () => {
        if (!canIncreaseQuantity) {
            return;
        }

        setQuantity(quantity + 1);
    };

    const selectAddon = (isChecked, addonCategory, addon) => {
        if (isChecked) {
            if (!isArray(selectedAddons[addonCategory.id])) {
                selectedAddons[addonCategory.id] = [];
            }

            selectedAddons[addonCategory.id].push(addon);
        } else {
            if (!isArray(selectedAddons[addonCategory.id])) {
                selectedAddons[addonCategory.id] = [];
            }

            const index = selectedAddons[addonCategory.id].findIndex((selectedAddon) => selectedAddon.id === addon.id);

            if (index !== -1) {
                selectedAddons[addonCategory.id].splice(index, 1);
            }
        }

        setSelectedAddons(selectedAddons);
        validate();
        calculateSubtotal();
    };

    const selectVariation = (variation, variant) => {
        selectedVariations[variation.id] = variant;

        setSelectedVariations(selectedVariations);
        validate();
        calculateSubtotal();
    };

    const isAddonSelected = (addon, addonCategory = null) => {
        if (addonCategory && selectedAddons && selectedAddons[addonCategory.id]) {
            const index = selectedAddons[addonCategory.id].findIndex((selectedAddon) => selectedAddon.id === addon.id);

            return index > -1;
        }

        return cartItem && isArray(cartItem.addons) && cartItem.addons.findIndex((cartItemAddon) => cartItemAddon.id === addon.id) > -1;
    };

    const isVariantSelected = (variant, variation = null) => {
        if (variation && selectedVariations && selectedVariations[variation.id]) {
            return selectedVariations[variation.id].id === variant.id;
        }

        return cartItem && isArray(cartItem.variants) && cartItem.variants.findIndex((cartItemVariant) => cartItemVariant.id === variant.id) > -1;
    };

    const restoreSelections = () => {
        if (cartItem) {
            for (let i = 0; i < product.variants().length; i++) {
                const variation = product.variants()[i];

                // check variation options
                for (let j = 0; j < variation.options.length; j++) {
                    const variant = variation.options[j];

                    if (isVariantSelected(variant)) {
                        selectVariation(variation, variant);
                    }
                }
            }

            for (let i = 0; i < product.addons().length; i++) {
                const addonCategory = product.addons()[i];

                // check addonCategory addons
                for (let j = 0; j < addonCategory.addons.length; j++) {
                    const addon = addonCategory.addons[j];

                    if (isAddonSelected(addon)) {
                        selectAddon(true, addonCategory, addon);
                    }
                }
            }
        }
    };

    const calculateSubtotal = () => {
        let sum = parseInt(product.isOnSale ? product.getAttribute('sale_price') : product.getAttribute('price'));

        // calculate variation additions
        for (let i = 0; i < Object.values(selectedVariations).length; i++) {
            const selectedVariation = Object.values(selectedVariations)[i];

            sum += parseInt(selectedVariation.additional_cost);
        }

        // calculate addons
        for (let addonCategoryId in selectedAddons) {
            for (let i = 0; i < Object.values(selectedAddons[addonCategoryId]).length; i++) {
                const selectedAddon = Object.values(selectedAddons[addonCategoryId])[i];

                sum += parseInt(selectedAddon.is_on_sale ? selectedAddon.sale_price : selectedAddon.price);
            }
        }

        setSubtotal(sum);
        return sum;
    };

    const getAddons = () => {
        const addons = [];

        for (let addonCategoryId in selectedAddons) {
            for (let i = 0; i < Object.values(selectedAddons[addonCategoryId]).length; i++) {
                const selectedAddon = Object.values(selectedAddons[addonCategoryId])[i];

                addons.push(selectedAddon);
            }
        }

        return addons;
    };

    const getVariations = () => {
        const variations = [];

        for (let i = 0; i < Object.values(selectedVariations).length; i++) {
            const selectedVariation = Object.values(selectedVariations)[i];

            variations.push(selectedVariation);
        }

        return variations;
    };

    const getCart = () => {
        return new Promise((resolve) => {
            if (cart) {
                resolve(cart);
            }

            return storefront.cart.retrieve(getUniqueId()).then((cart) => {
                setCart(cart);
                resolve(cart);
            });
        });
    };

    const addToCart = () => {
        setIsAddingToCart(true);

        if (checkIfCanAddToCart()) {
            return Alert.alert('Cart Has Items!', 'Your cart already has items from another store, if you continue your cart will be emptied.', [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => {
                        setIsAddingToCart(false);
                    },
                },
                {
                    text: 'Continue',
                    onPress: () => {
                        return cart
                            .empty()
                            .then((cart) => {
                                setCart(cart);
                                addToCart(true);
                            })
                            .catch(logError);
                    },
                },
            ]);
        }

        // get cart
        getCart()
            .then((cart) => {
                const variants = getVariations();
                const addons = getAddons();

                // get storelocation if applicable
                const storeLocationId = storeLocation?.id;

                // if item already exists in cart update item
                if (cartItem) {
                    return cart.update(cartItem.id, quantity, { addons, variants }).then((cart) => {
                        setCart(cart);
                        setIsAddingToCart(false);
                        checkInCart();

                        return navigation.goBack();
                    });
                }

                // add new item to cart
                return cart.add(product.id, quantity, { addons, variants, store_location: storeLocationId }).then((cart) => {
                    setCart(cart);
                    setIsAddingToCart(false);
                    checkInCart();

                    const lastEvent = cart.getAttribute('last_event');

                    if (lastEvent && lastEvent.event === 'cart.item_added') {
                        // setCartItem(lastEvent.cart_item_id);
                        setCartItem(cart.contents().find((cartItem) => cartItem.id === lastEvent.cart_item_id));
                    }

                    return navigation.goBack();
                });
            })
            .catch((error) => {
                logError(error);
                setIsAddingToCart(false);
            });
    };

    const checkInCart = () => {
        return getCart().then((cart) => {
            setIsInCart(cart.hasProduct(product.id));
        });
    };

    const validate = () => {
        let validated = true;

        // check if all required variants have been selected
        for (let i = 0; i < product.getAttribute('variants').length; i++) {
            const variant = product.getAttribute('variants')[i];

            if (variant.is_required && !selectedVariations[variant.id]) {
                validated = false;
            }
        }

        setIsValid(validated);
        return validated;
    };

    useEffect(() => {
        checkInCart();
        validate();
        restoreSelections();
    }, []);

    return (
        <View style={[tailwind('bg-white'), { paddingTop: insets.top }]}>
            <View style={tailwind('w-full h-full bg-white relative')}>
                <View style={tailwind('flex flex-row items-center p-4')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            {cartItemAttributes ? <FontAwesomeIcon icon={faTimes} /> : <FontAwesomeIcon icon={faArrowLeft} />}
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>{product.getAttribute('name')}</Text>
                </View>
                <View style={tailwind('w-full relative')}>
                    <View style={tailwind('flex flex-col justify-center w-full')}>
                        <View>
                            <Carousel
                                layout={'stack'}
                                data={images}
                                renderItem={renderImages}
                                sliderWidth={fullWidth}
                                itemWidth={225}
                                onSnapToItem={(index) => setActiveSlide(index)}
                                firstItem={activeSlide}
                                enableMomentum={true}
                            />
                            <Pagination
                                dotsLength={images.length}
                                activeDotIndex={activeSlide}
                                containerStyle={tailwind('py-4 mt-2')}
                                dotStyle={tailwind('rounded-full w-3 h-3 mx-2 bg-gray-600 border border-gray-600')}
                                inactiveDotStyle={tailwind('rounded-full w-3 h-3 mx-2 bg-gray-100 border border-gray-900')}
                                inactiveDotOpacity={0.4}
                                inactiveDotScale={0.6}
                            />
                        </View>
                    </View>
                    <ScrollView style={{ minHeight: scrollViewMinHeight }} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                        <View style={{ minHeight: scrollViewMinHeight, paddingBottom: scrollViewMinHeight + 80 }}>
                            <View style={tailwind('p-4')}>
                                <View style={tailwind('mb-2')}>
                                    {product.isOnSale && (
                                        <View style={tailwind('flex flex-row')}>
                                            <Text style={tailwind('font-semibold text-xl mr-1')}>
                                                {formatCurrency(product.getAttribute('sale_price') / 100, product.getAttribute('currency'))}
                                            </Text>
                                            <Text style={tailwind('line-through text-base text-gray-400')}>
                                                {formatCurrency(product.getAttribute('price') / 100, product.getAttribute('currency'))}
                                            </Text>
                                        </View>
                                    )}
                                    {!product.isOnSale && (
                                        <View style={tailwind('flex flex-row')}>
                                            <Text style={tailwind('text-center text-xl font-semibold')}>
                                                {formatCurrency(product.getAttribute('price') / 100, product.getAttribute('currency'))}
                                            </Text>
                                        </View>
                                    )}
                                    <Text style={tailwind('text-sm text-gray-500')}>Base Price</Text>
                                </View>
                                <RenderHtml contentWidth={fullWidth} source={{ html: stripIframeTags(product.getAttribute('description')) ?? '' }} />
                            </View>
                            <View style={tailwind('bg-gray-100')}>
                                {product.variants().map((variation, i) => (
                                    <View key={i} style={tailwind('my-2 bg-white w-full p-4')}>
                                        <View style={tailwind('flex flex-row items-start mb-2')}>
                                            <Text style={tailwind('font-semibold text-lg mr-1')}>{variation.name}</Text>
                                            {variation.is_required && (
                                                <View style={tailwind('mt-1.5')}>
                                                    <FontAwesomeIcon icon={faAsterisk} size={8} style={tailwind('text-red-500')} />
                                                </View>
                                            )}
                                        </View>
                                        {variation.options.map((variant, j) => (
                                            <View
                                                key={j}
                                                style={tailwind(`flex flex-row items-center justify-between py-4 ${isLastIndex(variation.options, j) ? '' : 'border-b'} border-gray-100`)}
                                            >
                                                <View style={tailwind('flex flex-row items-center')}>
                                                    <View style={tailwind('mr-4')}>
                                                        <RadioButton
                                                            innerBackgroundColor="#3B82F6"
                                                            style={tailwind('rounded-full border-2 border-blue-500 w-6 h-6')}
                                                            innerContainerStyle={tailwind('rounded-full w-4 h-4')}
                                                            isActive={isVariantSelected(variant, variation) === true}
                                                            onPress={() => selectVariation(variation, variant)}
                                                        />
                                                    </View>
                                                    <Text style={tailwind('text-sm text-gray-700')}>{variant.name}</Text>
                                                </View>
                                                <View>
                                                    <Text style={tailwind('text-gray-400')}>+{formatCurrency(variant.additional_cost / 100, product.getAttribute('currency'))}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                            <View style={tailwind('bg-gray-100')}>
                                {product.addons().map((addonCategory, i) => (
                                    <View key={i} style={tailwind('my-2 bg-white w-full p-4')}>
                                        <View style={tailwind('flex flex-row items-center')}>
                                            <Text style={tailwind('font-semibold text-lg mr-2')}>{addonCategory.name}</Text>
                                            <Text style={tailwind('text-gray-400 text-xs')}>Optional, max {addonCategory.addons.length}</Text>
                                        </View>
                                        {addonCategory.addons.map((addon, j) => (
                                            <View
                                                key={j}
                                                style={tailwind(`flex flex-row items-center justify-between py-4 ${isLastIndex(addonCategory.addons, j) ? '' : 'border-b'} border-gray-100`)}
                                            >
                                                <View>
                                                    <View style={tailwind('flex flex-row items-center')}>
                                                        <Checkbox
                                                            size={24}
                                                            fillColor="#3B82F6"
                                                            unfillColor="#ffffff"
                                                            iconStyle={{ ...tailwind('rounded-md border border-blue-500') }}
                                                            isChecked={isAddonSelected(addon, addonCategory) === true}
                                                            onPress={(isChecked) => selectAddon(isChecked, addonCategory, addon)}
                                                        />
                                                        <Text style={tailwind('text-sm text-gray-700')}>{addon.name}</Text>
                                                    </View>
                                                </View>
                                                <View>
                                                    <View style={tailwind('flex flex-row')}>
                                                        <Text style={tailwind('text-gray-400')}>
                                                            +{formatCurrency((addon.is_on_sale ? addon.sale_price : addon.price) / 100, product.getAttribute('currency'))}
                                                        </Text>
                                                        {addon.is_on_sale && (
                                                            <Text style={tailwind('ml-1 line-through text-base text-gray-300')}>
                                                                {formatCurrency(addon.price / 100, product.getAttribute('currency'))}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </View>
                <View style={tailwind('absolute bottom-0 w-full p-4 border-t border-gray-200 bg-white')}>
                    <TouchableOpacity style={tailwind('mb-2')} disabled={cannotAddToCart} onPress={addToCart}>
                        <View
                            style={tailwind(`rounded-md border border-blue-500 bg-blue-50 px-4 py-2 w-full flex flex-row items-center justify-center ${cannotAddToCart ? 'opacity-50' : ''}`)}
                        >
                            {isAddingToCart && <ActivityIndicator color="#3B82F6" style={tailwind('mr-3')} />}
                            <Text style={tailwind('text-blue-500 text-lg font-semibold')}>{`${cartItem ? 'Update in Cart' : isInCart ? 'Add Another' : 'Add to Cart'} - ${formatCurrency(
                                subtotal / 100,
                                product.getAttribute('currency')
                            )}`}</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={tailwind('flex flex-row items-center justify-center my-2')}>
                        <TouchableOpacity style={tailwind('w-10')} disabled={!canDecreaseQuantity} onPress={decreaseQuantity}>
                            <View
                                style={tailwind(
                                    `rounded-md border border-blue-500 bg-blue-50 px-4 py-2 w-full flex flex-row items-center justify-center ${!canDecreaseQuantity ? 'opacity-50' : ''}`
                                )}
                            >
                                <FontAwesomeIcon icon={faMinus} size={15} />
                            </View>
                        </TouchableOpacity>
                        <View style={tailwind('w-16 rounded-md bg-white flex items-center justify-center')}>
                            <Text style={tailwind('font-bold text-lg')}>{quantity}</Text>
                        </View>
                        <TouchableOpacity style={tailwind('w-10')} disabled={!canIncreaseQuantity} onPress={increaseQuantity}>
                            <View
                                style={tailwind(
                                    `rounded-md border border-blue-500 bg-blue-50 px-4 py-2 w-full flex flex-row items-center justify-center ${!canIncreaseQuantity ? 'opacity-50' : ''}`
                                )}
                            >
                                <FontAwesomeIcon icon={faPlus} size={15} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default ProductScreen;
