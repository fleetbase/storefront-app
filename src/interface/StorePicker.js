import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faInfoCircle, faStar } from '@fortawesome/free-solid-svg-icons';
import { EventRegister } from 'react-native-event-listeners';
import { haversine, isResource } from 'utils';
import { useResourceStorage, useResourceCollection, get, set } from 'utils/Storage';
import { getCoordinates, getDistance } from 'utils/Geo';
import { formatKm } from 'utils/Format';
import { useMountedState } from 'hooks';
import { adapter as FleetbaseAdapter } from 'hooks/use-fleetbase';
import { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { Place, GoogleAddress, Collection } from '@fleetbase/sdk';
import { Store, StoreLocation } from '@fleetbase/storefront';
import tailwind from 'tailwind';

const { addEventListener, removeEventListener } = EventRegister;
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
    } = props;
    const buttonIcon = props?.buttonIcon ?? faInfoCircle;

    const [deliverTo, setDeliverTo] = useResourceStorage('deliver_to', Place, FleetbaseAdapter);
    const [storeLocation, setStoreLocation] = useResourceStorage(`${info.id}_store_location`, StoreLocation, StorefrontAdapter);
    const [storeLocations, setStoreLocations] = useResourceCollection(`${info.id}_store_locations`, StoreLocation, StorefrontAdapter, new Collection());
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const isMounted = useMountedState();

    const store = new Store(info, StorefrontAdapter);
    const insets = useSafeAreaInsets();
    const useAddressTitle = displayAddressForTitle && storeLocation?.id;

    const loadLocations = () => {
        if (typeof store?.getLocations !== 'function') {
            return;
        }

        return store
            .getLocations()
            .then((locations) => {
                if (!isMounted()) {
                    return;
                }

                setStoreLocations(locations);
                selectStoreLocation(locations);

                if (typeof onLoaded === 'function') {
                    onLoaded(locations);
                }
            })
            .catch((error) => {
                console.log('[Error fetching store locations]', error);
            });
    };

    const selectStoreLocation = (selectedStoreLocation) => {
        if (!storeLocation?.getAttribute('place') && isArray(selectedStoreLocation)) {
            const defaultStoreLocation = selectedStoreLocation.first;

            if (defaultStoreLocation) {
                setStoreLocation(defaultStoreLocation);
                sendStoreLocation(defaultStoreLocation);
            }

            return;
        }

        if (!storeLocation?.getAttribute('place') && selectedStoreLocation === undefined) {
            const defaultStoreLocation = storeLocations.first;

            if (defaultStoreLocation) {
                setStoreLocation(defaultStoreLocation);
                sendStoreLocation(defaultStoreLocation);
            }

            return;
        }

        if (selectedStoreLocation instanceof StoreLocation) {
            setStoreLocation(selectedStoreLocation);
            sendStoreLocation(selectedStoreLocation);
        }
    };

    const sendStoreLocation = (storeLocation) => {
        if (typeof onStoreLocationSelected === 'function') {
            onStoreLocationSelected(storeLocation);
        }
    };

    const isCurrentStoreLocation = (idxStoreLocation) => idxStoreLocation.id === storeLocation?.id;

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

    useEffect(() => {
        loadLocations(true);
    }, [isMounted]);

    return (
        <View style={[wrapperStyle]}>
            <TouchableOpacity onPress={() => setIsDialogOpen(true)}>
                <View style={[tailwind('flex flex-row items-center rounded-full bg-gray-900 px-3 py-2'), buttonStyle]}>
                    <FontAwesomeIcon icon={buttonIcon} size={buttonIconSize} style={[tailwind('text-white mr-2'), buttonIconStyle]} />
                    <View style={[buttonTitleWrapperStyle]}>
                        {useAddressTitle && (
                            <View style={[props.addressContainerStyle]}>
                                <Text style={[tailwind('font-semibold uppercase'), props.addressTitleStyle]}>{storeLocation.getAttribute('name')}</Text>
                                <Text style={[tailwind('uppercase'), props.addressSubtitleStyle]}>{storeLocation.getAttribute('place.street1')}</Text>
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
                            {(storeLocations ?? []).map((storeLocation, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        selectStoreLocation(storeLocation);
                                        setIsSelecting(false);
                                    }}
                                >
                                    <View style={tailwind(`p-4 border-b border-gray-100`)}>
                                        <View style={tailwind('flex flex-row justify-between')}>
                                            <View style={tailwind('flex-1')}>
                                                <View style={tailwind('flex flex-row items-center')}>
                                                    {isCurrentStoreLocation(storeLocation) && (
                                                        <View style={tailwind('rounded-full bg-yellow-50 w-5 h-5 flex items-center justify-center mr-2')}>
                                                            <FontAwesomeIcon size={9} icon={faStar} style={tailwind('text-yellow-900')} />
                                                        </View>
                                                    )}
                                                    <View style={[props.addressRowContainerStyle]}>
                                                        <Text style={tailwind('font-semibold uppercase')}>{storeLocation.getAttribute('name')}</Text>
                                                        <Text style={tailwind('uppercase')}>{storeLocation.getAttribute('place.street1')}</Text>
                                                        <Text style={tailwind('uppercase')}>{storeLocation.getAttribute('place.postal_code')}</Text>
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
