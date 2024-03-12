import { Collection } from '@fleetbase/sdk';
import { Category, Store, StoreLocation } from '@fleetbase/storefront';
import { useLocale, useMountedState, useStorage } from 'hooks';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { NetworkInfoService } from 'services';
import tailwind from 'tailwind';
import ExploreBar from 'ui/ExploreBar';
import NetworkCategoryBlock from 'ui/NetworkCategoryBlock';
import StoreCard from 'ui/StoreCard';
import NetworkHeader from 'ui/headers/NetworkHeader';
import { config, getCurrentLocation } from 'utils';
import { useResourceCollection } from 'utils/Storage';

const ExploreScreen = ({ navigation, route }) => {
    const { info } = route.params;

    const isMounted = useMountedState();
    const storefront = useStorefront();
    const isReviewsEnabled = info?.options?.reviews_enabled === true;

    const [stores, setStores] = useResourceCollection('network_stores', Store, StorefrontAdapter, new Collection());
    const [storeLocations, setStoreLocations] = useResourceCollection('network_store_locations', StoreLocation, StorefrontAdapter, new Collection());
    const [networkCategories, setNetworkCategories] = useResourceCollection('category', Category, StorefrontAdapter, new Collection());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isQuerying, setIsQuerying] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [locationsQuery, setLocationsQuery] = useState(null);
    const [params, setParams] = useState({ with: ['locations'] });
    const [filters, setFilters] = useStorage('network_tags', []);
    const [tagged, setTagged] = useState([]);
    const [locale, setLocale] = useLocale();

    const transitionToProduct = useCallback((product, close, timeout = 300) => {
        if (typeof close === 'function') {
            close();
        }

        setTimeout(() => {
            navigation.navigate('ProductScreen', { attributes: product.serialize() });
        }, timeout);
    });

    const transitionToCategory = useCallback((category, actionSheet) => {
        navigation.navigate('NetworkCategoryScreen', { data: category.serialize() });
        actionSheet?.setModalVisible(false);
    });

    const transitionToStore = useCallback((store, location = null) => {
        if (typeof store?.getAttribute === 'function' && !store?.getAttribute('online')) {
            return;
        }

        if (store?.online === false) {
            return;
        }

        const data = typeof store?.serialize === 'function' ? store.serialize() : store;

        if (typeof location?.serialize === 'function') {
            location = location.serialize();
        } else if (location === null && store.hasAttribute('locations')) {
            location = store.getAttribute('locations.0');
        }

        navigation.navigate('StoreScreen', { data, location });
    });

    const setParam = useCallback((key, value) => {
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
    });

    const refresh = useCallback(() => {
        setIsRefreshing(true);

        NetworkInfoService.getStores(params)
            .then(setStores)
            .finally(() => {
                setIsRefreshing(false);
            });
    });

    useEffect(() => {
        // Load all stores from netwrk
        NetworkInfoService.getStores(params).then(setStores);

        // Load tags from network
        NetworkInfoService.getTags().then(setFilters);

        // Set user location to state
        getCurrentLocation().then(setUserLocation);
    }, [isMounted]);

    return (
        <View style={tailwind('bg-white')}>
            <NetworkHeader info={info} onSearchResultPress={transitionToProduct} onCategoryPress={transitionToCategory} {...config('ui.network.exploreScreen.networkHeaderProps')} />
            <ScrollView
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
                stickyHeaderIndices={[1]}
                style={tailwind('w-full h-full')}>
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
                    scrollContainerStyle={tailwind('bg-white')}
                />
                {stores.map((store) => (
                    <StoreCard key={store.id} store={store} onPress={() => transitionToStore(store)} isReviewsEnabled={isReviewsEnabled} />
                ))}
                <View style={tailwind('h-44 w-full')} />
            </ScrollView>
        </View>
    );
};

export default ExploreScreen;
