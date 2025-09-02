import { Pressable } from 'react-native';
import { Text, YStack, XStack, Separator, useTheme } from 'tamagui';
import { formattedAddressFromPlace, formatAddressSecondaryIdentifier, restoreFleetbasePlace } from '../utils/location';
import PlaceMapView from './PlaceMapView';

const PlaceCard = ({ place, name, headerComponent, footerComponent, mapViewHeight = 90, mapViewWidth = 100, ...props }) => {
    const theme = useTheme();
    place = restoreFleetbasePlace(place);

    return (
        <YStack>
            <YStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' px='$4' py='$3' {...props}>
                {headerComponent}
                <XStack>
                    <YStack width={mapViewWidth} height={mapViewHeight}>
                        <PlaceMapView place={place} zoom={2} markerSize='xs' height={mapViewHeight} width={mapViewWidth} borderWidth={1} borderColor='$borderColor' />
                    </YStack>
                    <YStack flex={1} px='$3'>
                        <Text size={15} color='$textPrimary' fontWeight='bold' mb={2}>
                            {place.getAttribute('name', name)}
                        </Text>
                        <Text color='$textSecondary'>{formattedAddressFromPlace(place)}</Text>
                    </YStack>
                </XStack>
                {footerComponent}
            </YStack>
        </YStack>
    );
};

export default PlaceCard;
