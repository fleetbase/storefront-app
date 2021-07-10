import Fleetbase from '@fleetbase/sdk';
import Config from 'react-native-config';

const { FLEETBASE_KEY } = Config;
let fleetbase, adapter;

try {
    fleetbase = new Fleetbase(FLEETBASE_KEY, { host: 'https://v2api.fleetbase.engineering' });
    adapter = fleetbase.getAdapter();
} catch (error) {
    // console.log(error);
}

const useFleetbaseSdk = () => {
    return fleetbase;
};

export default useFleetbaseSdk;

export { adapter };
