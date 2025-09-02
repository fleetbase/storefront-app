import Config from 'react-native-config';

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

export function config(key, defaultValue) {
    const value = Config[key];
    return value === undefined ? defaultValue : value;
}

export function flattenTailwindCssColorsObject(colors = {}) {
    const flattened = {};

    for (const [color, shades] of Object.entries(colors)) {
        if (typeof shades === 'object') {
            for (const [shade, value] of Object.entries(shades)) {
                flattened[`${color}-${shade}`] = value;
            }
        } else {
            // Handle cases where `colors` might not be nested
            flattened[color] = shades;
        }
    }

    return flattened;
}
