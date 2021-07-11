import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { get, set } from '../../utils/storage';
import { Place, GoogleAddress } from '@fleetbase/sdk';
import tailwind from '../../tailwind';

const LocationPicker = (props) => {
    const [ deliverTo, setDeliverTo ] = useState(null);

    const resolveDeliverTo = () => {
        const previouslySetDeliverTo = get('deliver_to');

        if (previouslySetDeliverTo) {
            setDeliverTo(new Place(previouslySetDeliverTo));
        }
    };

    if (!deliverTo) {
        const location = get('location');

        if (location) {
            const googleAddress = new GoogleAddress().setAttributes(location);
            const lastKnownPlace = Place.fromGoogleAddress(googleAddress);

            if (lastKnownPlace) {
                setDeliverTo(lastKnownPlace);
            }
        }
    }

    useEffect(() => {
        resolveDeliverTo();
    }, []);

    return (
        <View style={[(props.wrapperStyle || {})]}>
            <TouchableOpacity>
                <View style={[tailwind('flex flex-row items-center rounded-full bg-blue-50 flex items-center px-4 py-2'), (props.wrapperStyle || {})]}>
                    <Text style={tailwind('text-blue-900 font-semibold mr-1')}>Deliver to:</Text>
                    {deliverTo && (<Text style={tailwind('text-blue-900')}>{deliverTo.getAttribute('name') || deliverTo.getAttribute('street1')}</Text>)}
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default LocationPicker;
