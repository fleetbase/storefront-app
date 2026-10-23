import { BRANDING_MESSAGE, READY_MESSAGE, createHostedPreview, parseOrigins } from '../../src/preview/host';

function fakeWindow(preview?: unknown) {
    const listeners = new Set<(event: { origin: string; data: any }) => void>();
    return {
        __STOREFRONT_PREVIEW__: preview,
        parent: { postMessage: jest.fn() },
        addEventListener: jest.fn((_type: 'message', listener: any) => listeners.add(listener)),
        removeEventListener: jest.fn((_type: 'message', listener: any) => listeners.delete(listener)),
        dispatch: (origin: string, data: unknown) => listeners.forEach((listener) => listener({ origin, data })),
        listeners,
    };
}

describe('parseOrigins', () => {
    test('splits and trims a comma separated list', () => {
        expect(parseOrigins(' https://a.example , https://b.example,')).toEqual(['https://a.example', 'https://b.example']);
    });

    test('is empty without a value', () => {
        expect(parseOrigins(undefined)).toEqual([]);
        expect(parseOrigins('')).toEqual([]);
    });
});

describe('createHostedPreview', () => {
    test('is off without allowed origins', () => {
        const target = fakeWindow({ env: { STOREFRONT_KEY: 'store_x' } });
        const hosted = createHostedPreview({ origins: [], target });
        const onBranding = jest.fn();
        hosted.subscribe(onBranding)();
        expect(hosted.enabled).toBe(false);
        expect(hosted.initial).toBeNull();
        expect(target.addEventListener).not.toHaveBeenCalled();
        expect(target.parent.postMessage).not.toHaveBeenCalled();
    });

    test('is off without a window (native)', () => {
        const hosted = createHostedPreview({ origins: ['https://host.example'] });
        expect(hosted.enabled).toBe(false);
        expect(hosted.initial).toBeNull();
    });

    test('reads the starting keys and branding, keeping only string keys', () => {
        const branding = { schemaVersion: 1, colors: { light: { primary: '#be185d' } } };
        const target = fakeWindow({ env: { STOREFRONT_KEY: 'store_x', FLEETBASE_HOST: 'https://api.example', BAD: { nested: true } }, branding });
        const hosted = createHostedPreview({ origins: ['https://host.example'], target });
        expect(hosted.initial).toEqual({ env: { STOREFRONT_KEY: 'store_x', FLEETBASE_HOST: 'https://api.example' }, branding });
    });

    test('ignores a missing or malformed starting value', () => {
        expect(createHostedPreview({ origins: ['https://host.example'], target: fakeWindow() }).initial).toBeNull();
        expect(createHostedPreview({ origins: ['https://host.example'], target: fakeWindow('nope') }).initial).toBeNull();
    });

    test('delivers branding messages from allowed origins only', () => {
        const target = fakeWindow();
        const hosted = createHostedPreview({ origins: ['https://host.example'], target });
        const onBranding = jest.fn();
        hosted.subscribe(onBranding);

        target.dispatch('https://evil.example', { type: BRANDING_MESSAGE, branding: { schemaVersion: 1 } });
        target.dispatch('https://host.example', { type: 'something-else', branding: { schemaVersion: 1 } });
        expect(onBranding).not.toHaveBeenCalled();

        const branding = { schemaVersion: 1, appearance: { defaultScheme: 'dark' } };
        target.dispatch('https://host.example', { type: BRANDING_MESSAGE, branding });
        expect(onBranding).toHaveBeenCalledWith(branding);
    });

    test('announces it is ready to each allowed origin, and unsubscribes', () => {
        const target = fakeWindow();
        const hosted = createHostedPreview({ origins: ['https://a.example', 'https://b.example'], target });
        const unsubscribe = hosted.subscribe(jest.fn());
        expect(target.parent.postMessage).toHaveBeenCalledWith({ type: READY_MESSAGE }, 'https://a.example');
        expect(target.parent.postMessage).toHaveBeenCalledWith({ type: READY_MESSAGE }, 'https://b.example');
        unsubscribe();
        expect(target.listeners.size).toBe(0);
    });
});
