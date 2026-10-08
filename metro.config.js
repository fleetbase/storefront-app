const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const defaultRewrite = defaultConfig.server?.rewriteRequestUrl ?? ((url) => url);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Screens load through `import()` (the screen registry). In development the app asks
 * Metro for a "lazy" bundle, which splits at every `import()`, so each screen was built
 * and downloaded the first time it opened. Asking for the whole app up front avoids
 * that wait on every new screen. Release builds always contain the whole app.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
    server: {
        rewriteRequestUrl: (url) => defaultRewrite(url).replace(/([?&])lazy=true\b/, '$1lazy=false'),
    },
};

module.exports = wrapWithReanimatedMetroConfig(mergeConfig(defaultConfig, config));
