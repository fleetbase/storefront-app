import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, RefreshControl, View, Text, TextInput, Image, ImageBackground, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Collection } from '@fleetbase/sdk';
import { Store, Category } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import { config, translate, getCurrentLocation } from 'utils';
import { useMountedState, useLocale, useStorage } from 'hooks';
import FastImage from 'react-native-fast-image';
import NetworkHeader from 'ui/headers/NetworkHeader';
import NetworkCategoryBlock from 'ui/NetworkCategoryBlock';
import ExploreBar from 'ui/ExploreBar';
import StoreCard from 'ui/StoreCard';
import StoreMap from 'ui/StoreMap';
import tailwind from 'tailwind';

const ExploreScreen = ({ navigation, route }) => {
    const { info } = route.params;

    const isMounted = useMountedState();
    const isReviewsEnabled = info?.options?.reviews_enabled === true;

    const [stores, setStores] = useResourceCollection('network_stores', Store, StorefrontAdapter, new Collection());
    const [networkCategories, setNetworkCategories] = useResourceCollection('category', Category, StorefrontAdapter, new Collection());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isQuerying, setIsQuerying] = useState(false);
    // const [isMapView, setIsMapView] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [locationsQuery, setLocationsQuery] = useState(null);
    const [params, setParams] = useState({});
    // const [filters, setFilters] = useState([]);
    const [filters, setFilters] = useStorage('network_tags', []);
    const [tagged, setTagged] = useState([]);
    const [locale, setLocale] = useLocale();

    const transitionToProduct = (product, close, timeout = 300) => {
        if (typeof close === 'function') {
            close();
        }

        setTimeout(() => {
            navigation.navigate('ProductScreen', { attributes: product.serialize() });
        }, timeout);
    };

    const transitionToCategory = (category, actionSheet) => {
        navigation.navigate('NetworkCategoryScreen', { data: category.serialize() });
        actionSheet?.setModalVisible(false);
    };

    const transitionToStore = (store, storeLocation) => {
        if (typeof store?.getAttribute === 'function' && !store?.getAttribute('online')) {
            return;
        }

        if (store?.online === false) {
            return;
        }

        // close map view if applicable
        // setIsMapView(false);

        const data = typeof store?.serialize === 'function' ? store.serialize() : store;

        navigation.navigate('StoreScreen', { data, location: storeLocation?.serialize() ?? storeLocation });
    };

    const setParam = (key, value) => {
        const _params = Object.assign({}, params);
        _params[key] = value;

        // for nearby sort send the current location of user
        if (_params?.sort === 'nearest') {
            _params.location = userLocation?.coordinates?.join(',');
        } else {
            delete _params.location;
        }

        if (key === 'tagged') {
            setTagged(value);
        }

        setParams(_params);
        setIsQuerying(true);

        NetworkInfoService.getStores(_params)
            .then(setStores)
            .finally(() => setIsQuerying(false));
    };

    const refresh = () => {
        setIsRefreshing(true);

        NetworkInfoService.getStores(params)
            .then(setStores)
            .finally(() => {
                setIsRefreshing(false);
            });
    };

    useEffect(() => {
        // Load all stores from netwrk
        NetworkInfoService.getStores(params).then(setStores);

        // Load tags from network
        NetworkInfoService.getTags(params).then(setFilters);

        // Set user location to state
        getCurrentLocation().then(setUserLocation);
    }, [isMounted]);

    return (
        <View style={tailwind('bg-white')}>
            <NetworkHeader info={info} onSearchResultPress={transitionToProduct} onCategoryPress={transitionToCategory} />
            <ScrollView
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
                stickyHeaderIndices={[1]}
                style={tailwind('w-full h-full')}
            >
                <View style={tailwind('py-2 px-4')}>
                    <NetworkCategoryBlock
                        containerStyle={tailwind('mb-2 p-2')}
                        onCategoriesLoaded={setNetworkCategories}
                        onPress={transitionToCategory}
                        {...config('ui.network.exploreScreen.defaultCategoryComponentProps')}
                    />
                </View>
                <ExploreBar
                    filterOptions={filters}
                    onSort={(sort) => setParam('sort', sort)}
                    onFilter={(filters) => setParam('tagged', filters)}
                    tagged={tagged}
                    onToggleMap={() => navigation.navigate('MapScreen', { selectedTags: tagged, defaultUserLocation: userLocation })}
                    isLoading={isQuerying}
                    containerStyle={tailwind('bg-white')}
                />
                {stores.map((store) => (
                    <StoreCard key={store.id} store={store} onPress={() => transitionToStore(store)} isReviewsEnabled={isReviewsEnabled} />
                ))}
                <View style={tailwind('h-44 w-full')} />
            </ScrollView>

            {/* <Modal animationType="slide" transparent={true} visible={isMapView} onRequestClose={() => setIsMapView(false)}>
                <View style={tailwind('bg-white w-full h-full')}>
                    <NetworkHeader info={info} hideSearch={true} hideCategoryPicker={true}>
                        <ExploreBar
                            filterOptions={filters}
                            onFilter={(selected) => setParam('tagged', selected)}
                            tagged={tagged}
                            hideMapButon={true}
                            hideSortButton={true}
                            isLoading={isQuerying}
                            containerStyle={tailwind('border-b-0 h-auto py-0 px-0')}
                        />
                        <View style={tailwind('relative overflow-hidden flex-1 pr-3')}>
                            <View style={tailwind('absolute top-0 bottom-0 left-0 h-full flex items-center justify-center z-10')}>
                                <FontAwesomeIcon icon={faSearch} style={[tailwind('text-gray-800 ml-3')]} />
                            </View>
                            <TextInput
                                value={locationsQuery}
                                style={tailwind('bg-gray-100 rounded-md pl-10 pr-2 h-10 flex-1')}
                                placeholder={translate('Network.ExploreScreen.searchPlaces')}
                                onChangeText={setLocationsQuery}
                                autoComplete={'off'}
                                autoCapitalize={'none'}
                            />
                        </View>
                        <View>
                            <TouchableOpacity onPress={() => setIsMapView(false)}>
                                <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </NetworkHeader>
                    <StoreMap query={locationsQuery} location={userLocation} filters={tagged} onPressStore={(store, storeLocation) => transitionToStore(store, storeLocation)} />
                </View>
            </Modal> */}
        </View>
    );
};

export default ExploreScreen;
