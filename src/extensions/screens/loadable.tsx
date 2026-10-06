import React, { use } from 'react';
import type { LoadableComponent } from './types';

type ModuleLoader = () => Promise<{ default: React.ComponentType<any> } | React.ComponentType<any>>;

/**
 * A lazily loaded component that renders synchronously once loaded and can be
 * preloaded (e.g. during boot) so the first navigation does not suspend.
 * Load failures are thrown during render so an error boundary can fall back.
 */
export function createLoadable(loader: ModuleLoader, displayName: string): LoadableComponent {
    let promise: Promise<React.ComponentType<any>> | null = null;
    let loaded: React.ComponentType<any> | null = null;

    const preload = () => {
        if (!promise) {
            promise = Promise.resolve()
                .then(loader)
                .then((module: any) => {
                    const Component = module && typeof module === 'object' && 'default' in module ? module.default : module;
                    if (!isRenderableComponent(Component)) {
                        throw new Error(`Screen "${displayName}" did not export a React component.`);
                    }
                    loaded = Component;
                    return Component;
                });
            // Avoid unhandled rejection warnings for preloads; render still surfaces the error.
            promise.catch(() => {});
        }
        return promise;
    };

    const Loadable = (props: any) => {
        const Component = loaded ?? use(preload());
        return <Component {...props} />;
    };

    Loadable.displayName = `Loadable(${displayName})`;
    Loadable.preload = preload;
    return Loadable as LoadableComponent;
}

export function isRenderableComponent(value: unknown): value is React.ComponentType<any> {
    if (typeof value === 'function') return true;
    // memo/forwardRef/lazy components are objects with a $$typeof marker.
    return !!value && typeof value === 'object' && '$$typeof' in (value as object);
}
