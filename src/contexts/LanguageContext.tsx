import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import { getLangNameFromCode } from 'language-name-map';
import { storefrontConfig } from '../utils';
import { translations } from '../utils/localize';
import localeEmoji from 'locale-emoji';
import useStorage from '../hooks/use-storage';
import I18n from 'react-native-i18n';

I18n.fallbacks = true;
I18n.translations = {
    ...translations,
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
    const [locale, setLocaleState] = useStorage<string>('_locale', storefrontConfig('defaultLocale', 'en'));

    const languages = Object.keys(I18n.translations).map((code) => {
        return { code, ...getLangNameFromCode(code), emoji: localeEmoji(code) };
    });

    const language = useMemo(() => {
        return { code: locale, ...getLangNameFromCode(locale), emoji: localeEmoji(locale) };
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
