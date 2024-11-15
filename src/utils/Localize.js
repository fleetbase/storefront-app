import { I18nManager } from 'react-native';
import * as RNLocalize from 'react-native-localize';
import i18n from 'i18n-js';
import { get } from '../utils';
import { getString, setString } from '../utils/storage';
import { EventRegister } from 'react-native-event-listeners';

const { emit } = EventRegister;
const translations = preval`
  const fs = require('fs');
  const path = require('path');

  const translations = {};
  const translationsPath = path.join(__dirname, '../../translations/');

  fs.readdirSync(translationsPath).filter(name => fs.lstatSync(path.join(translationsPath, name)).isFile()).forEach(file => {
    const contents = fs.readFileSync(path.join(translationsPath, file), 'utf8');
    const name = file.replace('.json', '');

    translations[name] = JSON.parse(contents);
  });

  module.exports = translations;
`;

export function getTranslations() {
    const languages = Object.keys(translations);
    const translationGetters = {};

    for (let i = 0; i < languages.length; i++) {
        const lang = languages[i];

        // skip if not enabled
        if (!languages.includes(lang)) {
            continue;
        }

        if (translations[lang]) {
            translationGetters[lang] = () => translations[lang];
        }
    }

    return translationGetters;
}

export function getActiveTranslations() {
    return Object.keys(getTranslations());
}

export function translate(key, config = {}) {
    if (typeof key === 'object' && typeof config === 'string') {
        return translateResource(...arguments);
    }

    config.locale = config?.locale ?? getLanguage();
    return key;

    // return i18n.t(key, config);
}

export function translateResource(resource, key) {
    const locale = getLanguage();

    return get(resource.attributes, `translations.${locale}.${key}`) ?? resource?.getAttribute(key);
}

export function setLanguage(lang) {
    return setI18nConfig(lang);
}

export function getLanguage() {
    return getString('_locale') ?? i18n?.currentLocale();
}

export function setI18nConfig(lang = null) {
    // fallback if no available language fits
    const fallback = { languageTag: 'en', isRTL: false };

    // default
    const { languageTag, isRTL } = RNLocalize.findBestLanguageTag(Object.keys(getTranslations())) ?? fallback;

    // determine locale
    const locale = lang ?? getString('_locale') ?? languageTag;

    // update layout direction
    I18nManager.forceRTL(isRTL);

    // set i18n-js config
    i18n.fallbacks = true;
    i18n.missingBehaviour = 'guess';
    i18n.translations = { [locale]: translations[locale] };
    i18n.locale = locale;

    // broadcast
    emit('locale.changed', locale);
}
