import Config from 'react-native-config';

const hasRequiredKeys = () => {
    return ('FLEETBASE_KEY' in Config) && ('STOREFRONT_KEY' in Config);
};

export default hasRequiredKeys;