import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, RefreshControl, View, Text, TextInput, Image, ImageBackground, TouchableOpacity, Modal } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Collection } from '@fleetbase/sdk';
import { StoreLocation } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import { config, translate, getCurrentLocation, getLocation, logError } from 'utils';
import { useMountedState, useLocale } from 'hooks';
import FastImage from 'react-native-fast-image';
import NetworkHeader from 'ui/headers/NetworkHeader';
import NetworkCategoryBlock from 'ui/NetworkCategoryBlock';
import ExploreBar from 'ui/ExploreBar';
import StoreCard from 'ui/StoreCard';
import StoreMap from 'ui/StoreMap';
import tailwind from 'tailwind';

const MapScreen = ({ navigation, route }) => {
    const { info, selectedTags, defaultUserLocation } = route.params;

    const isMounted = useMountedState();

    const [storeLocations, setStoreLocations] = useResourceCollection('network_store_locations', StoreLocation, StorefrontAdapter);
    const [isQuerying, setIsQuerying] = useState(false);
    const [userLocation, setUserLocation] = useState(defaultUserLocation ?? getLocation());
    const [query, setQuery] = useState(null);
    const [filters, setFilters] = useState([]);
    const [tagged, setTagged] = useState(selectedTags ?? []);
    const [locale, setLocale] = useLocale();
    const [params, setParams] = useState({
        location: userLocation?.coordinates?.join(','),
        with_store: true,
        tagged: filters,
        query,
    });

    const transitionToStore = (store, storeLocation) => {
        if (typeof store?.getAttribute === 'function' && !store?.getAttribute('online')) {
            return;
        }

        if (store?.online === false) {
            return;
        }

        const data = typeof store?.serialize === 'function' ? store.serialize() : store;

        navigation.navigate('StoreScreen', { data, location: storeLocation?.serialize() ?? storeLocation, backButtonIcon: faTimes });
    };

    const setParam = (key, value) => {
        const _params = Object.assign({}, params);
        _params[key] = value;

        if (key === 'tagged') {
            setTagged(value);
        }

        setParams(_params);
        setIsQuerying(true);

        NetworkInfoService.getStoreLocations(_params)
            .then(setStoreLocations)
            .catch(logError)
            .finally(() => setIsQuerying(false));
    };

    useEffect(() => {
        // Load store locations from the network
        NetworkInfoService.getStoreLocations(params).then(setStoreLocations).catch(logError);

        // Load tags from network
        NetworkInfoService.getTags(params).then(setFilters).catch(logError);

        // Set user location to state
        getCurrentLocation().then(setUserLocation).catch(logError);
    }, [isMounted]);

    useEffect(() => {
        setParam('query', query);
    }, [query]);

    return (
        <View style={tailwind('bg-white h-full w-full')}>
            <NetworkHeader info={info} onBack={() => navigation.goBack()} backButtonIcon={faTimes} hideSearch={true} hideCategoryPicker={true} {...config('ui.network.mapScreen.networkHeaderProps')}>
                <ExploreBar
                    filterOptions={filters}
                    onFilter={(selected) => setParam('tagged', selected)}
                    tagged={tagged}
                    hideMapButon={true}
                    hideSortButton={true}
                    isLoading={isQuerying}
                    containerStyle={tailwind('border-b-0 h-auto py-0 px-0')}
                />
                <View style={tailwind('relative overflow-hidden flex-1')}>
                    <View style={tailwind('absolute top-0 bottom-0 left-0 h-full flex items-center justify-center z-10')}>
                        <FontAwesomeIcon icon={faSearch} style={[tailwind('text-gray-800 ml-3')]} />
                    </View>
                    <TextInput
                        value={query}
                        style={tailwind('bg-gray-100 rounded-md pl-10 pr-2 h-10 flex-1')}
                        placeholder={translate('Network.MapScreen.searchPlaces')}
                        onChangeText={setQuery}
                        autoComplete={'off'}
                        autoCapitalize={'none'}
                    />
                </View>
            </NetworkHeader>
            <StoreMap location={userLocation} locations={storeLocations} useLocationsProp={true} onPressStore={transitionToStore} />
        </View>
    );
};

export default MapScreen;
