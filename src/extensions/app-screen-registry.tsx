import React from 'react';
import { Platform } from 'react-native';
import storefrontExtensions from '../generated/brand-extensions';
import { getBuildBranding } from '../branding/build-branding';
import { createScreenRegistry } from './screens/registry';
import { defaultScreens } from './screens/default-screens';
import { ScreenRegistryProvider } from './screens/ScreenRegistryContext';
import { renderScreenLoadError, renderScreenLoading } from './screens/ScreenFallbacks';
import type { ScreenId } from './screens/screen-ids';

export const appScreenRegistry = createScreenRegistry(storefrontExtensions.screens ?? {}, { defaults: defaultScreens, platform: Platform.OS });
// Variant selections from branding (declarative) apply first; the build's extensions file wins.
const brandingVariants = Object.fromEntries(Object.entries(getBuildBranding().branding.screens).map(([id, selection]) => [id, selection.variant]));
const appScreenVariants = { ...brandingVariants, ...(storefrontExtensions.screenVariants ?? {}) };

/** Screens rendered immediately after boot; preloading avoids a loading frame on first display. */
export const INITIAL_SCREEN_IDS: Record<'store' | 'network', ScreenId[]> = {
    store: ['store.home', 'product.detail', 'cart'],
    network: ['network.home', 'network.store', 'store.home', 'product.detail', 'cart'],
};

export const preloadInitialScreens = (mode: 'store' | 'network') => appScreenRegistry.preload(INITIAL_SCREEN_IDS[mode]);

export const AppScreenRegistryProvider = ({ children }: { children: React.ReactNode }) => (
    <ScreenRegistryProvider registry={appScreenRegistry} variants={appScreenVariants} renderLoading={renderScreenLoading} renderLoadError={renderScreenLoadError}>
        {children}
    </ScreenRegistryProvider>
);
