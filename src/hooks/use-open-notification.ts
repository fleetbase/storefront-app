import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import type { NotificationTarget } from '../commerce/notifications';

/** Store-edition equivalents of the Network routes a notification can point to. */
const STORE_ROUTES: Record<string, { route: string; params?: (params: Record<string, any>) => Record<string, any> }> = {
    NetworkStore: { route: 'StoreHome' },
    NetworkCategory: { route: 'StoreCategory', params: (params) => ({ categoryId: params.categoryId }) },
};

/**
 * Opens a notification's target: an order (or its chat) in the cart tab, an offer, store,
 * product or category in the home tab, or an external link.
 */
export default function useOpenNotification() {
    const navigation = useNavigation<any>();
    const { mode } = useStorefrontRuntime();
    const isNetwork = mode === 'network';

    return useCallback(
        (target: NotificationTarget) => {
            if (!target) return false;
            if ('url' in target) {
                Linking.openURL(target.url).catch(() => {});
                return true;
            }
            const { route, params } = target;
            if (route === 'Order' || route === 'OrderChat') {
                navigation.navigate(isNetwork ? 'NetworkCartTab' : 'StoreCartTab', { screen: route, params, initial: false });
                return true;
            }
            if (isNetwork) {
                navigation.navigate('NetworkHomeTab', { screen: route, params, initial: false });
                return true;
            }
            const storeRoute = STORE_ROUTES[route];
            navigation.navigate('StoreHomeTab', { screen: storeRoute?.route ?? route, params: storeRoute?.params ? storeRoute.params(params) : params, initial: false });
            return true;
        },
        [isNetwork, navigation]
    );
}
