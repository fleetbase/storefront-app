import Config from 'react-native-config';

// Expose the runtime app configuration (react-native-config on native, the
// webpack-injected CONFIG object on web) to modules that cannot import
// react-native-config directly, such as tamagui.config.ts which is also
// evaluated by Tamagui's build-time extractor. Import this module before App.
(globalThis as any).__STOREFRONT_ENV__ = Config ?? {};

export default Config;
