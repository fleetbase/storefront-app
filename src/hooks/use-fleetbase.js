import Fleetbase from '@fleetbase/sdk';
import config from 'config';

const { FLEETBASE_KEY, FLEETBASE_HOST } = config;
let fleetbase, adapter;

try {
    fleetbase = new Fleetbase(FLEETBASE_KEY, { host: FLEETBASE_HOST });
    adapter = fleetbase.getAdapter();
} catch (error) {
    fleetbase = error;
}

const useFleetbase = () => {
    return fleetbase;
};

export default useFleetbase;
export { adapter };
