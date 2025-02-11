import { config as baseConfig } from '@tamagui/config/v3';
import { createTamagui, createTheme, createTokens } from 'tamagui';

export function flattenTailwindCssColorsObject(colors = {}) {
    const flattened = {};

    for (const [color, shades] of Object.entries(colors)) {
        if (typeof shades === 'object') {
            for (const [shade, value] of Object.entries(shades)) {
                flattened[`${color}-${shade}`] = value;
            }
        } else {
            // Handle cases where `colors` might not be nested
            flattened[color] = shades;
        }
    }

    return flattened;
}

const globalColors = {
    transparent: 'rgba(0,0,0,0)',
    white: '#FFFFFF',
    black: '#000000',
};

// Full Tailwind CSS Color Palette
const colors = {
    gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
    },
    red: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
    },
    blue: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
    },
    green: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
    },
    yellow: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15',
        500: '#eab308',
        600: '#ca8a04',
        700: '#a16207',
        800: '#854d0e',
        900: '#713f12',
    },
    orange: {
        50: '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
        900: '#7c2d12',
    },
    indigo: {
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1',
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81',
    },
    purple: {
        50: '#f5f3ff',
        100: '#ede9fe',
        200: '#ddd6fe',
        300: '#c4b5fd',
        400: '#a78bfa',
        500: '#8b5cf6',
        600: '#7c3aed',
        700: '#6d28d9',
        800: '#5b21b6',
        900: '#4c1d95',
    },
    pink: {
        50: '#fdf2f8',
        100: '#fce7f3',
        200: '#fbcfe8',
        300: '#f9a8d4',
        400: '#f472b6',
        500: '#ec4899',
        600: '#db2777',
        700: '#be185d',
        800: '#9d174d',
        900: '#831843',
    },
};

// Define Light and Dark Bases Using Tailwind Colors
const lightBase = {
    ...globalColors,
    background: colors.gray[50],
    surface: colors.gray[100],
    color: colors.gray[900],
    textPrimary: colors.gray[800],
    textSecondary: colors.gray[600],
    textPlaceholder: colors.gray[400],
    primary: colors.blue[400],
    primaryDark: colors.blue[500],
    primaryDarker: colors.blue[600],
    secondary: colors.gray[200],
    secondaryDark: colors.gray[300],
    secondaryDarker: colors.gray[400],
    borderColor: colors.gray[200],
    borderColorWithShadow: colors.gray[300],
    shadowColor: colors.gray[900],
    borderActive: colors.blue[600],
    success: colors.green[600],
    error: colors.red[600],
    warning: colors.yellow[600],
    info: colors.blue[600],
    ...flattenTailwindCssColorsObject(colors),
};

const darkBase = {
    ...globalColors,
    background: colors.gray[900],
    surface: colors.gray[800],
    color: colors.gray[50],
    textPrimary: colors.gray[200],
    textSecondary: colors.gray[400],
    textPlaceholder: colors.gray[600],
    primary: colors.blue[400],
    primaryDark: colors.blue[500],
    primaryDarker: colors.blue[600],
    secondary: colors.gray[700],
    secondaryDark: colors.gray[800],
    secondaryDarker: colors.gray[900],
    borderColor: colors.gray[800],
    borderColorWithShadow: colors.gray[700],
    shadowColor: '#000',
    borderActive: colors.blue[500],
    success: colors.green[500],
    error: colors.red[500],
    warning: colors.yellow[500],
    info: colors.blue[500],
    ...flattenTailwindCssColorsObject(colors),
};

// Define Themes Using Light and Dark Bases
export const themes = {
    // Light mode themes
    lightBlue: createTheme({
        ...lightBase,
        primary: colors.blue[600],
    }),
    lightRed: createTheme({
        ...lightBase,
        primary: colors.red[600],
    }),
    lightGreen: createTheme({
        ...lightBase,
        primary: colors.green[600],
    }),
    lightIndigo: createTheme({
        ...lightBase,
        primary: colors.indigo[600],
    }),

    // Dark mode themes
    darkBlue: createTheme({
        ...darkBase,
        primary: colors.blue[500],
    }),
    darkRed: createTheme({
        ...darkBase,
        primary: colors.red[500],
    }),
    darkGreen: createTheme({
        ...darkBase,
        primary: colors.green[500],
    }),
    darkIndigo: createTheme({
        ...darkBase,
        primary: colors.indigo[500],
    }),
};

const tokens = createTokens({
    ...baseConfig.tokens,
    color: {
        ...globalColors,
        ...flattenTailwindCssColorsObject(colors),
    },
});

const appConfig = createTamagui({
    ...baseConfig,
    themes,
    tokens,
});

export type AppConfig = typeof appConfig;

declare module 'tamagui' {
    interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;
