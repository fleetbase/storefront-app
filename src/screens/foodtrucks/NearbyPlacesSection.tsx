import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStorefrontRuntime } from '../../contexts/StorefrontRuntimeContext';
import useFoodTrucks, { nearbyPlaces, zoneBorderOf, type NearbyPlace } from '../../hooks/use-food-trucks';
import { UIText } from '../../ui';
import PlaceIcon from './PlaceIcon';

/**
 * "In your area": the trucks serving the customer's zone and the stores in it, as rows
 * that open the truck's products or the store page. Shown by the search screens before
 * anything is typed; renders nothing for a storefront without food trucks.
 */
export function NearbyPlacesSection() {
    const navigation = useNavigation<any>();
    const theme = useTheme();
    const { t } = useLanguage();
    const { mode } = useStorefrontRuntime();
    const { trucks, stores, zone } = useFoodTrucks();
    const places = useMemo(() => nearbyPlaces(trucks, stores, zoneBorderOf(trucks, zone?.id), t('FoodTrucks.offline')), [stores, t, trucks, zone?.id]);

    if (!trucks?.length || !places.length) return null;

    const open = (place: NearbyPlace) => {
        if (place.truck) navigation.navigate('TruckMenu', { foodTruckId: place.truck.id, truck: place.truck.raw });
        else if (place.store) {
            if (mode === 'network') navigation.navigate('NetworkStore', { storeId: place.store.storeId });
            else navigation.navigate('StoreHomeTab', { screen: 'StoreHome', initial: false });
        }
    };

    return (
        <YStack>
            <UIText variant='subheading' accessibilityRole='header' style={{ paddingBottom: 4 }}>
                {zone?.name ? t('FoodTrucks.inYourAreaNamed', { zone: zone.name }) : t('FoodTrucks.inYourArea')}
            </UIText>
            {places.map((place) => {
                const kindLabel = place.kind === 'truck' ? t('FoodTrucks.kindTruck') : t('FoodTrucks.kindStore');
                return (
                    <Pressable
                        key={place.key}
                        onPress={() => open(place)}
                        accessibilityRole='button'
                        accessibilityLabel={[place.name, kindLabel, place.meta].filter(Boolean).join(', ')}
                        style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderColor: theme.borderColor.val,
                            opacity: pressed ? 0.85 : place.active ? 1 : 0.65,
                        })}
                    >
                        <PlaceIcon kind={place.kind} active={place.active} size={44} logoUrl={place.photoUrl} />
                        <YStack flex={1} minWidth={0} gap={2}>
                            <UIText variant='bodyStrong' numberOfLines={1}>
                                {place.name}
                            </UIText>
                            <UIText variant='caption' tone={place.active ? 'success' : 'secondary'} numberOfLines={1}>
                                {[kindLabel, place.meta].filter(Boolean).join(' · ')}
                            </UIText>
                        </YStack>
                        <FontAwesomeIcon icon={faChevronRight} size={13} color={theme.textSecondary.val} />
                    </Pressable>
                );
            })}
        </YStack>
    );
}

export default NearbyPlacesSection;
