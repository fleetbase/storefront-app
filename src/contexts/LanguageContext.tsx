import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import { getLangNameFromCode } from 'language-name-map';
import useStorage from '../hooks/use-storage';
import I18n from 'react-native-i18n';
import en from '../../translations/en.json';
import mn from '../../translations/mn.json';

I18n.fallbacks = true;
I18n.translations = {
    en,
    mn,
};

interface LanguageContextProps {
    locale: string;
    setLocale: (locale: string) => void;
    t: (key: string, options?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextProps>({
    locale: 'en',
    setLocale: () => {},
    t: () => '',
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [locale, setLocaleState] = useStorage<string>('_locale', 'en');

    const languages = Object.keys(I18n.translations).map((code) => {
        return { code, ...getLangNameFromCode(code) };
    });

    const language = useMemo(() => {
        return { code: locale, ...getLangNameFromCode(locale) };
    }, [locale]);

    const setLocale = (newLocale: string) => {
        I18n.locale = newLocale;
        setLocaleState(newLocale);
    };

    useEffect(() => {
        I18n.locale = locale;
    }, []);

    const t = (key: string, options?: Record<string, any>) => I18n.t(key, options);

    return <LanguageContext.Provider value={{ locale, setLocale, t, current: language, language, languages }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
    return useContext(LanguageContext);
};
