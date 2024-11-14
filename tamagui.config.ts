import { config as baseConfig } from '@tamagui/config/v3';
import { createTamagui, createTheme, createTokens } from 'tamagui';

const lightBase = {
    background: '#f9fafb',
    surface: '#f3f4f6',
    color: '#1f2937',
    textPrimary: '#FFFFFF',
    textSecondary: '#4b5563',
    primary: '#007AFF',
    secondary: '#e5e7eb',
    borderColor: '#e5e7eb',
    borderColorWithShadow: '#d1d5db',
    borderActive: '#007AFF',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#5AC8FA',
};

const darkBase = {
    background: '#111827',
    surface: '#1C1C1E',
    textPrimary: '#FFFFFF',
    textSecondary: '#CCCCCC',
    primary: '#0A84FF',
    secondary: '#FF9F0A',
    borderColor: '#333333',
    borderActive: '#0A84FF',
    success: '#30D158',
    error: '#FF453A',
    warning: '#FFD60A',
    info: '#64D2FF',
};

export const themes = {
    // Light mode themes
    lightBlue: createTheme({
        ...lightBase,
        primary: '#007AFF',
    }),
    lightRed: createTheme({
        ...lightBase,
        primary: '#FF3B30',
    }),
    lightIndigo: createTheme({
        ...lightBase,
        primary: '#5856D6',
    }),

    // Dark mode themes
    darkBlue: createTheme({
        ...darkBase,
        primary: '#0A84FF',
    }),
    darkRed: createTheme({
        ...darkBase,
        primary: '#FF453A',
    }),
    darkIndigo: createTheme({
        ...darkBase,
        primary: '#5E5CE6',
    }),
};

const tokens = createTokens({
    color: {
        transparent: 'rgba(0,0,0,0)',
        white: '#FFFFFF',
        black: '#000000',
    },
    space: {
        xs: 4,
        sm: 8,
        md: 16,
        true: 16,
        lg: 24,
        xl: 32,
    },
    size: {
        sm: 16,
        md: 24,
        true: 24,
        lg: 32,
        xl: 48,
    },
    font: {
        body: 'Arial, sans-serif',
        heading: 'Georgia, serif',
        monospace: 'Courier New, monospace',
    },
    radius: {
        sm: 4,
        md: 8,
        lg: 16,
        xl: 24,
    },
});

const fonts = {
    body: {
        family: tokens.font.body,
        weight: { normal: '400', bold: '700' },
        size: { sm: 14, md: 16, lg: 20 },
        lineHeight: { sm: 18, md: 24, lg: 28 },
    },
    heading: {
        family: tokens.font.heading,
        weight: { normal: '700', bold: '900' },
        size: { sm: 24, md: 32, lg: 40 },
        lineHeight: { sm: 28, md: 36, lg: 44 },
    },
};

const appConfig = createTamagui({
    ...baseConfig,
    themes,
    // tokens,
    // fonts,
});

export type AppConfig = typeof appConfig;

declare module 'tamagui' {
    interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;
