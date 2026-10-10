import { getLangNameFromCode } from 'language-name-map';
import { getString } from '../utils/storage';
import { get, storefrontConfig } from '../utils';
import en from '../../translations/en.json';
import mn from '../../translations/mn.json';
import uk from '../../translations/uk.json';
import brandTranslations from '../generated/brand-translations';
import I18n from 'react-native-i18n';

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

function mergeStrings(base, override) {
    if (!isObject(base) || !isObject(override)) return override === undefined ? base : override;
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) result[key] = mergeStrings(base[key], value);
    return result;
}

const appTranslations = { en, mn, uk };

// A client build's copy (brand/translations/<locale>.json) is merged over the app's:
// it can change any string, add its own keys (e.g. for custom screens) or add a locale.
export const translations = Object.fromEntries(
    [...new Set([...Object.keys(appTranslations), ...Object.keys(brandTranslations)])].map((locale) => [locale, mergeStrings(appTranslations[locale] ?? {}, brandTranslations[locale] ?? {})])
);

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

let translationsLoaded = false;

// Translations are registered on first use rather than at import time. Reading the
// storefront config while modules are still initializing breaks on circular imports
// (utils -> use-storefront -> LanguageContext -> utils), which crashed web boot.
export function ensureTranslationsLoaded() {
    if (translationsLoaded) return;
    I18n.fallbacks = true;
    I18n.translations = { ...getAvailableLocales() };
    translationsLoaded = true;
}

export function translate(key, options) {
    ensureTranslationsLoaded();
    return I18n.t(key, options);
}
