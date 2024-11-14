import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import useStorage, { getString } from './use-storage';

const THEME_PREFERENCE_KEY = 'user_theme_preference';

type ThemeType = 'lightBlue' | 'lightRed' | 'lightIndigo' | 'darkBlue' | 'darkRed' | 'darkIndigo' | string;

export default function useTheme() {
    const systemColorScheme = useColorScheme(); // Detect system theme
    const [theme, setTheme] = useStorage<ThemeType>(THEME_PREFERENCE_KEY, systemColorScheme === 'dark' ? 'darkBlue' : 'lightBlue');

    useEffect(() => {
        const initializeTheme = async () => {
            const storedTheme = await getString(THEME_PREFERENCE_KEY);
            if (storedTheme) {
                setTheme(storedTheme);
            } else if (systemColorScheme) {
                setTheme(systemColorScheme === 'dark' ? 'darkBlue' : 'lightBlue');
            }
        };
        initializeTheme();
    }, [systemColorScheme]);

    // Function to switch theme and store the preference
    const switchTheme = (newTheme: ThemeType) => {
        setTheme(newTheme);
    };

    return { theme, switchTheme };
}
