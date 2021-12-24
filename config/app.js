import { configure } from './defaults';

/** 
 * ----------------------------------------------------------
 * Storefront App Configuration
 * ----------------------------------------------------------
 *
 * @type {object} 
 */
const AppConfig = configure('AppConfig', {
    enabledTranslations: ['en', 'mn']
});

export default AppConfig;