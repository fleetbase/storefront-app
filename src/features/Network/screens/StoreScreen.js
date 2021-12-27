import React, { useState, useEffect, createRef } from 'react';
import { SafeAreaView, ScrollView, RefreshControl, View, Text, TextInput, Image, ImageBackground, TouchableOpacity, ActivityIndicator, Dimensions, Linking } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faMapMarkerAlt, faShare, faImages, faStar, faMapMarkedAlt, faExternalLinkAlt, faPhone, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Collection } from '@fleetbase/sdk';
import { Store, Category, Product, StoreLocation } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { useMountedState, useLocale } from 'hooks';
import { NetworkInfoService } from 'services';
import { useResourceCollection, useResourceStorage } from 'utils/Storage';
import { formatCurrency, logError, translate, config } from 'utils';
import FastImage from 'react-native-fast-image';
import Share from 'react-native-share';
import ActionSheet from 'react-native-actions-sheet';
import NetworkHeader from 'ui/headers/NetworkHeader';
import CategoryProductSlider from 'ui/CategoryProductSlider';
import StoreCategoryPicker from 'ui/StoreCategoryPicker';
import StoreSearch from 'ui/StoreSearch';
import ProductCard from 'ui/ProductCard';
import StorePicker from 'ui/StorePicker';
import Rating from 'ui/Rating';
import tailwind from 'tailwind';

const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 2;

