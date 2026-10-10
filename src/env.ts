import Config from 'react-native-config';
import envOverrides from './generated/env-overrides';

// Development only: values in the git-ignored env.dev.json (e.g. another STOREFRONT_KEY)
// replace the build's .env values, so a debug build can switch storefronts with a Metro
// restart instead of a native rebuild. Release builds ignore the file.
if (typeof __DEV__ !== 'undefined' && __DEV__ && Config && envOverrides && Object.keys(envOverrides).length) {
    try {
        Object.assign(Config, envOverrides);
        console.info(`[env] Using env.dev.json for ${Object.keys(envOverrides).join(', ')}`);
    } catch (error) {
        console.warn('[env] Could not apply env.dev.json', error);
    }
}

// Expose the runtime app configuration (react-native-config on native, the
// webpack-injected CONFIG object on web) to modules that cannot import
// react-native-config directly, such as tamagui.config.ts which is also
// evaluated by Tamagui's build-time extractor. Import this module before App.
(globalThis as any).__STOREFRONT_ENV__ = Config ?? {};

export default Config;
