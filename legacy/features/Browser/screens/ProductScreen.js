import React, { useState, useEffect, createRef } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUniqueId } from 'react-native-device-info';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faAsterisk, faPlus, faMinus, faTimes, faCalendarCheck } from '@fortawesome/free-solid-svg-icons';
import { Product, StoreLocation } from '@fleetbase/storefront';
import { useStorefront, useCart, useLocale } from 'hooks';
import { formatCurrency, isLastIndex, stripIframeTags, logError, translate } from 'utils';
import { useResourceStorage } from 'utils/Storage';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import FastImage from 'react-native-fast-image';
import YouTube from 'react-native-youtube';
import ActionSheet from 'react-native-actions-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import Checkbox from 'react-native-bouncy-checkbox';
import RadioButton from 'react-native-animated-radio-button';
import RenderHtml from 'react-native-render-html';
import tailwind from 'tailwind';

const { isArray } = Array;
const { emit } = EventRegister;
const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 2;

const getYoutubeId = (url) => {
    if (typeof url !== 'string') {
        return false;
    }

    const match = url?.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/);
    return match && match[1].length == 11 ? match[1] : false;
};

const getYoutubeThumbnail = (url) => {
    const id = getYoutubeId(url);
    return `https://i3.ytimg.com/vi/${id}/hqdefault.jpg`;
};

const isYoutubeUrl = (url) => typeof url === 'string' && url.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/)?.length > 0;

