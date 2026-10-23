import RNConfig from 'react-native-config';
import envOverrides from './generated/env-overrides';
import { initialHostedPreview } from './preview/host';

const useOverrides = typeof __DEV__ !== 'undefined' && __DEV__ && !!envOverrides && Object.keys(envOverrides).length > 0;

/**
 * The app configuration: the build's .env values (react-native-config on native, the
 * webpack-injected CONFIG object on web). In development, values in the git-ignored
 * env.dev.json (e.g. another STOREFRONT_KEY) replace them, so a debug build can switch
 * storefronts with a Metro restart instead of a native rebuild. Release builds ignore it.
 * App code reads configuration from this module, not from react-native-config.
 */
const baseConfig: Record<string, any> = useOverrides ? { ...(RNConfig ?? {}), ...envOverrides } : (RNConfig ?? {});
// A hosted preview build (see src/preview/host.ts) takes the store to show from the host page.
const Config: Record<string, any> = initialHostedPreview?.env ? { ...baseConfig, ...initialHostedPreview.env } : baseConfig;

if (useOverrides) {
    console.info(`[env] Using env.dev.json for ${Object.keys(envOverrides).join(', ')}`);
}

// Expose the configuration to modules that cannot import react-native-config directly,
// such as tamagui.config.ts which is also evaluated by Tamagui's build-time extractor.
// Import this module before App.
(globalThis as any).__STOREFRONT_ENV__ = Config;

export { Config };
export default Config;
