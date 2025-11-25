import { Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { routeWasAccessed } from '../utils';

/**
 * Custom hook to detect if the current screen is presented as a modal
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.modalRouteName - Optional route name to check in navigation history
 * @param {boolean} options.androidSupport - Whether to return true for Android (default: false)
 * @returns {boolean} - True if the screen is presented as a modal
 * 
 * @example
 * // Basic usage (checks params and route name)
 * const isModal = useIsModal();
 * 
 * @example
 * // Check if accessed from a specific modal route
 * const isModal = useIsModal({ modalRouteName: 'CartModal' });
 * 
 * @example
 * // Enable modal detection on Android
 * const isModal = useIsModal({ androidSupport: true });
 */
export function useIsModal(options = {}) {
    const route = useRoute();
    const navigation = useNavigation();
    const params = route.params ?? {};
    const routeName = route.name;
    const { modalRouteName, androidSupport = false } = options;
    
    // Platform check - by default, only iOS has distinct modal behavior
    const platformSupportsModals = androidSupport ? true : Platform.OS === 'ios';
    
    if (!platformSupportsModals) {
        return false;
    }
    
    // Method 1: Check explicit isModal parameter
    if (params.isModal !== undefined) {
        return params.isModal === true;
    }
    
    // Method 2: Check if route name ends with 'Modal'
    if (typeof routeName === 'string' && routeName.endsWith('Modal')) {
        return true;
    }
    
    // Method 3: Check navigation history for specific modal route
    if (modalRouteName && typeof modalRouteName === 'string') {
        return routeWasAccessed(navigation, modalRouteName);
    }
    
    // Default: not a modal
    return false;
}

export default useIsModal;
