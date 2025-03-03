import { useEffect, useMemo } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import useStorage, { getString } from './use-storage';
import { storefrontConfig, getTheme } from '../utils';
import { capitalize } from '../utils/format';

export const USER_COLOR_SCHEME_KEY = 'user_color_scheme';
export const APP_THEME_KEY = 'app_theme';
export const schemes = ['light', 'dark'] as const;

export default function useAppTheme() {
    const baseTheme = capitalize(storefrontConfig('theme')); // e.g., 'Indigo'
    const systemColorScheme = useColorScheme(); // 'light' or 'dark';

    const [userColorScheme, setUserColorScheme] = useStorage<string>(USER_COLOR_SCHEME_KEY, systemColorScheme || 'light');
    const [appTheme, setAppTheme] = useStorage<string>(APP_THEME_KEY, `${userColorScheme}${baseTheme}`);

    const isDarkMode = userColorScheme === 'dark';
    const isLightMode = userColorScheme === 'light';

    useEffect(() => {
        const initializeTheme = async () => {
            const storedTheme = await getString(APP_THEME_KEY);
            if (storedTheme) {
                setAppTheme(storedTheme);
            } else {
                if (!userColorScheme && !appTheme) {
                    setAppTheme(`${systemColorScheme}${baseTheme}`);
                } else {
                    setAppTheme(`${userColorScheme}${baseTheme}`);
                }
            }
        };
        initializeTheme();
    }, []);

    const changeScheme = (newScheme: string) => {
        const newTheme = `${newScheme}${baseTheme}`;
        setUserColorScheme(newScheme);
        setAppTheme(newTheme);
    };

    const themeContext = useMemo(
        () => ({
            appTheme,
            userColorScheme,
            changeScheme,
            schemes,
            isDarkMode,
            isLightMode,
            textPrimary: getTheme('textPrimary'),
            textSecondary: getTheme('textSecondary'),
            primary: getTheme('primary'),
            secondary: getTheme('secondary'),
        }),
        [appTheme, userColorScheme, changeScheme, isDarkMode, isLightMode]
    );

    return themeContext;
}
