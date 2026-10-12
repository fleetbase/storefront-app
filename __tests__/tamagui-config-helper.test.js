/* global globalThis */
import { config, parseConfigObjectString } from '../src/utils/tamagui';

describe('tamagui config helper', () => {
    const originalEnv = process.env.CUSTOM_COLORS;

    afterEach(() => {
        delete globalThis.__STOREFRONT_ENV__;
        if (originalEnv === undefined) delete process.env.CUSTOM_COLORS;
        else process.env.CUSTOM_COLORS = originalEnv;
    });

    test('reads the runtime app configuration first', () => {
        process.env.CUSTOM_COLORS = 'custom:#000000';
        globalThis.__STOREFRONT_ENV__ = { CUSTOM_COLORS: 'custom:#345A73' };
        expect(config('CUSTOM_COLORS', '')).toBe('custom:#345A73');
    });

    test('falls back to the build environment, then the default', () => {
        process.env.CUSTOM_COLORS = 'custom:#000000';
        expect(config('CUSTOM_COLORS', '')).toBe('custom:#000000');
        delete process.env.CUSTOM_COLORS;
        expect(config('CUSTOM_COLORS', 'fallback')).toBe('fallback');
    });

    test('parses custom color strings', () => {
        expect(parseConfigObjectString('custom:#345A73, customText:#F0EEEC')).toEqual({ custom: '#345A73', customText: '#F0EEEC' });
        expect(parseConfigObjectString('')).toEqual({});
    });
});
