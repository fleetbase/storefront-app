import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

let mockHostListener: ((branding: unknown) => void) | null = null;

jest.mock('react-native', () => ({ useColorScheme: () => 'light', Platform: { OS: 'web' } }));
jest.mock(
    '../../src/hooks/use-storage',
    () => {
        const { useState } = require('react');
        return {
            __esModule: true,
            getString: () => null,
            default: function useMockStorage(_key: string, defaultValue: any) {
                return useState(defaultValue);
            },
        };
    },
    { virtual: true }
);
jest.mock('../../src/preview/host', () => ({
    isHostedPreview: true,
    initialHostedPreview: null,
    subscribeToHostBranding: (onBranding: (branding: unknown) => void) => {
        mockHostListener = onBranding;
        return () => {
            mockHostListener = null;
        };
    },
}));

import { BrandingProvider, useBranding } from '../../src/branding/BrandingProvider';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

function render() {
    const ref: { current: ReturnType<typeof useBranding> | null } = { current: null };
    const Probe = () => {
        ref.current = useBranding();
        return null;
    };
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
        renderer = TestRenderer.create(
            <BrandingProvider>
                <Probe />
            </BrandingProvider>
        );
    });
    return { ref, unmount: () => act(() => renderer.unmount()) };
}

describe('BrandingProvider in a hosted preview', () => {
    test('applies branding posted by the host without remounting', () => {
        const { ref } = render();
        const before = ref.current!.theme.primary;

        act(() => mockHostListener!({ schemaVersion: 1, colors: { light: { primary: '#be185d', primaryText: '#ffffff' } } }));
        expect(ref.current!.theme.primary).toBe('#be185d');
        expect(ref.current!.theme.primary).not.toBe(before);

        act(() => mockHostListener!({ schemaVersion: 1, appearance: { defaultScheme: 'dark', allowUserToggle: false } }));
        expect(ref.current!.scheme).toBe('dark');
    });

    test('ignores host branding with an unsupported schema version', () => {
        const { ref } = render();
        const before = ref.current!.theme.primary;
        act(() => mockHostListener!({ schemaVersion: 99, colors: { light: { primary: '#be185d' } } }));
        expect(ref.current!.theme.primary).toBe(before);
    });

    test('stops listening when unmounted', () => {
        const { unmount } = render();
        expect(mockHostListener).not.toBeNull();
        unmount();
        expect(mockHostListener).toBeNull();
    });
});
