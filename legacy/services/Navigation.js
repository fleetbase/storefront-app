import { useNavigation } from '@react-navigation/native';
import { useFleetbase } from 'hooks';
import { get } from 'utils/Storage';

/**
 * Wrapper for performing navigation transitions to screnes
 * which require a netwrok request to get data to be sent
 * into the scene.
 *
 * @export
 * @class NavigationService
 */
export default class NavigationService {
    /**
     * Transitions to an order given the id.
     *
     * @static
     * @param {string}
     * @return {Promise}
     * @memberof CartService
     */
    static transitionToOrder(orderId) {
        const fleetbase = useFleetbase();
        const navigation = useNavigation();
        const info = get('info');

        return fleetbase.orders
            .findRecord(orderId)
            .then((order) => {
                navigation.navigate('StorefrontOrderScreen', { serializedOrder: order.serialize(), info });
            })
            .catch((error) => {
                console.log('[ Error fetching order record! ]', error);
            });
    }
}
