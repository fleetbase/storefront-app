import React from 'react';
import { defineStorefrontExtensions } from '../../src/extensions';
import type { ScreenParamMap, StorefrontScreen } from '../../src/extensions';

// These assertions are checked by `yarn typecheck:strict`; the runtime test only keeps Jest happy.

const StoreHome: StorefrontScreen<'store.home'> = ({ route, DefaultScreen, navigation }) => {
    const storeId: string | undefined = route.params?.storeId;
    void storeId;
    return React.createElement(DefaultScreen, { route, navigation });
};

defineStorefrontExtensions({
    screens: {
        'store.home': { load: () => Promise.resolve({ default: StoreHome }) },
        'network.store': { load: () => Promise.resolve({ default: () => null }), platforms: ['web'] },
    },
    screenVariants: { 'store.home': 'editorial' },
});

defineStorefrontExtensions({
    screens: {
        // @ts-expect-error unknown screen ids are rejected at compile time
        'store.unknown': { load: () => Promise.resolve({ default: () => null }) },
    },
});

defineStorefrontExtensions({
    screens: {
        // @ts-expect-error overrides must provide a loader
        'store.home': { component: StoreHome },
    },
});

defineStorefrontExtensions({
    screens: {
        // @ts-expect-error platforms are restricted to ios, android and web
        cart: { load: () => Promise.resolve({ default: () => null }), platforms: ['windows'] },
    },
});

// @ts-expect-error network.store requires a storeId param
const missingStoreId: ScreenParamMap['network.store'] = {};
void missingStoreId;

test('screen registry types compile', () => {
    expect(true).toBe(true);
});
