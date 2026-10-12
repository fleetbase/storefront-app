/* global globalThis */
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
    // This helper is evaluated by Tamagui's Node/esbuild extractor as well as by
    // the app bundles. Importing react-native-config here pulls an untransformed
    // Flow codegen module into the build-time process, so at runtime the app
    // configuration is read from the global populated by `src/env.ts`, and at
    // build time from the process environment.
    const runtimeEnv = typeof globalThis !== 'undefined' ? globalThis.__STOREFRONT_ENV__ : undefined;
    const runtimeValue = runtimeEnv ? runtimeEnv[key] : undefined;
    const value = runtimeValue !== undefined ? runtimeValue : typeof process !== 'undefined' ? process.env?.[key] : undefined;
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
