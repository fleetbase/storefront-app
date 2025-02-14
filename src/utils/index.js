import Config from 'react-native-config';
import { Platform, ActionSheetIOS, Alert } from 'react-native';
import { Collection } from '@fleetbase/sdk';
import { lookup, FoodTruck } from '@fleetbase/storefront';
import storage, { getString } from './storage';
import { capitalize } from './format';
import { adapter, instance as storefrontInstance } from '../hooks/use-storefront';
import { themes } from '../../tamagui.config';
import { APP_THEME_KEY } from '../hooks/use-app-theme';
import { pluralize } from 'inflected';
import { countries } from 'countries-list';
import StorefrontConfig from '../../storefront.config';

export function storefrontConfig(key, defaultValue = null) {
    return get(StorefrontConfig, key, defaultValue);
}

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
                return defaultValue;
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

export function toArray(target, delimiter = ',') {
    if (isArray(target)) {
        return target;
    }

    if (typeof target === 'string') {
        return target.split(delimiter);
    }

    return Array.from(target);
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
    if (isObject(target) && typeof type === 'string') {
        return hasResouceProperties(target) && target.resource === type;
    }

    return isObject(target) && hasResouceProperties(target);
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
        if (!(key in obj)) {
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
    const themeName = getString(APP_THEME_KEY);
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

export function restoreSdkInstance(data, type = null) {
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
    const { persistKey = null, type = null, defaultValue = null, client = null } = options;

    try {
        if (persistKey) {
            // Retrieve data using `getMultipleItems` for flexibility
            const results = await storage.getMultipleItems([persistKey], 'map');
            const dataPair = results.find((item) => item[0] === persistKey);

            if (dataPair && dataPair[1]) {
                console.log(`[loadPersistedResource] Found persisted data for key: ${persistKey}`);

                // Use `restoreSdkInstance` to process the data
                return restoreSdkInstance(dataPair[1], type) || defaultValue;
            }
        }

        // Fetch data from the request function if not found in storage
        console.log(`[loadPersistedResource] Fetching data from request for key: ${persistKey}`);
        const fetchedData = await request(client ?? storefrontInstance);

        // Optional: Save fetched data to storage for future use
        if (persistKey && fetchedData) {
            if (isArray(fetchedData)) {
                storage.setArray(persistKey, fetchedData);
            } else {
                storage.setMap(persistKey, fetchedData);
            }
        }

        return restoreSdkInstance(fetchedData, type) || defaultValue;
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

export function later(callback = null, ms = 300) {
    return setTimeout(() => {
        if (typeof callback === 'function') {
            callback();
        }
    }, ms);
}

export function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

export function getCountryByPhoneCode(phoneCode) {
    const normalizedCode = String(phoneCode).replace('+', ''); // Ensure the code is a string and remove leading '+'

    for (const [countryCode, countryData] of Object.entries(countries)) {
        if (countryData.phone.includes(Number(normalizedCode))) {
            return {
                code: countryCode,
                phone: countryData.phone[0],
                ...countryData,
            };
        }
    }

    return null;
}

export function getCountryByISO2(iso2) {
    if (!iso2 || typeof iso2 !== 'string') {
        throw new Error('Invalid ISO2 country code. It must be a non-empty string.');
    }

    const normalizedCode = iso2.toUpperCase(); // Ensure the code is uppercase

    const countryData = countries[normalizedCode];
    if (countryData) {
        return {
            code: normalizedCode,
            phone: countryData.phone[0],
            ...countryData, // Full country data
        };
    }

    return null; // Return null if no country matches the code
}

export function parsePhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.startsWith('+')) {
        throw new Error('Invalid phone number format. It should start with a "+" sign.');
    }

    // Remove the "+" from the phone number
    const numericPhone = phoneNumber.slice(1);

    // Iterate through all countries to find a matching country code
    for (const [countryCode, countryData] of Object.entries(countries)) {
        for (const code of countryData.phone) {
            const codeString = String(code);
            if (numericPhone.startsWith(codeString)) {
                const localNumber = numericPhone.slice(codeString.length); // Extract the remaining phone number

                // Handle case for `1` defaulting to Canada 🤢
                if (codeString === '1') {
                    return { country: getCountryByISO2('US'), localNumber };
                }

                return {
                    country: {
                        code: countryCode, // Alpha-2 code (e.g., "SG" or "MN")
                        name: countryData.name,
                        phone: codeString,
                    },
                    localNumber,
                };
            }
        }
    }

    // Return null if no matching country code is found
    return null;
}

export function isValidPhoneNumber(phoneNumber) {
    // Ensure it's a string
    if (typeof phoneNumber !== 'string') {
        return false;
    }

    // Ensure it starts with a '+' followed by digits
    if (!phoneNumber.startsWith('+')) {
        return false;
    }

    // Remove spaces, dashes, and parentheses for further validation
    const cleanedNumber = phoneNumber.replace(/[\s\-()]/g, '');

    // Ensure it contains only digits after the '+'
    const phoneRegex = /^\+\d{8,15}$/;
    if (!phoneRegex.test(cleanedNumber)) {
        return false;
    }

    // Passes all validations
    return true;
}

export function abbreviateName(name, length = 2) {
    if (typeof name !== 'string' || name.trim() === '') {
        throw new Error('Invalid name. Please provide a valid non-empty string.');
    }
    if (![2, 3].includes(length)) {
        throw new Error('Invalid length. Only 2 or 3 are supported.');
    }

    name = name.trim();

    // If the name's length is less than or equal to the desired length, return the name
    if (name.length <= length) {
        return name.toUpperCase();
    }

    const parts = name.split(/\s+/); // Split by whitespace
    let abbreviation = '';

    // Handle names with multiple words
    if (parts.length > 1) {
        for (const part of parts) {
            if (abbreviation.length < length) {
                abbreviation += part[0]?.toUpperCase() ?? '';
            }
        }
    } else {
        // Handle single-word names
        abbreviation = name.slice(0, length).toUpperCase();
    }

    // Ensure the abbreviation matches the requested length
    return abbreviation.slice(0, length).padEnd(length, abbreviation[0] || '');
}

export function showActionSheet({ title, message, options, cancelButtonIndex, destructiveButtonIndex, onSelect }) {
    if (Platform.OS === 'ios') {
        // iOS Action Sheet
        ActionSheetIOS.showActionSheetWithOptions(
            {
                title,
                message,
                options,
                cancelButtonIndex,
                destructiveButtonIndex,
            },
            (buttonIndex) => {
                if (onSelect) {
                    onSelect(buttonIndex);
                }
            }
        );
    } else if (Platform.OS === 'android') {
        // Android Alert
        const buttons = options.map((option, index) => ({
            text: option,
            onPress: () => onSelect && onSelect(index),
            style: index === cancelButtonIndex ? 'cancel' : index === destructiveButtonIndex ? 'destructive' : 'default',
        }));

        Alert.alert(title || 'Choose an option', message || '', buttons, { cancelable: true });
    }
}

export function toBoolean(value) {
    switch (value) {
        case 'true':
        case '1':
        case 1:
        case true:
            return true;
        case 'false':
        case '0':
        case 0:
        case false:
        case null:
        case undefined:
        case '':
            return false;
        default:
            return false;
    }
}

export function consumeAsyncIterator(asyncIterator, onData, onError) {
    let stopped = false;

    // Define the stop function
    const stop = () => {
        stopped = true;
    };

    const consume = async () => {
        try {
            while (!stopped) {
                const { value, done } = await asyncIterator.next();
                if (done) {
                    break;
                }

                if (onData) {
                    onData(value);
                }
            }
        } catch (error) {
            if (onError) {
                onError(error);
            } else {
                console.error('Error in consumeAsyncIterator:', error);
            }
        }
    };

    // Start consuming asynchronously without blocking
    consume();
    return stop;
}

export function isAsyncIterable(input) {
    if (input == null) {
        return false;
    }

    return typeof input[Symbol.asyncIterator] === 'function';
}

export function mergeConfigs(defaultConfig = {}, targetConfig = {}) {
    // If targetConfig is not an object, just return defaultConfig directly
    if (typeof targetConfig !== 'object' || targetConfig === null) {
        return defaultConfig;
    }

    const result = { ...defaultConfig };

    for (const key in targetConfig) {
        // If both defaultConfig[key] and targetConfig[key] are objects, merge them deeply
        if (
            typeof targetConfig[key] === 'object' &&
            targetConfig[key] !== null &&
            !Array.isArray(targetConfig[key]) &&
            typeof result[key] === 'object' &&
            result[key] !== null &&
            !Array.isArray(result[key])
        ) {
            result[key] = mergeConfigs(result[key], targetConfig[key]);
        } else {
            // Otherwise, overwrite the value with the user's provided value
            result[key] = targetConfig[key];
        }
    }

    return result;
}

export function firstRouteName(navigation, routeName) {
    const state = navigation.getState();
    const routes = state.routes || [];

    return routes.length >= 0 ? routes[0].name : null;
}

export function routeWasAccessed(navigation, routeName) {
    const state = navigation.getState();
    const routes = state.routes || [];

    return routes.some((route) => route.name === routeName);
}

export function wasAccessedFromCartModal(navigation) {
    return routeWasAccessed(navigation, 'CartModal');
}

export function hexToRGBA(hex, opacity = 1) {
    if (!hex) return `rgba(0, 0, 0, ${opacity})`; // Default to black if no color is provided

    // Remove `#` if it exists
    hex = hex.replace(/^#/, '');

    // Convert shorthand hex `#RGB` to full form `#RRGGBB`
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((char) => char + char)
            .join('');
    }

    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`;
}

export function adjustOpacity(color, opacityFactor) {
    let r,
        g,
        b,
        a = 1;

    if (color.startsWith('#')) {
        // Convert HEX to RGBA and set opacity directly
        return hexToRGBA(color, opacityFactor);
    }

    if (color.startsWith('rgba')) {
        // Extract RGBA values
        [r, g, b, a] = color.match(/\d+(\.\d+)?/g).map(Number);
    } else if (color.startsWith('rgb')) {
        // Extract RGB values and assume full opacity
        [r, g, b] = color.match(/\d+/g).map(Number);
        a = 1; // Default full opacity if not provided
    } else if (color.startsWith('hsla')) {
        return adjustHslaOpacity(color, opacityFactor);
    } else if (color.startsWith('hsl')) {
        return adjustHslaOpacity(color.replace('hsl', 'hsla').replace(')', ', 1)'), opacityFactor);
    } else {
        throw new Error('Invalid color format');
    }

    // Directly set opacity instead of multiplying it
    a = Math.max(0, Math.min(1, opacityFactor)); // Direct assignment instead of multiplication

    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

export function adjustHslaOpacity(hsla, opacityFactor) {
    let [h, s, l, a = 1] = hsla.match(/\d+(\.\d+)?/g).map(Number);
    a = Math.max(0, Math.min(1, opacityFactor));
    return `hsla(${h}, ${s}%, ${l}%, ${a.toFixed(2)})`;
}

export function lightenColor(color, factor = 0.75) {
    return adjustOpacity(color, factor);
}

export function darkenColor(color, factor = 0.5) {
    return adjustOpacity(color, factor);
}

export function parseConfigObjectString(objectString) {
    if (!objectString || typeof objectString !== 'string' || objectString.trim() === '') {
        return {};
    }

    return objectString.split(',').reduce((acc, pair) => {
        let [key, value] = pair.split(':');
        if (key && value !== undefined) {
            // Ensure key exists and value is not undefined
            acc[key.trim()] = value.trim();
        }
        return acc;
    }, {});
}

export function getFoodTruckById(id) {
    const foodTrucks = storage.getArray('food_trucks');
    if (isArray(foodTrucks)) {
        const foundFoodTruck = foodTrucks.find((foodTruck) => foodTruck.id === id);
        if (foundFoodTruck) {
            return new FoodTruck(foundFoodTruck, adapter);
        }
    }

    return null;
}
