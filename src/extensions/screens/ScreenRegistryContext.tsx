import React, { createContext, useContext, useMemo } from 'react';
import type { ScreenRegistry } from './registry';
import type { ScreenErrorReporter, ScreenVariantSelection } from './types';
import type { ScreenId } from './screen-ids';

export type ScreenRegistryContextValue = {
    registry: ScreenRegistry;
    variants: ScreenVariantSelection;
    /** Rendered while a screen module loads. */
    renderLoading: (id: ScreenId) => React.ReactNode;
    /** Rendered when both an override and the default screen fail. */
    renderLoadError: (id: ScreenId, error: unknown) => React.ReactNode;
    onError: ScreenErrorReporter;
};

const defaultReporter: ScreenErrorReporter = (error, { id, source }) => {
    console.error(`[screen-registry] ${source} screen "${id}" failed; falling back.`, error);
};

const ScreenRegistryContext = createContext<ScreenRegistryContextValue | null>(null);

type ProviderProps = {
    registry: ScreenRegistry;
    variants?: ScreenVariantSelection;
    renderLoading?: ScreenRegistryContextValue['renderLoading'];
    renderLoadError?: ScreenRegistryContextValue['renderLoadError'];
    onError?: ScreenErrorReporter;
    children: React.ReactNode;
};

export const ScreenRegistryProvider = ({ registry, variants, renderLoading, renderLoadError, onError, children }: ProviderProps) => {
    const value = useMemo<ScreenRegistryContextValue>(
        () => ({
            registry,
            variants: variants ?? {},
            renderLoading: renderLoading ?? (() => null),
            renderLoadError: renderLoadError ?? (() => null),
            onError: onError ?? defaultReporter,
        }),
        [registry, variants, renderLoading, renderLoadError, onError]
    );
    return <ScreenRegistryContext.Provider value={value}>{children}</ScreenRegistryContext.Provider>;
};

/** The active screen registry. Screens rendered through screenSlot must be inside a ScreenRegistryProvider. */
export const useScreenRegistry = (): ScreenRegistryContextValue => {
    const context = useContext(ScreenRegistryContext);
    if (!context) {
        throw new Error('[screen-registry] screenSlot rendered outside ScreenRegistryProvider.');
    }
    return context;
};
