import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Space to leave at the top of a screen for the status bar. An iOS modal (page sheet)
 * already starts below the status bar, so it needs none; everywhere else it is the
 * safe-area top inset.
 */
export function screenTopInset(insetTop: number, presentedAsModal: boolean, os: string = Platform.OS): number {
    return os === 'ios' && presentedAsModal ? 0 : insetTop;
}

export default function useScreenTopInset(presentedAsModal: boolean): number {
    const insets = useSafeAreaInsets();
    return screenTopInset(insets.top, presentedAsModal);
}
