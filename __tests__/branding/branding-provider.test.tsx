import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockStore = new Map<string, any>();
let mockSystemScheme: 'light' | 'dark' = 'light';

jest.mock('react-native', () => ({ useColorScheme: () => mockSystemScheme, Platform: { OS: 'ios' } }));
jest.mock(
    '../../src/hooks/use-storage',
    () => {
        const { useState } = require('react');
        return {
            __esModule: true,
            getString: (key: string) => mockStore.get(key) ?? null,
            default: function useMockStorage(key: string, defaultValue: any) {
                const [value, setValue] = useState(mockStore.has(key) ? mockStore.get(key) : defaultValue);
                return [
                    value,
                    (next: any) => {
                        mockStore.set(key, next);
                        setValue(next);
                    },
                ];
            },
        };
    },
    { virtual: true }
);

import { BrandingProvider, useBranding } from '../../src/branding/BrandingProvider';
import { getActiveTheme } from '../../src/branding/runtime-theme';
import { resolveBranding } from '../../src/branding/resolve';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

function renderWithBranding(resolved?: ReturnType<typeof resolveBranding>) {
    const ref: { current: ReturnType<typeof useBranding> | null } = { current: null };
    const Probe = () => {
        ref.current = useBranding();
        return null;
    };
    act(() => {
        TestRenderer.create(
            <BrandingProvider resolved={resolved}>
                <Probe />
            </BrandingProvider>
        );
    });
    return ref;
}

describe('BrandingProvider', () => {
    beforeEach(() => {
        mockStore.clear();
        mockSystemScheme = 'light';
    });

    test('follows the system scheme by default', () => {
        mockSystemScheme = 'dark';
        const ref = renderWithBranding();
        expect(ref.current!.preference).toBe('system');
        expect(ref.current!.scheme).toBe('dark');
        expect(ref.current!.themeName).toBe('darkBlue');
        expect(getActiveTheme()?.name).toBe('darkBlue');
    });

    test('migrates the legacy light/dark choice', () => {
        mockStore.set('user_color_scheme', 'dark');
        const ref = renderWithBranding();
        expect(ref.current!.preference).toBe('dark');
        expect(ref.current!.themeName).toBe('darkBlue');
    });

    test('lets the user change the scheme and updates getTheme consumers', () => {
        const ref = renderWithBranding();
        act(() => ref.current!.setPreference('dark'));
        expect(ref.current!.themeName).toBe('darkBlue');
        expect(getActiveTheme()?.theme.background).toBe('#111827');
        expect(mockStore.get('storefront:appearance')).toBe('dark');
    });

    test('respects a brand that fixes the scheme', () => {
        mockStore.set('storefront:appearance', 'dark');
        const resolved = resolveBranding([{ name: 'brand', config: { schemaVersion: 1, appearance: { defaultScheme: 'light', allowUserToggle: false } } }]);
        const ref = renderWithBranding(resolved);
        expect(ref.current!.schemePreferences).toEqual([]);
        expect(ref.current!.themeName).toBe('lightBlue');
        act(() => ref.current!.setPreference('dark'));
        expect(ref.current!.themeName).toBe('lightBlue');
    });

    test('applies a dev-only local preview over the build branding', () => {
        (global as any).__DEV__ = true;
        mockStore.set('storefront:branding-preview', JSON.stringify({ schemaVersion: 1, colors: { preset: 'indigo' } }));
        const ref = renderWithBranding();
        expect(ref.current!.branding.preset).toBe('indigo');
        expect(ref.current!.themeName).toBe('lightIndigo');
    });

    test('ignores a malformed local preview', () => {
        (global as any).__DEV__ = true;
        mockStore.set('storefront:branding-preview', '{not json');
        const ref = renderWithBranding();
        expect(ref.current!.themeName).toBe('lightBlue');
    });

    test('registers a runtime theme when colors differ from the compiled theme', () => {
        const resolved = resolveBranding([{ name: 'remote', config: { schemaVersion: 1, colors: { light: { primary: '#0f766e' } } } }]);
        const ref = renderWithBranding(resolved);
        expect(ref.current!.themeName).toBe('lightBlueBrand');
        expect(ref.current!.theme.primary).toBe('#0f766e');
        // Tamagui skips theme mutation in Node (server); registration itself is covered in runtime-theme.test.ts.
    });
});
