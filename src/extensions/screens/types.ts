import type React from 'react';
import type { ScreenId } from './screen-ids';
import type { ScreenParamMap } from './params';

export type ScreenPlatform = 'ios' | 'android' | 'web';

export type StorefrontScreenBaseProps<Id extends ScreenId> = {
    route: { key: string; name: string; params: ScreenParamMap[Id] };
    navigation: any;
};

export type StorefrontScreenProps<Id extends ScreenId> = StorefrontScreenBaseProps<Id> & {
    /** The default implementation of this screen, so an override can wrap or compose it. */
    DefaultScreen: React.ComponentType<StorefrontScreenBaseProps<Id>>;
};

export type StorefrontScreen<Id extends ScreenId> = React.ComponentType<StorefrontScreenProps<Id>>;

export type ScreenModule<Id extends ScreenId> = { default: StorefrontScreen<Id> | React.ComponentType<any> };

export type ScreenLoader<Id extends ScreenId> = () => Promise<ScreenModule<Id>>;

export type ScreenEntry<Id extends ScreenId> = {
    /** Loads the implementation. Use `() => import('./MyScreen')`; platform files resolve as usual. */
    load: ScreenLoader<Id>;
    /** Compiled-in alternatives that declarative configuration may select by key. */
    variants?: Record<string, ScreenLoader<Id>>;
    /** Restrict the entry to some platforms; other platforms fall back to the default. */
    platforms?: ScreenPlatform[];
};

export type ScreenRegistryDefinition = { [Id in ScreenId]: ScreenEntry<Id> };

export type ScreenOverrides = Partial<{ [Id in ScreenId]: ScreenEntry<Id> }>;

/** Declarative selection of compiled-in variants, e.g. from bundled or remote configuration. */
export type ScreenVariantSelection = Partial<Record<ScreenId, string>>;

export type ScreenSource = 'default' | 'override' | 'variant';

export type LoadableComponent = React.ComponentType<any> & { preload: () => Promise<React.ComponentType<any>> };

export type ResolvedScreen = {
    Component: LoadableComponent;
    Default: LoadableComponent;
    source: ScreenSource;
};

export type ScreenErrorReporter = (error: unknown, context: { id: ScreenId; source: ScreenSource }) => void;
