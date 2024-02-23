import { Collection } from '@fleetbase/sdk';
import { Category, Product, Store, StoreLocation } from '@fleetbase/storefront';
import { faArrowLeft, faArrowRight, faExternalLinkAlt, faImages, faMapMarkedAlt, faMapMarkerAlt, faPhone, faShare, faStar, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useLocale, useMountedState } from 'hooks';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import React, { createRef, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ImageBackground, Linking, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ActionSheet from 'react-native-actions-sheet';
import FastImage from 'react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Share from 'react-native-share';
import tailwind from 'tailwind';
import ProductCard from 'ui/ProductCard';
import Rating from 'ui/Rating';
import StoreCategoryPicker from 'ui/StoreCategoryPicker';
import StorePicker from 'ui/StorePicker';
import StoreSearch from 'ui/StoreSearch';
import NetworkHeader from 'ui/headers/NetworkHeader';
import { StoreInfoWidget, StoreMapWidget, StorePhotosWidget, StoreRelatedWidget, StoreReviewsWidget } from 'ui/widgets';
import { config, logError, translate } from 'utils';
import { useResourceCollection, useResourceStorage } from 'utils/Storage';

const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 2;

const StoreScreen = ({ navigation, route }) => {
    let { info, data, location, backButtonIcon } = route.params;

    backButtonIcon = backButtonIcon ?? faArrowLeft;

    const storefront = useStorefront();
    const isMounted = useMountedState();
    const insets = useSafeAreaInsets();
    const store = new Store(data, StorefrontAdapter);
    const contactActionSheetRef = createRef();

    const [categories, setCategories] = useResourceCollection(`${store.id}_categories`, Category, StorefrontAdapter);
    const [storeLocation, setStoreLocation] = useResourceStorage(`${store.id}_store_location`, StoreLocation, StorefrontAdapter, location);
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

    // actions
    const isActionBarEnabled = config('app.storeScreenOptions.actionBarEnabled');
    const isReviewsEnabled = info?.options?.reviews_enabled === true && config('app.storeScreenOptions.reviewsEnabled');
    const isPhotosEnabled = config('app.storeScreenOptions.photosEnabled');
    const isMapEnabled = config('app.storeScreenOptions.mapEnabled');
    const isShareEnabled = config('app.storeScreenOptions.shareEnabled');
    const isSearchEnabled = config('app.storeScreenOptions.searchEnabled');
    const isBrowseEnabled = config('app.storeScreenOptions.browseEnabled') && categories?.length > 0;
    const isContactEnabled = config('app.storeScreenOptions.contactEnabled');
    const isWebsiteLinkEnabled = config('app.storeScreenOptions.websiteLinkEnabled');

    // widgets
    const isMapWidgetEnabled = isMapEnabled && config('app.storeScreenOptions.mapWidgetEnabled');
    const isInfoWidgetEnabled = config('app.storeScreenOptions.infoWidgetEnabled');
    const isRelatedWidgetEnabled = config('app.storeScreenOptions.relatedWidgetEnabled');
    const isPhotosWidgetEnabled = isPhotosEnabled && config('app.storeScreenOptions.photosWidgetEnabled');
    const isReviewsWidgetEnabled = isReviewsEnabled && config('app.storeScreenOptions.reviewsWidgetEnabled');

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

    const transitionToCategory = useCallback((category, actionSheet) => {
        console.log('transitionToCategory', category, actionSheet);
        navigation.navigate('CategoryScreen', { attributes: category.serialize(), storeData: data });
        actionSheet?.hide();
    });

    const transitionToReviews = useCallback(() => {
        navigation.navigate('StoreReviewsScreen', { storeData: data });
    });

    const transitionToPhotos = useCallback((initialMedia = null) => {
        navigation.navigate('StorePhotosScreen', { storeData: data, initialMedia });
    });

    const transitionToProduct = useCallback((product, close, timeout = 300) => {
        if (typeof close === 'function') {
            close();
        }

        setTimeout(() => {
            navigation.navigate('ProductScreen', { attributes: product.serialize(), storeData: data });
        }, timeout);
    });

    const shareStore = useCallback(() => {
        Share.open({
            title: translate('Network.StoreScreen.shareStoreTitleText', { storeName: store.getAttribute('name'), networkName: info.name }),
            subject: translate('Network.StoreScreen.shareStoreSubjectText', { storeName: store.getAttribute('name'), networkName: info.name }),
            message: translate('Network.StoreScreen.shareStoreMessageText', { storeName: store.getAttribute('name'), networkName: info.name }),
        });
    });

    const contactStore = useCallback(() => {
        contactActionSheetRef.current?.show();
    });

    const visitStoreWebsite = useCallback(() => {
        const url = store.getAttribute('website');

        Linking.canOpenURL(url).then((supported) => {
            if (supported) {
                Linking.openURL(url);
            } else {
                console.log(`Don't know how to open URI: ${url}`);
            }
        });
    });

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
                                <Text style={tailwind('text-gray-100')} numberOfLines={3}>
                                    {store.getAttribute('description') ?? translate('Network.StoreScreen.descriptionMissing')}
                                </Text>
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
                                defaultStoreLocation={storeLocation}
                                storeLocations={store.getAttribute('locations', [])}
                                onStoreLocationSelected={setStoreLocation}
                                buttonIconSize={22}
                            />
                        </View>
                    </View>
                </View>
            </View>
            <View>
                {storeLocation?.getAttribute('hours')?.length > 0 && !storeLocation?.isAlwaysOpen && (
                    <View style={tailwind('w-full bg-white flex flex-row flex-wrap items-center border-b border-gray-100')}>
                        <TouchableOpacity style={tailwind('p-4 w-full flex flex-row')} onPress={toggleHours}>
                            <Text style={tailwind('font-bold')}>{translate('Network.StoreScreen.displayHoursToggleText')}</Text>
                            {storeLocation?.today?.length > 0 && (
                                <View style={tailwind('ml-2 flex flex-row')}>
                                    <Text style={tailwind('font-bold text-gray-500')}>{translate('Network.StoreScreen.displayHoursTodayLabel')}: </Text>
                                    {storeLocation?.today?.length > 0 && <Text style={tailwind('font-bold text-gray-500')}>{storeLocation?.today[0].humanReadableHours}</Text>}
                                    {storeLocation?.today?.length == 0 && <Text style={tailwind('font-bold text-gray-500')}>{translate('Network.StoreScreen.closed')}</Text>}
                                </View>
                            )}
                        </TouchableOpacity>
                        {isHoursVisible && (
                            <View style={tailwind('px-4 pb-2 pt-4')}>
                                <View style={tailwind('flex flex-row flex-wrap')}>
                                    {weekdays.map((weekday) => (
                                        <View key={weekday} style={tailwind('w-1/2 mb-2')}>
                                            <Text style={tailwind('font-semibold mb-1')}>{translate(`Network.StoreScreen.weekday${weekday}`)}</Text>
                                            {storeLocation?.schedule[weekday].length > 0 &&
                                                storeLocation?.schedule[weekday].map((hour, hourIndex) => (
                                                    <View key={hourIndex} style={tailwind('mb-1')}>
                                                        <Text>{hour.humanReadableHours}</Text>
                                                    </View>
                                                ))}
                                            {storeLocation?.schedule[weekday].length === 0 && <Text>{translate('Network.StoreScreen.closed')}</Text>}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}
                {storeLocation?.getAttribute('hours')?.length > 0 && storeLocation?.isAlwaysOpen === true && (
                    <View style={tailwind('w-full bg-white flex flex-row flex-wrap items-center border-b border-gray-100')}>
                        <View style={tailwind('p-4 w-full flex flex-row')}>
                            <Text style={tailwind('font-bold text-green-600')}>Open 24 Hours</Text>
                        </View>
                    </View>
                )}
            </View>
            {isActionBarEnabled && (
                <View style={tailwind('w-full px-2 py-2 bg-white flex flex-row flex-wrap items-center border-b border-gray-100')}>
                    {isPhotosEnabled && (
                        <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                            <TouchableOpacity onPress={transitionToPhotos} style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}>
                                <FontAwesomeIcon icon={faImages} size={20} style={tailwind('text-gray-600 mb-2')} />
                                <Text style={tailwind('text-xs')} numberOfLines={1}>
                                    {translate('Network.StoreScreen.photosButtonText')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
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
                    {isMapEnabled && (
                        <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('StoreLocationScreen', { data: store.serialize(), locationData: storeLocation.serialize() })}
                                style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}>
                                <FontAwesomeIcon icon={faMapMarkedAlt} size={20} style={tailwind('text-gray-600 mb-2')} />
                                <Text style={tailwind('text-xs')} numberOfLines={1}>
                                    {translate('Network.StoreScreen.mapButtonText')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {isWebsiteLinkEnabled && store.isAttributeFilled('website') && (
                        <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                            <TouchableOpacity onPress={visitStoreWebsite} style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}>
                                <FontAwesomeIcon icon={faExternalLinkAlt} size={20} style={tailwind('text-gray-600 mb-2')} />
                                <Text style={tailwind('text-xs')} numberOfLines={1}>
                                    {translate('Network.StoreScreen.websiteButtonText')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {isContactEnabled && hasContactInformation && (
                        <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                            <TouchableOpacity onPress={contactStore} style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}>
                                <FontAwesomeIcon icon={faPhone} size={20} style={tailwind('text-gray-600 mb-2')} />
                                <Text style={tailwind('text-xs')} numberOfLines={1}>
                                    {translate('Network.StoreScreen.contactButtonText')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {isShareEnabled && (
                        <View style={tailwind('w-1/4 flex items-center justify-center py-2')}>
                            <TouchableOpacity onPress={shareStore} style={tailwind('rounded-md bg-gray-200 p-3 w-20 flex flex-col items-center justify-center')}>
                                <FontAwesomeIcon icon={faShare} size={20} style={tailwind('text-gray-600 mb-2')} />
                                <Text style={tailwind('text-xs')} numberOfLines={1}>
                                    {translate('Network.StoreScreen.shareButtonText')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {isSearchEnabled && (
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
                    )}
                    {isBrowseEnabled && (
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
                    )}
                </View>
            )}
        </View>
    );

    const ContactActionSheet = ({ dialogIconStyle }) => (
        <ActionSheet
            containerStyle={[{ height: dialogHeight }]}
            gestureEnabled={true}
            bounceOnOpen={true}
            nestedScrollEnabled={true}
            onMomentumScrollEnd={() => contactActionSheetRef.current?.handleChildScrollEnd()}
            ref={contactActionSheetRef}>
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
                                style={tailwind('flex flex-row items-center p-4 rounded-md mb-4 bg-gray-100')}>
                                <Text style={tailwind('text-base font-semibold')}>
                                    {translate('Network.StoreScreen.contactActionSheetCallActionButtonText', { phone: store.getAttribute('phone') })}
                                </Text>
                            </TouchableOpacity>
                        )}
                        {store.isAttributeFilled('email') && (
                            <View style={tailwind('flex flex-row items-center p-4 rounded-md mb-4 bg-gray-100')}>
                                <Text style={tailwind('text-base font-semibold')}>
                                    {translate('Network.StoreScreen.contactActionSheetEmailActionButtonText', { email: store.getAttribute('email') })}
                                </Text>
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
        <ImageBackground source={{ uri: store.getAttribute('backdrop_url') }} style={tailwind('bg-gray-100 h-full')} imageStyle={tailwind('bg-cover')}>
            <View style={tailwind('bg-gray-900 bg-opacity-50')}>
                <NetworkHeader
                    style={tailwind('absolute top-0 w-full bg-gray-900 bg-opacity-25 z-20')}
                    wrapperStyle={[tailwind('border-b-0 py-2')]}
                    backButtonIcon={backButtonIcon}
                    backButtonStyle={tailwind('bg-opacity-50 bg-gray-900')}
                    backButtonIconStyle={tailwind('text-gray-50')}
                    logoStyle={tailwind('text-white')}
                    info={info}
                    onBack={() => navigation.goBack()}
                    hideSearchBar={true}
                    {...config('ui.network.storeScreen.networkHeaderProps')}
                />
                <ScrollView
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadCategories(true)} />}>
                    <StoreHeader store={store} wrapperStyle={tailwind('bg-transparent pt-28')} />
                    <View style={tailwind('w-full h-full min-h-80 bg-gray-100')}>
                        {shouldDisplayLoader && (
                            <View style={tailwind('py-6 w-full flex flex-row items-center justify-center bg-white')}>
                                <ActivityIndicator />
                                <Text style={tailwind('ml-3 text-gray-500')}>{translate('terms.loading')}</Text>
                            </View>
                        )}
                        {isMapWidgetEnabled && (
                            <StoreMapWidget
                                wrapperStyle={tailwind('mb-2 mt-4')}
                                info={info}
                                store={store}
                                storeLocation={storeLocation}
                                onAddressPress={() => navigation.navigate('StoreLocationScreen', { data: store.serialize(), locationData: storeLocation.serialize() })}
                            />
                        )}
                        {isInfoWidgetEnabled && <StoreInfoWidget wrapperStyle={tailwind('my-2')} info={info} store={store} storeLocation={storeLocation} />}
                        {isPhotosWidgetEnabled && store.getAttribute('media', [])?.length > 0 && (
                            <StorePhotosWidget
                                wrapperStyle={tailwind('my-2')}
                                info={info}
                                store={store}
                                storeLocation={storeLocation}
                                onViewMorePress={() => navigation.navigate('StorePhotosScreen', { storeData: data })}
                                onMediaPress={(media) => transitionToPhotos(media)}
                            />
                        )}
                        {isReviewsWidgetEnabled && (
                            <StoreReviewsWidget
                                wrapperStyle={tailwind('my-2')}
                                info={info}
                                store={store}
                                listVisible={true}
                                storeLocation={storeLocation}
                                onStartReviewPress={() => navigation.navigate('WriteReviewScreen', { subjectData: store.serialize(), subjectType: 'store' })}
                            />
                        )}
                        {isRelatedWidgetEnabled && <StoreRelatedWidget wrapperStyle={tailwind('my-2')} info={info} store={store} storeLocation={storeLocation} />}
                        <View>
                            {categories
                                .filter((category) => category.getAttribute('products.length') > 0)
                                .map((category) => (
                                    <View key={category.id} style={tailwind('bg-white my-2')}>
                                        <TouchableOpacity onPress={() => transitionToCategory(category)} style={tailwind('px-4 py-2 flex flex-row items-center justify-between')}>
                                            <Text style={tailwind('font-bold text-lg text-black mb-2')}>{translate(category, 'name')}</Text>
                                            <View>
                                                <FontAwesomeIcon icon={faArrowRight} />
                                            </View>
                                        </TouchableOpacity>
                                        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={tailwind('flex flex-row px-2 py-2 w-full')}>
                                            {category
                                                .getAttribute('products')
                                                .map((product) => new Product(product, StorefrontAdapter))
                                                .map((product, index) => (
                                                    <ProductCard
                                                        key={index}
                                                        product={product}
                                                        containerStyle={tailwind('w-40')}
                                                        onPress={() =>
                                                            navigation.navigate('ProductScreen', {
                                                                attributes: product.serialize(),
                                                                store: data,
                                                                selectedStoreLocation: storeLocation?.serialize(),
                                                            })
                                                        }
                                                    />
                                                ))}
                                            <View style={tailwind('w-40 h-full')} />
                                        </ScrollView>
                                    </View>
                                ))}
                        </View>
                    </View>
                    <View style={tailwind('w-full h-80')}></View>
                </ScrollView>
                <ContactActionSheet />
            </View>
        </ImageBackground>
    );
};

export default StoreScreen;
