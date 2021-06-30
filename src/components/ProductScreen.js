import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, Image, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faAsterisk, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency, isLastIndex } from '../utils';
import tailwind from '../tailwind';
import Storefront, { Product } from '@fleetbase/storefront';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import Checkbox from 'react-native-bouncy-checkbox';
import RadioButton from 'react-native-animated-radio-button';

const renderImage = ({ item, index }) => {
    return (
        <View key={index} style={tailwind('flex items-center justify-center')}>
            <Image source={{ uri: item }} style={tailwind('h-56 w-56 rounded-md shadow-sm')} />
        </View>
    );
};

const ProductScreen = ({ navigation, route }) => {
    const { attributes, key } = route.params;
    const storefront = new Storefront(key, { host: 'https://v2api.fleetbase.engineering' });
    const product = new Product(attributes);
    const images = product.getAttribute('images');
    // const videos = product.getAttribute('videos');
    const fullWidth = Dimensions.get('window').width;
    const fullHeight = Dimensions.get('window').height;
    const scrollViewMinHeight = fullHeight / 2;

    const [activeSlide, setActiveSlide] = useState(Math.round(images.length / 2));
    const [subtotal, setSubtotal] = useState(product.isOnSale ? product.getAttribute('sale_price') : product.getAttribute('price'));
    const [selectedVariations, setSelectedVariations] = useState({});
    const [selectedAddons, setSelectedAddons] = useState({});
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [isInCart, setIsInCart] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [cart, setCart] = useState(null);
    const [cartItem, setCartItem] = useState(null);

    const canAddToCart = isValid && !isAddingToCart;
    const cannotAddToCart = !canAddToCart;
    const canDecreaseQuantity = quantity > 1;
    const canIncreaseQuantity = quantity < 99;

    const decreaseQuantity = () => {
        if (!canDecreaseQuantity) {
            return;
        }

        setQuantity(quantity - 1);
    }

    const increaseQuantity = () => {
        if (!canIncreaseQuantity) {
            return;
        }
        
        setQuantity(quantity + 1);
    }

    const selectAddon = (isChecked, addonCategory, addon) => {
        if (isChecked) {
            if (!Array.isArray(selectedAddons[addonCategory.id])) {
                selectedAddons[addonCategory.id] = [];
            }

            selectedAddons[addonCategory.id].push(addon);
        } else {
            if (!Array.isArray(selectedAddons[addonCategory.id])) {
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

    const selectVariation = (variation, variantOption) => {
        selectedVariations[variation.id] = variantOption;

        setSelectedVariations(selectedVariations);
        validate();
        calculateSubtotal();
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

        // get cart
        getCart()
            .then((cart) => {
                const variants = getVariations();
                const addons = getAddons();

                // if item already exists in cart update item
                if (cartItem) {
                    return cart.update(cartItem, quantity, { addons, variants }).then((cart) => {
                        console.log(cart);
                        setCart(cart);
                        setIsAddingToCart(false);
                        checkInCart();
                    });
                }

                // add new item to cart
                return cart.add(product.id, quantity, { addons, variants }).then((cart) => {
                    console.log(cart);
                    setCart(cart);
                    setIsAddingToCart(false);
                    checkInCart();
                    
                    const lastEvent = cart.getAttribute('last_event');

                    if (lastEvent && lastEvent.event === 'cart.line_item_added') {
                        setCartItem(lastEvent.line_item_id);
                    }
                });
            })
            .catch((error) => {
                Alert.alert(error.message);
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

    useEffect(() => checkInCart(), []);
    useEffect(() => validate(), []);

    return (
        <SafeAreaView style={tailwind('bg-white')}>
            <View style={tailwind('w-full h-full bg-white relative')}>
                <View style={tailwind('flex flex-row items-center p-4')}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                        <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </View>
                    </TouchableOpacity>
                    <Text style={tailwind('text-xl font-semibold')}>{product.getAttribute('name')}</Text>
                </View>
                <View style={tailwind('w-full relative')}>
                    <View style={tailwind('flex flex-col justify-center w-full')}>
                        <View>
                            <Carousel
                                layout={'default'}
                                data={images}
                                renderItem={renderImage}
                                sliderWidth={fullWidth}
                                itemWidth={225}
                                onSnapToItem={(index) => setActiveSlide(index)}
                                firstItem={activeSlide}
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
                    <ScrollView style={{ minHeight: scrollViewMinHeight }}>
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
                                <Text style={tailwind('mb-3')}>{product.getAttribute('description')}</Text>
                            </View>
                            <View style={tailwind('bg-gray-100')}>
                                {product.getAttribute('variants').map((variant) => (
                                    <View key={variant.id} style={tailwind('my-2 bg-white w-full p-4')}>
                                        <View style={tailwind('flex flex-row items-start mb-2')}>
                                            <Text style={tailwind('font-semibold text-lg mr-1')}>{variant.name}</Text>
                                            {variant.is_required && (
                                                <View style={tailwind('mt-1.5')}>
                                                    <FontAwesomeIcon icon={faAsterisk} size={8} style={tailwind('text-red-500')} />
                                                </View>
                                            )}
                                        </View>
                                        {variant.options.map((variantOption, index) => (
                                            <View
                                                key={index}
                                                style={tailwind(`flex flex-row items-center justify-between py-4 ${isLastIndex(variant.options, index) ? '' : 'border-b'} border-gray-100`)}>
                                                <View style={tailwind('flex flex-row items-center')}>
                                                    <View style={tailwind('mr-4')}>
                                                        <RadioButton
                                                            innerBackgroundColor="#3B82F6"
                                                            style={tailwind('rounded-full border-2 border-blue-500 w-6 h-6')}
                                                            innerContainerStyle={tailwind('rounded-full w-4 h-4')}
                                                            onPress={() => selectVariation(variant, variantOption)}
                                                            isActive={selectedVariations[variant.id] === variantOption}
                                                        />
                                                    </View>
                                                    <Text style={tailwind('text-sm text-gray-700')}>{variantOption.name}</Text>
                                                </View>
                                                <View>
                                                    <Text style={tailwind('text-gray-400')}>+{formatCurrency(variantOption.additional_cost / 100, product.getAttribute('currency'))}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                            <View style={tailwind('bg-gray-100')}>
                                {product.getAttribute('addon_categories').map((addonCategory) => (
                                    <View key={addonCategory.id} style={tailwind('my-2 bg-white w-full p-4')}>
                                        <View style={tailwind('flex flex-row items-center')}>
                                            <Text style={tailwind('font-semibold text-lg mr-2')}>{addonCategory.name}</Text>
                                            <Text style={tailwind('text-gray-400 text-xs')}>Optional, max {addonCategory.addons.length}</Text>
                                        </View>
                                        {addonCategory.addons.map((addon, index) => (
                                            <View
                                                key={index}
                                                style={tailwind(
                                                    `flex flex-row items-center justify-between py-4 ${isLastIndex(addonCategory.addons, index) ? '' : 'border-b'} border-gray-100`
                                                )}>
                                                <View>
                                                    <View style={tailwind('flex flex-row items-center')}>
                                                        <Checkbox
                                                            size={24}
                                                            fillColor="#3B82F6"
                                                            unfillColor="#ffffff"
                                                            iconStyle={{ ...tailwind('rounded-md border border-blue-500') }}
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
                            style={tailwind(
                                `rounded-md border border-blue-500 bg-blue-50 px-4 py-2 w-full flex flex-row items-center justify-center ${cannotAddToCart ? 'opacity-50' : ''}`
                            )}>
                            {isAddingToCart && <ActivityIndicator color="#3B82F6" style={tailwind('mr-3')} />}
                            <Text style={tailwind('text-blue-500 text-lg font-semibold')}>{`${cartItem ? 'Update in Cart' : (isInCart ? 'Add Another' : 'Add to Cart')} - ${formatCurrency(
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
                                )}>
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
                                )}>
                                <FontAwesomeIcon icon={faPlus} size={15} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default ProductScreen;
