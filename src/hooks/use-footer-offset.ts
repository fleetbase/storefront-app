import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeTabBarHeight } from './use-safe-tab-bar-height';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';

/**
 * How far a sticky footer sits from the bottom of the screen. The store edition's tab
 * bar floats over content, so footers clear it; the network tab bar takes its own space.
 * Modals have no tab bar, only the home indicator.
 */
export default function useFooterOffset(isModal = false): number {
    const insets = useSafeAreaInsets();
    const tabBarHeight = useSafeTabBarHeight();
    const { mode } = useStorefrontRuntime();
    if (isModal) return insets.bottom;
    return mode === 'network' ? 0 : tabBarHeight;
}
