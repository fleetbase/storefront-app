import { setLanguage } from '../utils/localize';
import { useCallback } from 'react';
import useStorage from './use-storage';

type UseLocaleReturn = [string, (locale: string) => void];

const useLocale = (defaultLocale: string = 'en'): UseLocaleReturn => {
    // MMKV storage hook for persisting the locale
    const [locale, setStoredLocale] = useStorage<string>('_locale', defaultLocale);

    // Sets the locale and persists it in storage
    const setLocale = useCallback(
        (newLocale: string) => {
            setLanguage(newLocale); // Update the language in the localization system
            setStoredLocale(newLocale); // Persist the new locale
        },
        [setStoredLocale]
    );

    return [locale ?? defaultLocale, setLocale];
};

export default useLocale;
