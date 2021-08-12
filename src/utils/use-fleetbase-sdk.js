import Fleetbase from '@fleetbase/sdk';
import Config from 'react-native-config';

const { FLEETBASE_KEY, FLEETBASE_HOST } = Config;
let fleetbase, adapter;

try {
    fleetbase = new Fleetbase(FLEETBASE_KEY, { host: FLEETBASE_HOST });
    adapter = fleetbase.getAdapter();
} catch (error) {
    // console.log(error);
}

const useFleetbaseSdk = () => {
    return fleetbase;
};

export default useFleetbaseSdk;

export { adapter };
