import Config from 'react-native-config';
import { getString } from './storage';
import { themes } from '../../tamagui.config';

export function get(target, path, defaultValue = null) {
    let current = target;
    const type = typeof target;
    const isFunction = type === 'function';
    const pathType = typeof path;
    const pathIsString = pathType === 'string';
    const pathIsDotted = pathIsString && path.includes('.');
    const pathArray = pathIsDotted ? path.split('.') : [path];

    if (isArray(target) || isObject(target)) {
        for (let i = 0; i < pathArray.length; i++) {
            if (current && current[pathArray[i]] === undefined) {
                return null;
            } else if (current) {
                current = current[pathArray[i]];

                // if is resource then return get on it's attributes
                if (isResource(current) && pathArray[i + 1] !== undefined) {
                    const newPath = pathArray.slice(i + 1).join('.');

                    return get(current.attributes, newPath, defaultValue);
                }

                // resolve functions and continue
                if (typeof current === 'function') {
                    const newPath = pathArray.slice(i + 1).join('.');
                    return invokeAndGet(current, newPath, defaultValue);
                }
            }
        }

        return current === undefined ? defaultValue : current;
    }

    if (isFunction) {
        return HelperUtil.getResolved(object, path);
    }
}

export function isArray(target) {
    return Array.isArray(target);
}

export function isObject(target) {
    return target && typeof target === 'object' && Object.prototype.toString.call(target) === '[object Object]';
}

export function isResource(target, type = null) {
    if (typeof type === 'string') {
        return hasResouceProperties(target) && target.resource === type;
    }

    return hasResouceProperties(target);
}

export function hasResouceProperties(target) {
    return hasProperties(target, ['id', 'serialize', 'resource'], true);
}

export function isNone(target) {
    return target === null || target === undefined;
}

export function hasProperties(obj, keys, strict = false) {
    if (isNone(obj) || !isObject(obj) || !isArray(keys)) {
        return false;
    }

    return keys.every((key) => {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
        if (strict && (obj[key] === null || obj[key] === undefined)) {
            return false;
        }
        return true;
    });
}

export function invokeAndGet(callable, path, defaultValue = null) {
    const resolved = callable();
    return isArray(resolved) || isObject(resolved) ? get(resolved, path, defaultValue) : defaultValue;
}

export function config(key, defaultValue) {
    return get(Config, key, defaultValue);
}

export function uniqueArray(array) {
    return [...new Set(array)];
}

export function getTheme(key = null) {
    const themeName = getString('user_theme_preference');
    if (themeName) {
        const targetTheme = themes[themeName];
        if (targetTheme) {
            return key ? targetTheme[key] : targetTheme;
        }
    }
    return {};
}

export function defaults(object, defs) {
    let key;
    object = Object.assign({}, object);
    defs = defs || {};
    // Iterate over object non-prototype properties:
    for (key in defs) {
        if (Object.hasOwnProperty(defs, key)) {
            // Replace values with defaults only if undefined (allow empty/zero values):
            if (object[key] == null) {
                object[key] = defs[key];
            }
        }
    }
    return object;
}
