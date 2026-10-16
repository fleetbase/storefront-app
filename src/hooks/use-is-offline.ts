import { useNetInfo } from '@react-native-community/netinfo';

/**
 * Whether the device has lost its connection. Unknown (still checking) counts as online,
 * so nothing flashes at launch; a connected network without internet counts as offline.
 */
export default function useIsOffline(): boolean {
    const { isConnected, isInternetReachable } = useNetInfo();
    return isConnected === false || isInternetReachable === false;
}
