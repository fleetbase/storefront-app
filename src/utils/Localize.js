import { getLangNameFromCode } from 'language-name-map';
import { getString } from '../utils/storage';
import { get, storefrontConfig } from '../utils';
import en from '../../translations/en.json';
import mn from '../../translations/mn.json';

export const translations = {
    en,
    mn,
};

export function getLocale() {
    return getString('_locale') ?? storefrontConfig('defaultLocale', 'en');
}

export function getLanguage() {
    const locale = getLocale();
    return { code: locale, ...getLangNameFromCode(locale) };
}
