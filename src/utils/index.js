import Config from 'react-native-config';
import { Collection } from '@fleetbase/sdk';
import { lookup } from '@fleetbase/storefront';
import storage, { getString } from './storage';
import { adapter, instance as storefrontInstance } from '../hooks/use-storefront';
import { themes } from '../../tamagui.config';
import { pluralize } from 'inflected';

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

export function isEmpty(target) {
    if (isArray(target)) {
        return target.length === 0;
    }

    if (isObject(target)) {
        return Object.keys(target).length === 0;
    }

    return target === null || target === undefined;
}

export function isResource(target, type = null) {
    if (typeof type === 'string') {
        return hasResouceProperties(target) && target.resource === type;
    }

    return hasResouceProperties(target);
}

export function isSerializedResource(target) {
    return isObject(target) && hasProperties(target, ['id', 'created_at'], true);
}

export function isPojoResource(target) {
    return isObject(target) && hasProperties(target, ['adapter', 'resource', 'attributes'], true);
}

export function hasResouceProperties(target) {
    return isObject(target) && hasProperties(target, ['id', 'serialize', 'resource'], true);
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

export function restoreStorefrontInstance(data, type = null) {
    // If serialized resource object
    if (isSerializedResource(data) && type) {
        return lookup('resource', type, data, adapter);
    }

    // If POJO resource object
    if (isPojoResource(data)) {
        return lookup('resource', type ? type : data.resource, data.attributes, adapter);
    }

    // If array of resources
    if (isArray(data) && data.length) {
        const isCollectionData = data.every((_resource) => _resource && isObject(_resource.attributes));
        if (isCollectionData) {
            const collectionData = data.map(({ resource, attributes }) => lookup('resource', resource, attributes, adapter));
            return new Collection(collectionData);
        }
    }

    return data;
}

export async function loadPersistedResource(request, options = {}) {
    const { persistKey = null, type = null, defaultValue = null } = options;

    try {
        if (persistKey) {
            // Retrieve data using `getMultipleItems` for flexibility
            const results = await storage.getMultipleItems([persistKey], 'map');
            const dataPair = results.find((item) => item[0] === persistKey);

            if (dataPair && dataPair[1]) {
                console.log(`[loadPersistedResource] Found persisted data for key: ${persistKey}`);

                // Use `restoreStorefrontInstance` to process the data
                return restoreStorefrontInstance(dataPair[1], type) || defaultValue;
            }
        }

        // Fetch data from the request function if not found in storage
        console.log(`[loadPersistedResource] Fetching data from request for key: ${persistKey}`);
        const fetchedData = await request(storefrontInstance);

        // Optional: Save fetched data to storage for future use
        if (persistKey && fetchedData) {
            if (isArray(fetchedData)) {
                storage.setArray(persistKey, fetchedData);
            } else {
                storage.setMap(persistKey, fetchedData);
            }
        }

        return restoreStorefrontInstance(fetchedData, type) || defaultValue;
    } catch (error) {
        console.error('[loadPersistedResource] Error loading resource:', error);
        return defaultValue; // Ensure a fallback value
    }
}

export async function delay(ms = 300, callback = null) {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (typeof callback === 'function') {
                callback();
            }
            resolve(true);
        }, ms);
    });
}

export function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}
