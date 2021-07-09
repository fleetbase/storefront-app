import Fleetbase from '@fleetbase/sdk';
import Config from 'react-native-config';

const { FLEETBASE_API_KEY } = Config;

const fleetbase = new Fleetbase(FLEETBASE_API_KEY, { host: 'https://v2api.fleetbase.engineering' });
const adapter = fleetbase.getAdapter();

const useFleetbaseSdk = () => {
    return fleetbase;
};

export default useFleetbaseSdk;

export { adapter };
