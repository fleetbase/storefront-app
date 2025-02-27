import { getLangNameFromCode } from 'language-name-map';
import { getString } from '../utils/storage';
import { get, storefrontConfig } from '../utils';
import en from '../../translations/en.json';
import mn from '../../translations/mn.json';
import I18n from 'react-native-i18n';

export const translations = {
    en,
    mn,
};

export function getAvailableLocales() {
    const availableLocales = storefrontConfig('availableLocales', ['en']);
    return Object.fromEntries(Object.entries(translations).filter(([locale]) => availableLocales.includes(locale)));
}

export function getLocale() {
    return getString('_locale') ?? storefrontConfig('defaultLocale', 'en');
}

export function getLanguage() {
    const locale = getLocale();
    return { code: locale, ...getLangNameFromCode(locale) };
}

export function translate(key, options) {
    return I18n.t(key, options);
}
