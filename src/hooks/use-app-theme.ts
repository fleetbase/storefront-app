import { useMemo } from 'react';
import { useBranding } from '../branding/BrandingProvider';

/** @deprecated Pre-branding storage key for the user's light/dark choice (migrated on first launch). */
export const USER_COLOR_SCHEME_KEY = 'user_color_scheme';
/** @deprecated The active theme is no longer persisted; use `useBranding().themeName`. */
export const APP_THEME_KEY = 'app_theme';
export const schemes = ['system', 'light', 'dark'] as const;

/**
 * Compatibility wrapper around `useBranding()` for existing components.
 * Every caller now reads the same state, so a scheme change updates the whole app.
 */
export default function useAppTheme() {
    const { themeName, scheme, preference, setPreference, schemePreferences, theme } = useBranding();

    return useMemo(
        () => ({
            appTheme: themeName,
            /** The user's choice: `system`, `light` or `dark`. */
            userColorScheme: preference,
            /** The scheme being rendered: `light` or `dark`. */
            colorScheme: scheme,
            changeScheme: setPreference,
            schemes: schemePreferences,
            isDarkMode: scheme === 'dark',
            isLightMode: scheme === 'light',
            textPrimary: theme.textPrimary,
            textSecondary: theme.textSecondary,
            primary: theme.primary,
            secondary: theme.secondary,
        }),
        [themeName, scheme, preference, setPreference, schemePreferences, theme]
    );
}
