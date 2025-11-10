import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/**
 * Safely retrieves the bottom tab bar height.
 *
 * This hook wraps `useBottomTabBarHeight()` to handle cases where the component
 * is rendered outside of a Bottom Tab Navigator context (e.g., in modals or
 * nested stack navigators). This prevents React Hook order violations.
 *
 * @returns {number} The tab bar height, or 0 if not in a tab navigator context
 */
export function useSafeTabBarHeight(): number {
    try {
        return useBottomTabBarHeight();
    } catch (error) {
        // Not in a bottom tab navigator context, return 0
        return 0;
    }
}

export default useSafeTabBarHeight;
