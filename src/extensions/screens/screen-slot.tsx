import React, { Suspense } from 'react';
import ScreenErrorBoundary from './ScreenErrorBoundary';
import { useScreenRegistry } from './ScreenRegistryContext';
import type { ScreenId } from './screen-ids';

const slots = new Map<ScreenId, React.ComponentType<any>>();

/**
 * Returns the component a navigator registers for a screen id.
 *
 * The component is stable per id, so React Navigation's static config is
 * unaffected. At render time it resolves the default screen, a compiled-in
 * override, or a selected variant from the registry in context. If an
 * override fails to load or render, the default screen renders with the same
 * props; if the default fails too, the provider's load-error view renders.
 */
export function screenSlot(id: ScreenId): React.ComponentType<any> {
    const existing = slots.get(id);
    if (existing) return existing;

    const ScreenSlot = (props: any) => {
        const { registry, variants, renderLoading, renderLoadError, onError } = useScreenRegistry();
        const { Component, Default, source } = registry.resolve(id, variants[id]);
        const renderDefault = () => <Default {...props} DefaultScreen={Default} />;

        return (
            <ScreenErrorBoundary
                key={`${id}:default`}
                onError={(error) => onError(error, { id, source: 'default' })}
                fallback={(error) => renderLoadError(id, error)}
            >
                <Suspense fallback={renderLoading(id)}>
                    {source === 'default' ? (
                        renderDefault()
                    ) : (
                        <ScreenErrorBoundary key={`${id}:${source}`} onError={(error) => onError(error, { id, source })} fallback={renderDefault}>
                            <Component {...props} DefaultScreen={Default} />
                        </ScreenErrorBoundary>
                    )}
                </Suspense>
            </ScreenErrorBoundary>
        );
    };

    ScreenSlot.displayName = `ScreenSlot(${id})`;
    slots.set(id, ScreenSlot);
    return ScreenSlot;
}
