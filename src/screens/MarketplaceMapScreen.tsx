import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Button, Image, Spinner, Text, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import { getDefaultCoordinates } from '../utils/location';
import MarketplaceStoreCard from '../components/MarketplaceStoreCard';
import { getMappableMarketplaceLocations, getMarketplaceLocationCoordinates } from '../utils/marketplace-runtime';

const MarketplaceMapScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { network } = useStorefrontRuntime();
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [retryCounter, setRetryCounter] = useState(0);
    const mapRef = useRef<any>(null);
    const listRef = useRef<FlatList>(null);
    const { latitude, longitude } = getDefaultCoordinates();

    useEffect(() => {
        let active = true;
        if (!network) return;
        setLoading(true);
        setError(null);
        network
            .getStoreLocations({ with_store: true, limit: 100 })
            .then((result: any) => {
                if (!active) return;
                const validLocations = getMappableMarketplaceLocations(Array.from(result || []));
                setLocations(validLocations);
                if (validLocations.length) setSelectedId(validLocations[0].id);
            })
            .catch((loadError: any) => active && setError(loadError))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [network, retryCounter]);

    const selectLocation = (location: any, index: number) => {
        const coordinates = getMarketplaceLocationCoordinates(location);
        setSelectedId(location.id);
        listRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0.5 });
        mapRef.current?.animateToRegion?.({ ...coordinates, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 350);
    };
    const openStore = (location: any) => {
        const storeData = location?.storeData || location?.getAttribute?.('store_data') || location?.getAttribute?.('store');
        if (storeData && typeof storeData === 'object') navigation.navigate('MarketplaceStore', { store: storeData, storeId: storeData.id, location: location.serialize() });
    };

    return (
        <YStack flex={1} bg='$background' pt={insets.top}>
            <YStack flex={1} minHeight={280}>
                <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={{ latitude, longitude, latitudeDelta: 0.2, longitudeDelta: 0.2 }}>
                    {locations.map((location: any, index) => {
                        const store = location.getAttribute('store_data') || {};
                        const coordinates = getMarketplaceLocationCoordinates(location);
                        return (
                            <Marker key={location.id} coordinate={coordinates} onPress={() => selectLocation(location, index)}>
                                <YStack borderWidth={selectedId === location.id ? 3 : 1} borderColor='$primary' borderRadius='$3' bg='$surface' p='$1'>
                                    <Image source={{ uri: store.logo_url }} width={42} height={42} borderRadius='$2' />
                                </YStack>
                            </Marker>
                        );
                    })}
                </MapView>
                <Button position='absolute' top='$3' right='$3' bg='$surface' onPress={() => navigation.navigate('LocationPermission')}>
                    {t('Marketplace.useMyLocation')}
                </Button>
            </YStack>
            <YStack height={220} borderTopWidth={1} borderColor='$borderColor' bg='$background'>
                {loading ? (
                    <Spinner m='$6' />
                ) : error ? (
                    <YStack p='$5' alignItems='center' gap='$3'><Text>{t('Marketplace.mapError')}</Text><Button onPress={() => setRetryCounter((value) => value + 1)}>{t('common.retry')}</Button></YStack>
                ) : !locations.length ? (
                    <YStack p='$5' alignItems='center'><Text color='$textSecondary'>{t('Marketplace.noMapLocations')}</Text></YStack>
                ) : (
                    <FlatList
                        ref={listRef}
                        horizontal
                        data={locations}
                        keyExtractor={(item: any) => item.id}
                        contentContainerStyle={styles.locationList}
                        getItemLayout={(_item, index) => ({ length: 292, offset: 292 * index, index })}
                        renderItem={({ item }) => {
                            const storeData = item.storeData || item.getAttribute('store_data') || item.getAttribute('store');
                            if (!storeData) return null;
                            const merchant = { getAttribute: (key: string) => storeData[key], id: storeData.id, serialize: () => storeData };
                            return <YStack width={280}><MarketplaceStoreCard compact store={merchant} onPress={() => openStore(item)} /></YStack>;
                        }}
                    />
                )}
            </YStack>
        </YStack>
    );
};

export default MarketplaceMapScreen;

const styles = StyleSheet.create({
    locationList: { padding: 12, gap: 12 },
});
