import { EventRegister } from 'react-native-event-listeners';
import { Place } from '@fleetbase/sdk';
import { get, set, storage, useMMKVStorage } from 'utils/Storage';
import useFleetbase from './use-fleetbase';

const { emit } = EventRegister;

const useDeliveryLocation = () => {
    const [value, setValue] = useMMKVStorage('deliver_to', storage);
    const fleetbase = useFleetbase();

    const setDeliveryLocation = (location) => {
        if (typeof location?.serialize === 'function') {
            emit('location.updated', location);
            emit('location.changed', location);

            return setValue(location.serialize());
        }

        setValue(location);
    };

    if (value) {
        return [new Place(value, fleetbase.getAdapter()), setDeliveryLocation];
    }

    return [value, setDeliveryLocation];
};

export default useDeliveryLocation;
