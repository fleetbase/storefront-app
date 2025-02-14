import { toast as reactNativeToast, ToastPosition as ReactNativeToastPosition } from '@backpackapp-io/react-native-toast';
import { getTheme } from './index';

export const ToastPosition = ReactNativeToastPosition;

export function getDefaultStyle() {
    return {
        view: {
            backgroundColor: getTheme('background'),
            borderWidth: 1,
            borderColor: getTheme('borderColorWithShadow'),
            borderRadius: 7,
        },
        text: { color: getTheme('textPrimary') },
    };
}

export function getSuccessStyle() {
    return {
        view: {
            backgroundColor: getTheme('success'),
            borderWidth: 1,
            borderColor: getTheme('successBorder'),
            borderRadius: 7,
        },
        text: { color: getTheme('successText') },
        indicator: { backgroundColor: getTheme('successText') },
    };
}

export function getErrorStyle() {
    return {
        view: {
            backgroundColor: getTheme('error'),
            borderWidth: 1,
            borderColor: getTheme('errorBorder'),
            borderRadius: 7,
        },
        text: { color: getTheme('errorText') },
        indicator: { backgroundColor: getTheme('errorText') },
    };
}

export function getInfoStyle() {
    return {
        view: {
            backgroundColor: getTheme('info'),
            borderWidth: 1,
            borderColor: getTheme('infoBorder'),
            borderRadius: 7,
        },
        text: { color: getTheme('infoText') },
        indicator: { backgroundColor: getTheme('infoText') },
    };
}

export function getWarningStyle() {
    return {
        view: {
            backgroundColor: getTheme('warning'),
            borderWidth: 1,
            borderColor: getTheme('warningBorder'),
            borderRadius: 7,
        },
        text: { color: getTheme('warningText') },
        indicator: { backgroundColor: getTheme('warningText') },
    };
}

export function createToast(message, options = {}) {
    reactNativeToast(message, {
        ...options,
        position: ToastPosition.BOTTOM,
    });
}

export function success(message, options = {}) {
    reactNativeToast.success(message, {
        ...options,
        position: ToastPosition.BOTTOM,
        styles: getSuccessStyle(),
    });
}

export function info(message, options = {}) {
    reactNativeToast.info(message, {
        ...options,
        position: ToastPosition.BOTTOM,
        styles: getInfoStyle(),
    });
}

export function warning(message, options = {}) {
    reactNativeToast.warning(message, {
        ...options,
        position: ToastPosition.BOTTOM,
        styles: getWarningStyle(),
    });
}

export function error(message, options = {}) {
    reactNativeToast.error(message, {
        ...options,
        position: ToastPosition.BOTTOM,
        styles: getErrorStyle(),
    });
}

export const toast = {
    success,
    info,
    warning,
    error,
    create: createToast,
};