const StoreScreen = ({ navigation, route }) => {
    const { info, data } = route.params;

    const storefront = useStorefront();
    const isMounted = useMountedState();
    const insets = useSafeAreaInsets();
    const store = new Store(data);
    const contactActionSheetRef = createRef();

    const isReviewsEnabled = info?.options?.reviews_enabled === true;

    const [categories, setCategories] = useResourceCollection(`${store.id}_categories`, Category, StorefrontAdapter);
    const [storeLocation, setStoreLocation] = useResourceStorage(`${store.id}_store_location`, StoreLocation, StorefrontAdapter);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isHoursVisible, setIsHoursVisible] = useState(false);
    const [results, setResults] = useState(new Collection());
    const [locale] = useLocale();
    const shouldDisplayLoader = categories?.length === 0 && isLoading;
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = weekdays[new Date().getDay()];
    const hasContactInformation = store.isAttributeFilled(['phone', 'email', 'facebook', 'instagram', 'twitter']);

    const loadCategories = (isRefreshing = false) => {
        setIsLoading(true);
        setIsRefreshing(isRefreshing);

        storefront.categories
            .query({ store: store.id, with_products: true })
            .then((categories) => {
                if (isMounted()) {
                    setCategories(categories);
                }
            })
            .catch(logError)
            .finally(() => {
                if (isMounted()) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                }
            });
    };

    const toggleHours = () => setIsHoursVisible(!isHoursVisible);

    const transitionToCategory = (category, actionSheet) => {
        navigation.navigate('CategoryScreen', { attributes: category.serialize(), storeData: data });
        actionSheet?.hide();
    };

    const transitionToReviews = () => {
        navigation.navigate('StoreReviewsScreen', { storeData: data });
    };

    const transitionToPhotos = () => {
        navigation.navigate('StorePhotosScreen', { storeData: data });
    };

    const transitionToProduct = (product, close, timeout = 300) => {
        if (typeof close === 'function') {
            close();
        }

        setTimeout(() => {
            navigation.navigate('ProductScreen', { attributes: product.serialize(), storeData: data });
        }, timeout);
    };

    const shareStore = () => {
        Share.open({
            title: translate('Network.StoreScreen.shareStoreTitleText', { storeName: store.getAttribute('name'), networkName: info.name }),
            subject: translate('Network.StoreScreen.shareStoreSubjectText', { storeName: store.getAttribute('name'), networkName: info.name }),
            message: translate('Network.StoreScreen.shareStoreMessageText', { storeName: store.getAttribute('name'), networkName: info.name }),
        });
    };

    const contactStore = () => {
        contactActionSheetRef.current?.setModalVisible();
    };

    const visitStoreWebsite = () => {
        const url = store.getAttribute('website');

        Linking.canOpenURL(url).then((supported) => {
            if (supported) {
                Linking.openURL(url);
            } else {
                console.log(`Don't know how to open URI: ${url}`);
            }
        });
    };

    const StoreHeader = ({ store, wrapperStyle }) => (
        <View style={[tailwind('w-full z-20'), wrapperStyle]}>
            <View style={tailwind('w-full flex items-center justify-center')}>
                <View style={tailwind('w-full')}>
                    <View style={tailwind('p-2')}>
                        <View style={tailwind('flex flex-row p-3 rounded-md mb-2')}>
                            <View style={tailwind('mr-3')}>
                                <View style={tailwind('rounded-md')}>
                                    <FastImage source={{ uri: store.getAttribute('logo_url') }} style={tailwind('h-18 w-18 rounded-md')} />
                                </View>
                            </View>
                            <View style={tailwind('w-3/4')}>
                                <Text style={tailwind('font-bold text-lg text-white')} numberOfLines={1}>
                                    {store.getAttribute('name')}
                                </Text>
                                <Text style={tailwind('text-gray-100')}>{store.getAttribute('description') ?? translate('Network.StoreScreen.descriptionMissing')}</Text>
                                {isReviewsEnabled && (
                                    <View style={tailwind('mt-1 flex flex-row items-center justify-start')}>
                                        <Rating value={store.getAttribute('rating')} readonly={true} />
                                    </View>
                                )}
                            </View>
                        </View>
                        <View>
                            <StorePicker
                                info={data}
                                displayAddressForTitle={true}
                                buttonIcon={faMapMarkerAlt}
                                buttonTitleMaxLines={2}
                                buttonStyle={tailwind('text-gray-100 rounded-md')}
                                buttonTitleStyle={tailwind('text-sm text-white')}
                                buttonTitleWrapperStyle={tailwind('w-full flex-1')}
                                buttonIconStyle={tailwind('text-gray-100')}
                                addressTitleStyle={tailwind('text-white font-semibold')}
                                addressSubtitleStyle={tailwind('text-gray-100')}
                                buttonIconSize={22}
                            />
                        </View>
                    </View>
                </View>
            </View>
            <View>
                {storeLocation?.getAttribute('hours')?.length > 0 && (
                    <View style={tailwind('w-full bg-white flex flex-row flex-wrap items-center border-b border-gray-100')}>
                        <TouchableOpacity style={tailwind('p-4 w-full flex flex-row')} onPress={toggleHours}>
                            <Text style={tailwind('font-bold')}>{translate('Network.StoreScreen.displayHoursToggleText')}</Text>
                            {storeLocation?.schedule[today]?.length > 0 && (
                                <View style={tailwind('ml-2')}>
                                    <Text style={tailwind('font-bold text-gray-500')}>
                                        {`${translate('Network.StoreScreen.displayHoursTodayLabel')}: ${format(storeLocation?.schedule[today][0].startDateInstance, 'hh:mm aaa')} - ${format(
                                            storeLocation?.schedule[today][0].endDateInstance,
                                            'hh:mm aaa'
                                        )}`}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {isHoursVisible && (
                            <View style={tailwind('px-4 pb-2 pt-4')}>
                                <View style={tailwind('flex flex-row flex-wrap')}>
                                    {weekdays.map((weekday) => (
                                        <View key={weekday} style={tailwind('w-1/2 mb-2')}>
                                            <Text style={tailwind('font-semibold mb-1')}>{translate(`Network.StoreScreen.weekday${weekday}`)}</Text>
                                            {storeLocation?.schedule[weekday].map((hour, hourIndex) => (
                                                <View key={hourIndex} style={tailwind('mb-1')}>
                                                    <Text>
                                                        {format(hour.startDateInstance, 'hh:mm aaa')} - {format(hour.endDateInstance, 'hh:mm aaa')}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>
            <View style={tailwind('w-full px-2 py-2 bg-white flex flex-row flex-wrap items-center border-b border-gray-100')}>
                <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                    <TouchableOpacity onPress={transitionToPhotos} style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}>
                        <FontAwesomeIcon icon={faImages} size={20} style={tailwind('text-gray-600 mb-2')} />
                        <Text style={tailwind('text-xs')} numberOfLines={1}>
                            {translate('Network.StoreScreen.photosButtonText')}
                        </Text>
                    </TouchableOpacity>
                </View>
                {isReviewsEnabled && (
                    <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                        <TouchableOpacity onPress={transitionToReviews} style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}>
                            <FontAwesomeIcon icon={faStar} size={20} style={tailwind('text-gray-600 mb-2')} />
                            <Text style={tailwind('text-xs')} numberOfLines={1}>
                                {translate('Network.StoreScreen.reviewsButtonText')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('StoreLocationScreen', { data: store.serialize(), locationData: storeLocation.serialize() })}
                        style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}
                    >
                        <FontAwesomeIcon icon={faMapMarkedAlt} size={20} style={tailwind('text-gray-600 mb-2')} />
                        <Text style={tailwind('text-xs')} numberOfLines={1}>
                            {translate('Network.StoreScreen.mapButtonText')}
                        </Text>
                    </TouchableOpacity>
                </View>
                {store.isAttributeFilled('website') && (
                    <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                        <TouchableOpacity onPress={visitStoreWebsite} style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}>
                            <FontAwesomeIcon icon={faExternalLinkAlt} size={20} style={tailwind('text-gray-600 mb-2')} />
                            <Text style={tailwind('text-xs')} numberOfLines={1}>
                                {translate('Network.StoreScreen.websiteButtonText')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                {hasContactInformation && (
                    <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                        <TouchableOpacity onPress={contactStore} style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}>
                            <FontAwesomeIcon icon={faPhone} size={20} style={tailwind('text-gray-600 mb-2')} />
                            <Text style={tailwind('text-xs')} numberOfLines={1}>
                                {translate('Network.StoreScreen.contactButtonText')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                    <TouchableOpacity onPress={shareStore} style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}>
                        <FontAwesomeIcon icon={faShare} size={20} style={tailwind('text-gray-600 mb-2')} />
                        <Text style={tailwind('text-xs')} numberOfLines={1}>
                            {translate('Network.StoreScreen.shareButtonText')}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                    <StoreSearch
                        store={store}
                        onResultPress={transitionToProduct}
                        buttonStyle={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}
                        buttonIconSize={20}
                        buttonIconStyle={tailwind('text-gray-600 mb-2 mr-0')}
                        buttonTitleStyle={tailwind('text-xs')}
                        numberOfLines={1}
                        buttonTitle={translate('Network.StoreScreen.searchButtonText')}
                    />
                </View>
                <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                    <StoreCategoryPicker
                        buttonTitle={translate('Network.StoreScreen.browseButtonText')}
                        categories={categories.filter((category) => category.getAttribute('products.length') > 0)}
                        onCategoryPress={transitionToCategory}
                        buttonStyle={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}
                        buttonIconSize={20}
                        buttonIconStyle={tailwind('text-gray-600 mb-2 mr-0')}
                        buttonTitleStyle={tailwind('text-xs')}
                        numberOfLines={1}
                    />
                </View>
            </View>
        </View>
    );

    const ContactActionSheet = ({ dialogIconStyle }) => (
        <ActionSheet
            containerStyle={[{ height: dialogHeight }]}
            gestureEnabled={true}
            bounceOnOpen={true}
            nestedScrollEnabled={true}
            onMomentumScrollEnd={() => contactActionSheetRef.current?.handleChildScrollEnd()}
            ref={contactActionSheetRef}
        >
            <View>
                <View style={tailwind('px-5 py-2 flex flex-row items-center justify-between mb-2')}>
                    <View style={tailwind('flex flex-row items-center')}>
                        <FontAwesomeIcon icon={faPhone} style={[tailwind(`text-gray-900 mr-2`), dialogIconStyle]} />
                        <Text style={tailwind('text-lg font-semibold')}>{translate('Network.StoreScreen.contactActionSheetTitle', { storeName: store.getAttribute('name') })}</Text>
                    </View>

                    <View>
                        <TouchableOpacity onPress={() => contactActionSheetRef.current?.hide()}>
                            <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                                <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
                <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                    <View style={tailwind('px-4 py-2')}>
                        {store.isAttributeFilled('phone') && (
                            <TouchableOpacity
                                onPress={() => Linking.openURL(`tel:${store.getAttribute('phone')}`)}
                                style={tailwind('flex flex-row items-center p-4 rounded-md mb-4 bg-gray-100')}
                            >
                                <Text style={tailwind('text-base font-semibold')}>{translate('Network.StoreScreen.contactActionSheetCallActionButtonText', { phone: store.getAttribute('phone') })}</Text>
                            </TouchableOpacity>
                        )}
                        {store.isAttributeFilled('email') && (
                            <View style={tailwind('flex flex-row items-center p-4 rounded-md mb-4 bg-gray-100')}>
                                <Text style={tailwind('text-base font-semibold')}>{translate('Network.StoreScreen.contactActionSheetEmailActionButtonText', { email: store.getAttribute('email') })}</Text>
                            </View>
                        )}
                        {store.isAttributeFilled('facebook') && (
                            <View style={tailwind('flex flex-row items-center p-4 rounded-md mb-4 bg-gray-100')}>
                                <Text style={tailwind('text-base font-semibold')}>{translate('Network.StoreScreen.contactActionSheetFacebookActionButtonText')}</Text>
                            </View>
                        )}
                        {store.isAttributeFilled('instagram') && (
                            <View style={tailwind('flex flex-row items-center p-4 rounded-md mb-4 bg-gray-100')}>
                                <Text style={tailwind('text-base font-semibold')}>{translate('Network.StoreScreen.contactActionSheetInstagramActionButtonText')}</Text>
                            </View>
                        )}
                        {store.isAttributeFilled('twitter') && (
                            <View style={tailwind('flex flex-row items-center p-4 rounded-md mb-4 bg-gray-100')}>
                                <Text style={tailwind('text-base font-semibold')}>{translate('Network.StoreScreen.contactActionSheetTwitterActionButtonText')}</Text>
                            </View>
                        )}
                    </View>
                    <View style={tailwind('w-full h-40')}></View>
                </ScrollView>
            </View>
        </ActionSheet>
    );

    // get categories
    useEffect(() => {
        loadCategories();
    }, [isMounted]);

    return (
        <ImageBackground source={{ uri: store.getAttribute('backdrop_url') }} style={tailwind('bg-white h-full')} imageStyle={tailwind('bg-cover')}>
            <View style={tailwind('bg-gray-900 bg-opacity-50')}>
                <NetworkHeader
                    style={tailwind('absolute top-0 w-full bg-gray-900 bg-opacity-25 z-20')}
                    wrapperStyle={[tailwind('border-b-0 pb-2')]}
                    backButtonStyle={tailwind('bg-opacity-50 bg-gray-900')}
                    backButtonIconStyle={tailwind('text-gray-50')}
                    logoStyle={tailwind('text-white')}
                    info={info}
                    onBack={() => navigation.goBack()}
                    hideSearch={true}
                    {...config('ui.network.storeScreen.networkHeaderProps')}
                />
                <ScrollView
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadCategories(true)} />}
                >
                    <StoreHeader store={store} wrapperStyle={tailwind('bg-transparent pt-28')} />
                    {shouldDisplayLoader && (
                        <View style={tailwind('py-6 w-full flex flex-row items-center justify-center bg-white')}>
                            <ActivityIndicator />
                            <Text style={tailwind('ml-3 text-gray-500')}>{translate('terms.loading')}</Text>
                        </View>
                    )}
                    <View style={tailwind('w-full h-full min-h-80 bg-white')}>
                        {categories
                            .filter((category) => category.getAttribute('products.length') > 0)
                            .map((category) => (
                                <View key={category.id}>
                                    <View style={tailwind('w-full px-4 py-4')}>
                                        <Text style={tailwind('font-bold text-base')}>{translate(category, 'name')}</Text>
                                    </View>
                                    <View style={tailwind('flex flex-row')}>
                                        {category
                                            .getAttribute('products')
                                            .map((product) => new Product(product, StorefrontAdapter))
                                            .map((product, index) => (
                                                <ProductCard key={index} product={product} containerStyle={tailwind('w-1/2')} onPress={() => navigation.navigate('ProductScreen', { attributes: product.serialize(), store: data })} />
                                            ))}
                                    </View>
                                </View>
                            ))}
                    </View>
                    <View style={tailwind('w-full h-80')}></View>
                </ScrollView>
                <ContactActionSheet />
            </View>
        </ImageBackground>
    );
};

export default StoreScreen;
