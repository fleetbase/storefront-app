import { BrandingProvider, useBranding } from '../branding/BrandingProvider';

/** @deprecated Use `BrandingProvider` from src/branding/BrandingProvider. */
export const ThemeProvider = BrandingProvider;

/** @deprecated Use `useBranding()`; `appTheme` is `themeName`. */
export const useThemeContext = () => {
    const { themeName, setPreference, schemePreferences } = useBranding();
    return { appTheme: themeName, changeScheme: setPreference, schemes: schemePreferences };
};