const ProductScreen = ({ navigation, route }) => {
    const { attributes, cartItemAttributes, store, selectedStoreLocation, info } = route.params;
    const storefront = useStorefront();
    const product = new Product(attributes);
    // const images = product.getAttribute('images');
    // const videos = product.getAttribute('videos');
    const fullWidth = Dimensions.get('window').width;
    const fullHeight = Dimensions.get('window').height;
    const scrollViewMinHeight = fullHeight / 2;
    const insets = useSafeAreaInsets();
    const actionSheetRef = createRef();

    // only if store has been passed in
    const [storeLocation, setStoreLocation] = useResourceStorage(store?.id ? `${store.id}_store_location` : 'store_location', StoreLocation, storefront.getAdapter(), selectedStoreLocation);
    // relevant product state
    const [images, setImages] = useState(product.getAttribute('images'));
    const [activeSlide, setActiveSlide] = useState(0);
    const [subtotal, setSubtotal] = useState(product.isOnSale ? product.getAttribute('sale_price') : product.getAttribute('price'));
    const [scrollY, setScrollY] = useState(0);
    const [selectedVariations, setSelectedVariations] = useState({});
    const [selectionCount, setSelectionCount] = useState(0);
    const [selectedAddons, setSelectedAddons] = useState({});
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [isInCart, setIsInCart] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [cart, setCart] = useCart();
    const [cartItem, setCartItem] = useState(cartItemAttributes);
    const [bookingDate, setBookingDate] = useState(cartItem?.scheduled_at ? new Date(cartItem?.scheduled_at) : new Date());
    const [bookingTime, setBookingTime] = useState(cartItem?.scheduled_at ? new Date(cartItem?.scheduled_at) : new Date());
    const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
    const [hasBookingChanged, setHasBookingChanged] = useState(false);
    const [viewingMedia, setViewingMedia] = useState(null);
    const [locale, setLocale] = useLocale();

    const canAddToCart = isValid && !isAddingToCart;
    const cannotAddToCart = !canAddToCart;
    const canDecreaseQuantity = quantity > 1;
    const canIncreaseQuantity = quantity < 99;
    const isNetwork = info?.is_network === true;
    const isMultiCartEnabled = info?.is_network === true && info?.options?.multi_cart_enabled === true;
    const isMultiCartDisabled = !isMultiCartEnabled;
    const isService = product.getAttribute('is_service') === true;
    const isBookable = isService && product.getAttribute('is_bookable') === true;
    const youtubeUrls = product
        .getAttribute('youtube_urls', [])
        .filter((url) => typeof url === 'string')
        .filter(Boolean);

    let actionButtonText = `${
        cartItem
            ? translate('Browser.ProductScreen.updateInCartActionText')
            : isInCart
              ? translate('Browser.ProductScreen.addAnotherActionText')
              : translate('Browser.ProductScreen.addToCartActionText')
    } - ${formatCurrency(subtotal, product.getAttribute('currency'))}`;

    if (isBookable) {
        actionButtonText = `${
            cartItem
                ? translate('Browser.ProductScreen.updateBookingActionText')
                : isInCart
                  ? translate('Browser.ProductScreen.addAnotherBookingActionText')
                  : translate('Browser.ProductScreen.bookServiceActionText')
        } - ${formatCurrency(subtotal, product.getAttribute('currency'))}`;
    }

    const checkIfCanAddToCart = () => {
        if (isNetwork && isMultiCartDisabled && cart.isNotEmpty) {
            return cart.contents().every((cartItem) => cartItem.store_id !== store?.id);
        }

        return false;
    };

    const renderImages = ({ item, index }) => {
        return (
            <View key={index} style={tailwind('flex items-center justify-center w-56 h-56')}>
                <FastImage source={{ uri: item }} style={tailwind('h-56 w-56')} />
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
        setSelectionCount(selectionCount + 1);
    };

    const selectVariation = (variation, variant) => {
        selectedVariations[variation.id] = variant;

        setSelectedVariations(selectedVariations);
        validate();
        calculateSubtotal();
        setSelectionCount(selectionCount + 1);
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
        return new Promise(async (resolve) => {
            if (cart) {
                resolve(cart);
            }

            const cartId = await getUniqueId();

            return storefront.cart.retrieve(cartId).then((cart) => {
                setCart(cart);
                resolve(cart);
            });
        });
    };

    const addToCart = () => {
        setIsAddingToCart(true);

        let bookingDateTime;

        // for bookable services
        if (isBookable && isBookingConfirmed === false && hasBookingChanged === false) {
            // prompt user to select the booking slot
            actionSheetRef.current?.show();
            setIsAddingToCart(false);
            return;
        } else if (isBookable && isBookingConfirmed) {
            bookingDateTime = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate(), bookingTime.getHours(), bookingTime.getMinutes());
            setIsBookingConfirmed(false);
        }

        if (checkIfCanAddToCart()) {
            return Alert.alert(translate('Browser.ProductScreen.hasItemsAlertTitle'), translate('Browser.ProductScreen.hasItemsAlertDecription'), [
                {
                    text: translate('Browser.ProductScreen.hasItemsAlertCancelActionText'),
                    style: 'cancel',
                    onPress: () => {
                        setIsAddingToCart(false);
                    },
                },
                {
                    text: translate('Browser.ProductScreen.hasItemsAlertContinueActionText'),
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
                    return cart.update(cartItem.id, quantity, { addons, variants, scheduled_at: bookingDateTime }).then((cart) => {
                        setCart(cart);
                        setIsAddingToCart(false);
                        checkInCart();

                        return navigation.goBack();
                    });
                }

                // add new item to cart
                return cart.add(product.id, quantity, { addons, variants, store_location: storeLocationId, scheduled_at: bookingDateTime }).then((cart) => {
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

    const updateBookingSchedule = (date, mode) => {
        if (mode === 'time') {
            setBookingTime(date);
        }

        if (mode === 'date') {
            setBookingDate(date);
        }

        setHasBookingChanged(true);
    };

    const confirmBooking = () => {
        actionSheetRef.current?.hide();
        setIsBookingConfirmed(true);
    };

    if (isBookingConfirmed) {
        return addToCart();
    }

    useEffect(() => {
        checkInCart();
        validate();
        restoreSelections();
    }, []);

    return (
        <View style={[tailwind('bg-white'), { paddingTop: insets.top }]}>
            <View style={tailwind('relative h-full')}>
                <View style={tailwind('absolute top-0 w-full bg-white bg-opacity-50 z-20')}>
                    <View style={tailwind('flex flex-row items-center p-4')}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')}>
                            <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                                {cartItemAttributes ? <FontAwesomeIcon icon={faTimes} /> : <FontAwesomeIcon icon={faArrowLeft} />}
                            </View>
                        </TouchableOpacity>
                        <View style={tailwind('flex flex-row items-center')}>
                            <Text style={tailwind('text-xl font-semibold')}>{product.getAttribute('name')}</Text>
                            {isService && <Text style={tailwind('ml-1 text-xl text-blue-500')}>{translate('Browser.ProductScreen.serviceIdentifierText')}</Text>}
                        </View>
                    </View>
                </View>
                <ScrollView style={{ minHeight: scrollViewMinHeight, paddingTop: 72 }} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
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
                        <View style={{ minHeight: scrollViewMinHeight, paddingBottom: scrollViewMinHeight + 80 }}>
                            <View style={tailwind('p-4')}>
                                <View style={tailwind('mb-2')}>
                                    {product.isOnSale && (
                                        <View style={tailwind('flex flex-row')}>
                                            <Text style={tailwind('font-semibold text-xl mr-1')}>{formatCurrency(product.getAttribute('sale_price'), product.getAttribute('currency'))}</Text>
                                            <Text style={tailwind('line-through text-base text-gray-400')}>
                                                {formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}
                                            </Text>
                                        </View>
                                    )}
                                    {!product.isOnSale && (
                                        <View style={tailwind('flex flex-row')}>
                                            <Text style={tailwind('text-center text-xl font-semibold')}>
                                                {formatCurrency(product.getAttribute('price'), product.getAttribute('currency'))}
                                            </Text>
                                        </View>
                                    )}
                                    <Text style={tailwind('text-sm text-gray-500')}>{translate('Browser.ProductScreen.basePriceLabel')}</Text>
                                </View>
                                <RenderHtml contentWidth={fullWidth} source={{ html: stripIframeTags(product.getAttribute('description')) ?? '' }} />
                            </View>
                            {youtubeUrls.length > 0 && (
                                <View style={tailwind('bg-gray-100')}>
                                    <View style={tailwind('my-2 bg-white w-full p-4')}>
                                        <View style={tailwind('flex flex-row items-center mb-2')}>
                                            <Text style={tailwind('font-semibold text-lg')}>{translate('Browser.ProductScreen.youtubeVidsSectionTitle')}</Text>
                                        </View>
                                        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={tailwind(`flex flex-row flex-wrap py-4`)}>
                                            {youtubeUrls.map((youtubeUrl, index) => (
                                                <TouchableOpacity key={index} onPress={() => setViewingMedia(youtubeUrl)} style={tailwind('border border-black mr-2')}>
                                                    <FastImage source={{ uri: getYoutubeThumbnail(youtubeUrl) }} style={tailwind('w-40 h-24')} />
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}
                            {isBookable && cartItem && (
                                <View style={tailwind('bg-gray-100')}>
                                    <View style={tailwind('my-2 bg-white w-full p-4')}>
                                        <View style={tailwind('flex flex-row items-center mb-2')}>
                                            <FontAwesomeIcon icon={faCalendarCheck} style={tailwind('mr-2 text-blue-600')} />
                                            <Text style={tailwind('font-semibold text-lg text-blue-600')}>{translate('Browser.ProductScreen.displayBookingDetailsTitle')}</Text>
                                        </View>
                                        <View style={tailwind(`flex flex-col py-4`)}>
                                            <View style={tailwind('flex flex-row items-center mb-4')}>
                                                <Text style={tailwind('font-bold text-black mr-2')}>{translate('Browser.ProductScreen.displayBookingDateLabelText')}:</Text>
                                                <DateTimePicker
                                                    value={bookingDate}
                                                    minimumDate={new Date()}
                                                    mode={'date'}
                                                    display={'default'}
                                                    onChange={(event, selectedDate) => updateBookingSchedule(selectedDate, 'date')}
                                                    style={tailwind('w-24')}
                                                />
                                            </View>
                                            <View style={tailwind('flex flex-row items-center')}>
                                                <Text style={tailwind('font-bold text-black mr-2')}>{translate('Browser.ProductScreen.displayBookingTimeLabelText')}:</Text>
                                                <DateTimePicker
                                                    value={bookingTime}
                                                    mode={'time'}
                                                    display={'default'}
                                                    minuteInterval={30}
                                                    onChange={(event, selectedDate) => updateBookingSchedule(selectedDate, 'time')}
                                                    style={tailwind('w-24')}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}
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
                                                            innerBackgroundColor='#3B82F6'
                                                            style={tailwind('rounded-full border-2 border-blue-500 w-6 h-6')}
                                                            innerContainerStyle={tailwind('rounded-full w-4 h-4')}
                                                            isActive={isVariantSelected(variant, variation) === true}
                                                            onPress={() => selectVariation(variation, variant)}
                                                        />
                                                    </View>
                                                    <Text style={tailwind('text-sm text-gray-700')}>{variant.name}</Text>
                                                </View>
                                                <View>
                                                    <Text style={tailwind('text-gray-400')}>+{formatCurrency(variant.additional_cost, product.getAttribute('currency'))}</Text>
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
                                            <Text style={tailwind('text-gray-400 text-xs')}>
                                                {translate('Browser.ProductScreen.optionalAddonLabel', { addonsCount: addonCategory?.addons?.length })}
                                            </Text>
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
                                                            fillColor='#3B82F6'
                                                            unfillColor='#ffffff'
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
                                                            +{formatCurrency(addon.is_on_sale ? addon.sale_price : addon.price, product.getAttribute('currency'))}
                                                        </Text>
                                                        {addon.is_on_sale && (
                                                            <Text style={tailwind('ml-1 line-through text-base text-gray-300')}>
                                                                {formatCurrency(addon.price, product.getAttribute('currency'))}
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
                    </View>
                </ScrollView>
                <View style={tailwind('absolute bottom-0 w-full p-4 border-t border-gray-200 bg-white')}>
                    <TouchableOpacity style={tailwind('mb-2')} disabled={cannotAddToCart} onPress={addToCart}>
                        <View
                            style={tailwind(`rounded-md border border-blue-500 bg-blue-50 px-4 py-2 w-full flex flex-row items-center justify-center ${cannotAddToCart ? 'opacity-50' : ''}`)}
                        >
                            {isAddingToCart && <ActivityIndicator color='#3B82F6' style={tailwind('mr-3')} />}
                            <Text style={tailwind('text-blue-500 text-lg font-semibold')}>{actionButtonText}</Text>
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
            <ActionSheet ref={actionSheetRef} containerStyle={[{ height: dialogHeight, zIndex: 99999 }]} gestureEnabled={true} bounceOnOpen={true}>
                <View style={[tailwind('z-40 w-full relative'), { height: dialogHeight - 110 }]}>
                    <View style={tailwind('px-5 py-2 flex flex-row items-center justify-between mb-2')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <Text style={tailwind('text-lg font-semibold')}>{translate('Browser.ProductScreen.confirmBookingActionSheetTitle')}</Text>
                        </View>
                        <View>
                            <TouchableOpacity onPress={() => actionSheetRef.current?.hide()}>
                                <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={tailwind('h-full relative')}>
                        <View style={tailwind('w-full flex px-6 my-4')}>
                            <View style={tailwind('flex flex-row items-center')}>
                                <Text style={tailwind('font-bold text-black mr-2')}>{translate('Browser.ProductScreen.confirmBookingActionSheetDateLabelText')}:</Text>
                                <DateTimePicker
                                    value={bookingDate}
                                    minimumDate={new Date()}
                                    mode={'date'}
                                    display={'default'}
                                    onChange={(event, selectedDate) => setBookingDate(selectedDate)}
                                    style={tailwind('w-24')}
                                />
                            </View>
                        </View>
                        <View style={tailwind('w-full flex px-6 mt-2')}>
                            <View style={tailwind('flex flex-row items-center')}>
                                <Text style={tailwind('font-bold text-black mr-2')}>{translate('Browser.ProductScreen.confirmBookingActionSheetTimeLabelText')}:</Text>
                                <DateTimePicker
                                    value={bookingTime}
                                    mode={'time'}
                                    display={'default'}
                                    minuteInterval={30}
                                    onChange={(event, selectedDate) => setBookingTime(selectedDate)}
                                    style={tailwind('w-24')}
                                />
                            </View>
                        </View>
                        <View style={tailwind('w-full flex items-center justify-center p-4 absolute bottom-0 left-0 right-0')}>
                            <TouchableOpacity onPress={confirmBooking} style={tailwind(`btn bg-blue-500 shadow-sm`)} disabled={!bookingDate || !bookingTime}>
                                <Text style={tailwind('text-white text-lg font-semibold')}>{translate('Browser.ProductScreen.confirmBookingActionSheetButtonText')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ActionSheet>
            <Modal visible={viewingMedia !== null} animationType={'slide'} transparent={true}>
                <View style={[tailwind('bg-black'), { paddingTop: insets.top }]}>
                    <View style={tailwind('flex flex-row items-center p-4 z-10')}>
                        <TouchableOpacity onPress={() => setViewingMedia(null)} style={tailwind('mr-4')}>
                            <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                                <FontAwesomeIcon icon={faTimes} />
                            </View>
                        </TouchableOpacity>
                        <Text style={tailwind('text-xl font-bold text-white')}>{translate('Browser.ProductScreen.viewProductMediaTitle')}</Text>
                    </View>
                    <View style={tailwind('w-full h-full flex items-center mt-20')}>
                        {isYoutubeUrl(viewingMedia) && <YouTube videoId={getYoutubeId(viewingMedia)} style={{ alignSelf: 'stretch', height: 400 }} />}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default ProductScreen;
