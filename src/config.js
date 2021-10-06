import Environment from 'react-native-config';
import InterfaceConfig from 'config/interface';

/** 
 * ----------------------------------------------------------
 * Storefront App Configuration
 * ----------------------------------------------------------
 *
 * Define your own custom configuration properties below.
 * @TODO Allow 3rd party configurations for plugins
 *
 * @type {object} 
 */
const Config = {
    ui: InterfaceConfig,
    ...Environment,
};

export default Config;
