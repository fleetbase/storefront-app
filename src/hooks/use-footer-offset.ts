import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * How far a sticky footer sits from the bottom of the screen. Both editions use the
 * same tab bar, which takes its own space below the screen, so footers in a tab sit
 * directly on it. Modals have no tab bar, only the home indicator.
 */
export default function useFooterOffset(isModal = false): number {
    const insets = useSafeAreaInsets();
    return isModal ? insets.bottom : 0;
}
