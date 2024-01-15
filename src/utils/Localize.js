import { I18nManager } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import * as RNLocalize from 'react-native-localize';
import { config, deepGet } from './Helper';
import { getString, setString } from './Storage';
import i18n from 'i18n-js';

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

/**
 *  Utility class for performing localization and internationalization.
 *
 * @export
 * @class LocalizeUtil
 */
export default class LocalizeUtil {
    static get translationGetters() {
        const languages = config('app.enabledTranslations') ?? Object.keys(translations);
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

    static get activeTranslations() {
        return Object.keys(LocalizeUtil.translationGetters);
    }

    static translate(key, config = {}) {
        if (typeof key === 'object' && typeof config === 'string') {
            return LocalizeUtil.translateResource(...arguments);
        }

        config.locale = config?.locale ?? LocalizeUtil.getLanguage();

        return i18n.t(key, config);
    }

    static translateResource(resource, key) {
        const locale = LocalizeUtil.getLanguage();

        return deepGet(resource?.attributes, `translations.${locale}.${key}`) ?? resource?.getAttribute(key);
    }

    static setLanguage(lang) {
        return setI18nConfig(lang);
    }

    static getLanguage() {
        return getString('_locale') ?? i18n?.currentLocale();
    }

    static setI18nConfig(lang = null) {
        // fallback if no available language fits
        const fallback = { languageTag: 'en', isRTL: false };

        // default
        const { languageTag, isRTL } = RNLocalize.findBestLanguageTag(Object.keys(LocalizeUtil.translationGetters)) ?? fallback;

        // determine locale
        const locale = lang ?? getString('_locale') ?? languageTag;

        // update layout direction
        I18nManager.forceRTL(isRTL);

        // set i18n-js config
        i18n.fallbacks = true;
        i18n.missingBehaviour = 'guess';
        i18n.translations = { [locale]: translations[locale] };
        // console.log('[translations]', translations[locale]);
        i18n.locale = locale;

        // broadcast
        emit('locale.changed', locale);
    }
}

const translate = LocalizeUtil.translate;
const translateResource = LocalizeUtil.translateResource;
const setI18nConfig = LocalizeUtil.setI18nConfig;
const setLanguage = LocalizeUtil.setLanguage;
const getLanguage = LocalizeUtil.getLanguage;
const activeTranslations = LocalizeUtil.activeTranslations;

export { setI18nConfig, translate, translateResource, translations, setLanguage, getLanguage, activeTranslations };
