import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faInfoCircle, faStar } from '@fortawesome/free-solid-svg-icons';
import { EventRegister } from 'react-native-event-listeners';
import { haversine, isResource, logError } from 'utils';
import { useResourceStorage, useResourceCollection, get, set } from 'utils/Storage';
import { getCoordinates, getDistance } from 'utils/Geo';
import { formatKm } from 'utils/Format';
import { useMountedState } from 'hooks';
import { adapter as FleetbaseAdapter } from 'hooks/use-fleetbase';
import { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { Place, GoogleAddress, Collection } from '@fleetbase/sdk';
import { Store, StoreLocation } from '@fleetbase/storefront';
import tailwind from 'tailwind';

// const { addEventListener, removeEventListener } = EventRegister;
const { isArray } = Array;

const StorePicker = (props) => {
    const {
        info,
        wrapperStyle,
        buttonStyle,
        buttonIconStyle,
        buttonIconSize,
        buttonTitleWrapperStyle,
        buttonTitleStyle,
        buttonTitleMaxLines,
        displayAddressForTitle,
        onStoreLocationSelected,
        onLoaded,
        defaultStoreLocation,
        storeLocations,
    } = props;

    const store = new Store(info, StorefrontAdapter);
    const buttonIcon = props?.buttonIcon ?? faInfoCircle;
    const isMounted = useMountedState();
    const insets = useSafeAreaInsets();

    const [deliverTo, setDeliverTo] = useResourceStorage('deliver_to', Place, FleetbaseAdapter);
    const [_storeLocations, setStoreLocations] = useResourceCollection(`${info.id}_store_locations`, StoreLocation, StorefrontAdapter, new Collection(storeLocations));
    const [selectedStoreLocation, setSelectedStoreLocation] = useResourceStorage(`${info.id}_store_location`, StoreLocation, StorefrontAdapter, defaultStoreLocation);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const useAddressTitle = displayAddressForTitle && typeof selectedStoreLocation?.id === 'string' && selectedStoreLocation?.id.length > 1;

    const isCurrentStoreLocation = useCallback((storeLocation) => {
        return storeLocation.id === selectedStoreLocation?.id;
    });

    const selectStoreLocation = useCallback((selectedStoreLocation) => {
        if (selectedStoreLocation instanceof StoreLocation) {
            setSelectedStoreLocation(selectedStoreLocation);

            if (typeof onStoreLocationSelected === 'function') {
                onStoreLocationSelected(selectedStoreLocation);
            }
        }
    });

    const DialogHeader = ({ title, subtitle, icon, onCancel }) => (
        <View style={tailwind('px-5 py-2 flex flex-row items-center justify-between mb-2')}>
            <View style={tailwind('flex flex-row items-center')}>
                <FontAwesomeIcon icon={icon} style={tailwind('text-blue-400 mr-2')} />
                <View>
                    <Text style={tailwind('text-lg font-semibold')}>{title}</Text>
                    <Text style={tailwind('text-sm text-gray-700 font-semibold')}>{subtitle}</Text>
                </View>
            </View>

            <View>
                <TouchableOpacity onPress={onCancel}>
                    <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                        <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[wrapperStyle]}>
            <TouchableOpacity onPress={() => setIsDialogOpen(true)}>
                <View style={[tailwind('flex flex-row items-center rounded-full bg-gray-900 px-3 py-2'), buttonStyle]}>
                    <FontAwesomeIcon icon={buttonIcon} size={buttonIconSize} style={[tailwind('text-white mr-2'), buttonIconStyle]} />
                    <View style={[buttonTitleWrapperStyle]}>
                        {useAddressTitle && (
                            <View style={[props.addressContainerStyle]}>
                                <Text style={[tailwind('font-semibold uppercase'), props.addressTitleStyle]} numberOfLines={1}>
                                    {selectedStoreLocation.getAttribute('name')}
                                </Text>
                                {selectedStoreLocation.getAttribute('name') !== selectedStoreLocation.getAttribute('place.street1') && (
                                    <View>
                                        <Text style={[tailwind('uppercase'), props.addressSubtitleStyle]} numberOfLines={1}>
                                            {selectedStoreLocation.getAttribute('place.street1') ??
                                                selectedStoreLocation.getAttribute('place.city') ??
                                                selectedStoreLocation.getAttribute('place.district')}
                                        </Text>
                                        {selectedStoreLocation.hasAttribute('place.postal_code') && (
                                            <Text style={tailwind('uppercase')}>{selectedStoreLocation.getAttribute('place.postal_code')}</Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                        {!useAddressTitle && (
                            <Text style={[tailwind('text-white'), buttonTitleStyle]} numberOfLines={buttonTitleMaxLines ?? 1}>
                                {info.name}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            <Modal animationType={'slide'} transparent={true} visible={isDialogOpen} onRequestClose={() => setIsDialogOpen(false)}>
                <View style={[tailwind('w-full h-full bg-white'), { paddingTop: insets.top }]}>
                    <View>
                        <DialogHeader title={info.name} subtitle={'Location and Hours'} icon={faMapMarkerAlt} onCancel={() => setIsDialogOpen(false)} />
                        <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                            {_storeLocations.map((storeLocation, index) => (
                                <TouchableOpacity key={index} onPress={() => selectStoreLocation(storeLocation)}>
                                    <View style={tailwind(`p-4 border-b border-gray-100`)}>
                                        <View style={tailwind('flex flex-row justify-between')}>
                                            <View style={tailwind('flex-1 pr-10')}>
                                                <View style={tailwind('flex flex-row items-center')}>
                                                    {isCurrentStoreLocation(storeLocation) && (
                                                        <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-2')}>
                                                            <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                                        </View>
                                                    )}
                                                    <View style={[props.addressRowContainerStyle]}>
                                                        <Text style={tailwind('font-semibold uppercase')} numberOfLines={1}>
                                                            {storeLocation.getAttribute('name')}
                                                        </Text>
                                                        <Text style={tailwind('uppercase')}>
                                                            {storeLocation.getAttribute('place.street1') ??
                                                                storeLocation.getAttribute('place.city') ??
                                                                storeLocation.getAttribute('place.district')}
                                                        </Text>
                                                        {storeLocation.hasAttribute('place.postal_code') && (
                                                            <Text style={tailwind('uppercase')}>{storeLocation.getAttribute('place.postal_code')}</Text>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                            <View>{deliverTo && <Text>{formatKm(getDistance(storeLocation, deliverTo))}</Text>}</View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            <View style={tailwind('w-full h-44')}></View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default StorePicker;
