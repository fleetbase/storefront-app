import { Collection } from '@fleetbase/sdk';
import { EventRegister } from 'react-native-event-listeners';
import { countries } from 'countries-list';
import { set } from './Storage';
import { getCurrentLocation } from './Geo';
import configuration from 'config';
import { currency, number as numberSettings } from './Settings';

const { emit } = EventRegister;

/**
 *  Utility class for various helper utility functions
 *
 * @export
 * @class HelperUtil
 */
export default class HelperUtil {
    /**
     * Lists an array of countries as objects.
     *
     * @static
     * @param {strine} [_country=null] ISO-2 country code
     * @return {Array}
     * @memberof HelperUtil
     */
    static listCountries(_country = null) {
        const _countries = Object.values(countries);
        const _codes = Object.keys(countries);
        const _list = [];

        for (let i = 0; i < _countries.length; i++) {
            const country = _countries[i];

            _list.push({
                ...country,
                iso2: _codes[i],
            });
        }

        _list.sort((a, b) => a.name.localeCompare(b.name));

        if (_country !== null) {
            // eslint-disable-next-line radix
            return _list.find((c) => c.iso2 === _country || parseInt(c.phone) === parseInt(_country));
        }

        return _list;
    }

    /**
     * Handle mutation of places Collection, either remove, add, or update in collection.
     * Allows user to send callback after mutation.
     *
     * @static
     * @param {*} places
     * @param {*} place
     * @param {*} cb
     * @return {*}
     * @memberof HelperUtil
     */
    static mutatePlaces(places, place, cb) {
        if (!HelperUtil.isArray(places)) {
            return;
        }

        const index = places.findIndex((p) => p.id === place.id);

        if (place.isDeleted) {
            places = places.removeAt(index);
        } else if (index === -1) {
            places = places.pushObject(place);
        } else {
            places = places.replaceAt(index, place);
        }

        if (typeof cb === 'function') {
            cb(places);
        }
    }

    /**
     * Determines if argument is array.
     *
     * @static
     * @param {array} arr
     * @return {boolean}
     * @memberof HelperUtil
     */
    static isArray(arr) {
        return Array.isArray(arr);
    }

    /**
     * Checks if StorefrontApp has required keys to run.
     *
     * @static
     * @return {boolean}
     * @memberof HelperUtil
     */
    static hasRequiredKeys() {
        return 'FLEETBASE_KEY' in configuration && 'STOREFRONT_KEY' in configuration;
    }

    /**
     * Determines if index passed is the last index in an array.
     *
     * @static
     * @param {array} [array=[]]
     * @param {number} [index=0]
     * @return {boolean}
     * @memberof HelperUtil
     */
    static isLastIndex(array = [], index = 0) {
        return array.length - 1 === index;
    }

    /**
     * Strips html from a string.
     *
     * @static
     * @param {string} [html='']
     * @return {string}
     * @memberof HelperUtil
     */
    static stripHtml(html = '') {
        if (typeof html === 'string') {
            return html.replace(/<[^>]*>?/gm, '');
        }

        return html;
    }

    /**
     * Strips iframe tags from a string.
     *
     * @static
     * @param {string} [html='']
     * @return {string}
     * @memberof HelperUtil
     */
    static stripIframeTags(html = '') {
        if (typeof html === 'string') {
            return html.replace(/\<iframe (.*)(\<\/iframe\>|\/>)/gm, '');
        }

        return html;
    }

    /**
     * Determines if device is android.
     *
     * @static
     * @return {boolean}
     * @memberof HelperUtil
     */
    static isAndroid() {
        return Platform.OS === 'android';
    }

    /**
     * Determines if device is iphone/ios or apple device.
     *
     * @static
     * @return {boolean}
     * @memberof HelperUtil
     */
    static isApple() {
        return Platform.OS === 'ios';
    }

    /**
     * Determines if argument is null or undefined.
     *
     * @static
     * @param {*} mixed
     * @return {boolean}
     * @memberof HelperUtil
     */
    static isVoid(mixed) {
        return mixed === undefined || mixed === null;
    }

    /**
     * Determines if argument is a valid fleetbase resource.
     *
     * @static
     * @param {*} mixed
     * @return {boolean}
     * @memberof HelperUtil
     */
    static isResource(mixed, type = null) {
        if (typeof type === 'string') {
            return HelperUtil.hasResouceProperties(mixed) && mixed.resource === type;
        }

        return HelperUtil.hasResouceProperties(mixed);
    }

    /**
     * Determines if argument has valid resource properties.
     *
     * @static
     * @param {*} mixed
     * @return {boolean}
     * @memberof HelperUtil
     */
    static hasResouceProperties(mixed) {
        return !HelperUtil.isVoid(mixed) && mixed?.id && typeof mixed?.serialize === 'function' && typeof mixed?.resource === 'string';
    }

    /**
     * Ends the current session from storage, and resets user location.
     *
     * @static
     * @memberof HelperUtil
     */
    static endSession() {
        set('customer', null);
        set('location', null);
        set('places', new Collection());
        emit('customer.signedout', true);
        getCurrentLocation();
    }

    /**
     * Universal error logger
     *
     * @static
     * @param {Error|string} error
     * @param {null|string} message
     * @return {void}
     * @memberof HelperUtil
     */
    static logError(error, message) {
        if (error instanceof Error) {
            return console.log(`[ ${message ?? error.message} ]`, error);
        }

        if (typeof error === 'string') {
            let output = `[ ${error} ]`;

            if (message) {
                output += ` - [ ${message} ]`;
            }

            return console.log(output);
        }

        return console.log(`[ ${message ?? 'Error Logged!'} ]`, error);
    }

    /**
     * Returns a function, that, as long as it continues to be invoked, will not
     * be triggered. The function will be called after it stops being called for
     * N milliseconds. If `immediate` is passed, trigger the function on the
     * leading edge, instead of the trailing.
     *
     * @static
     * @param {Function} callback
     * @param {Number} wait in ms (`300`)
     * @param {Boolean} immediate default false
     * @memberof HelperUtil
     */
    static debounce(callback, wait = 300, immediate = false) {
        let timeout;

        return function () {
            const context = this,
                args = arguments;

            const later = function () {
                timeout = null;
                if (!immediate) {
                    callback.apply(context, args);
                }
            };

            const callNow = immediate && !timeout;

            clearTimeout(timeout);

            timeout = setTimeout(later, wait);

            if (callNow) {
                callback.apply(context, args);
            }
        };
    }

    /**
     * Deep get a value from a target provided it's path.
     *
     * @static
     * @param {*} object
     * @param {*} path
     * @return {*}
     * @memberof HelperUtil
     */
    static deepGet(object, path) {
        let current = object;

        const type = typeof object;
        const isObject = type === 'object';
        const isFunction = type === 'function';
        const isArray = Array.isArray(object);

        const pathType = typeof path;
        const pathIsString = pathType === 'string';
        const pathIsDotted = pathIsString && path.includes('.');
        const pathArray = pathIsDotted ? path.split('.') : [path];

        if (isArray || isObject) {
            for (let i = 0; i < pathArray.length; i++) {
                if (current && current[pathArray[i]] === undefined) {
                    return null;
                } else if (current) {
                    current = current[pathArray[i]];

                    // if is resource then return get on it's attributes
                    if (HelperUtil.isResource(current) && pathArray[i + 1] !== undefined) {
                        const newPath = pathArray.slice(i + 1).join('.');

                        return HelperUtil.deepGet(current.attributes, newPath);
                    }

                    // resolve functions and continue
                    if (typeof current === 'function') {
                        const newPath = pathArray.slice(i + 1).join('.');
                        return HelperUtil.getResolved(current, newPath);
                    }
                }
            }
            return current;
        }

        if (isFunction) {
            return HelperUtil.getResolved(object, path);
        }
    }

    /**
     * Returns the value of a resolved function.
     *
     * @static
     * @param {*} func
     * @param {*} path
     * @memberof HelperUtil
     */
    static getResolved = (func, path) => {
        const resolved = func();
        return Array.isArray(resolved) || typeof resolved === 'object' ? HelperUtil.deepGet(resolved, path) : null;
    };

    /**
     * Returns a configuration value provided it's path.
     *
     * @static
     * @param {String} path
     * @return {Mixed}
     * @memberof HelperUtil
     */
    static config(path) {
        return HelperUtil.deepGet(configuration, path);
    }

    /**
     * Returns the sum of array or parameters passed.
     *
     * @static
     * @param {Array} sum
     * @return {Integer}
     * @memberof HelperUtil
     */
    static sum(numbers = []) {
        if (!HelperUtil.isArray(numbers)) {
            numbers = [...arguments];
        }

        return numbers.reduce((sum, number) => sum + number, 0);
    }

    /**
     * Takes a tailwind color based classname property and returns it's rgb color value
     *
     * @static
     * @param {String} string
     * @return {String}
     * @memberof HelperUtil
     */
    static getColorCode(string) {
        const styles = require('../../styles.json');
        const property = styles[string] ?? null;

        const rgba2rgb = (rgbaString) => {
            const decimals = rgbaString.replace('rgba', 'rgb').split(',');
            decimals.pop();

            return decimals.join(',') + ')';
        };

        if (property) {
            if (string.startsWith('bg-')) {
                // get background color value
                return rgba2rgb(property?.backgroundColor);
            }

            if (string.startsWith('text-')) {
                // get text color value
                return rgba2rgb(property?.color);
            }
        }

        return null;
    }

    /**
     * Takes a string/array of strings, removes all formatting/cruft and returns the raw float value
     * Alias: `parse(string)`
     *
     * Decimal must be included in the regular expression to match floats (defaults to
     * settings.numberSettings.decimal), so if the number uses a non-standard decimal
     * separator, provide it as the second argument.
     *
     * Also matches bracketed negatives (eg. "$ (1.99)" => -1.99)
     *
     * Doesn't throw any errors (`NaN`s become 0) but this may change in future
     *
     * ```js
     *  unformat("£ 12,345,678.90 GBP"); // 12345678.9
     * ```
     *
     * @method unformat
     * @param {String|Array<String>} value The string or array of strings containing the number/s to parse.
     * @param {Number}               decimal Number of decimal digits of the resultant number
     * @return {Float} The parsed number
     */
    static unformat(value, decimal) {
        // Recursively unformat arrays:
        if (isArray(value)) {
            return value.map(function (val) {
                return unformat(val, decimal);
            });
        }

        // Fails silently (need decent errors):
        value = value || 0;

        // Return the value as-is if it's already a number:
        if (typeof value === 'number') {
            return value;
        }

        // Default decimal point comes from settings, but could be set to eg. "," in opts:
        decimal = decimal || numberSettings.decimal;

        // Build regex to strip out everything except digits, decimal point and minus sign:
        const regex = new RegExp('[^0-9-' + decimal + ']', ['g']);
        const unformatted = parseFloat(
            ('' + value)
                .replace(/\((.*)\)/, '-$1') // replace bracketed values with negatives
                .replace(regex, '') // strip out any cruft
                .replace(decimal, '.') // make sure decimal point is standard
        );

        // This will fail silently which may cause trouble, let's wait and see:
        return !isNaN(unformatted) ? unformatted : 0;
    }

    /**
     * Implementation of toFixed() that treats floats more like decimals
     *
     * ```js
     *  (0.615).toFixed(2);           // "0.61" (native toFixed has rounding issues)
     *  toFixed(0.615, 2); // "0.62"
     * ```
     *
     * @method toFixed
     * @param Float}   value         The float to be treated as a decimal numberSettings.
     * @param {Number} [precision=2] The number of decimal digits to keep.
     * @return {String} The given number transformed into a string with the given precission
     */
    static toFixed(value, precision = 2) {
        precision = checkPrecision(precision, numberSettings.precision);
        const power = Math.pow(10, precision);

        // Multiply up by precision, round accurately, then divide and use native toFixed():
        return (Math.round(unformat(value) * power) / power).toFixed(precision);
    }

    /**
     * Check and normalise the value of precision (must be positive integer)
     */
    static checkPrecision(val, base) {
        val = Math.round(Math.abs(val));
        return isNaN(val) ? base : val;
    }

    /**
     * Extends an object with a defaults object, similar to underscore's _.defaults
     *
     * Used for abstracting parameter handling from API methods
     */
    static defaults(object, defs) {
        let key;
        object = Object.assign({}, object);
        defs = defs || {};
        // Iterate over object non-prototype properties:
        for (key in defs) {
            if (Object.hasOwnProperty(defs, key)) {
                // Replace values with defaults only if undefined (allow empty/zero values):
                if (object[key] == null) {
                    object[key] = defs[key];
                }
            }
        }
        return object;
    }

    /**
     * Returns the toString representation of an object even when the object
     * does not support `toString` out of the box, i.e. `EmptyObject`.
     */
    static toString(obj) {
        return Object.prototype.toString.call(obj);
    }

    /**
     * Tests whether supplied parameter is a true object
     */
    static isObject(obj) {
        return obj && toString(obj) === '[object Object]';
    }

    /**
     * Parses a format string or object and returns format obj for use in rendering
     *
     * `format` is either a string with the default (positive) format, or object
     * containing `pos` (required), `neg` and `zero` values (or a function returning
     * either a string or object)
     *
     * Either string or format.pos must contain "%v" (value) to be valid
     */
    static checkCurrencyFormat(format) {
        const defaults = currency.format;

        // Allow function as format parameter (should return string or object):
        if (typeof format === 'function') {
            format = format();
        }

        // Format can be a string, in which case `value` ("%v") must be present:
        if (typeof format === 'string' && format.match('%v')) {
            // Create and return positive, negative and zero formats:
            return {
                pos: format,
                neg: format.replace('-', '').replace('%v', '-%v'),
                zero: format,
            };

            // If no format, or object is missing valid positive value, use defaults:
        } else if (!format || !format.pos || !format.pos.match('%v')) {
            // If defaults is a string, casts it to an object for faster checking next time:
            if (typeof defaults !== 'string') {
                return defaults;
            } else {
                return (currency.format = {
                    pos: defaults,
                    neg: defaults.replace('%v', '-%v'),
                    zero: defaults,
                });
            }
        }
        // Otherwise, assume format was fine:
        return format;
    }

    /**
     * Format a number, with comma-separated thousands and custom precision/decimal places
     * Alias: `format()`
     *
     * Localise by overriding the precision and thousand / decimal separators
     * 2nd parameter `precision` can be an object matching `settings.number`
     *
     * ```js
     * formatNumber(5318008);              // 5,318,008
     * formatNumber(9876543.21, 3, " "); // 9 876 543.210
     * ```
     *
     * @method formatNumber
     * @param {Number}        number The number to be formatted.
     * @param {Integer}       [precision=2] Number of decimal digits
     * @param {String}        [thousand=','] String with the thousands separator.
     * @param {String}        [decimal="."] String with the decimal separator.
     * @return {String} The given number properly formatted.
     */
    static formatNumber(number, precision = 2, thousand = ',', decimal = '.') {
        // Resursively format arrays:
        if (isArray(number)) {
            return numberSettings.map(function (val) {
                return formatNumber(val, precision, thousand, decimal);
            });
        }

        // Clean up number:
        number = HelperUtil.unformat(number);

        // Build options object from second param (if object) or all params, extending defaults:
        const opts = defaults(
            isObject(precision)
                ? precision
                : {
                      precision: precision,
                      thousand: thousand,
                      decimal: decimal,
                  },
            numberSettings
        );

        // Clean up precision
        const usePrecision = checkPrecision(opts.precision);

        // Do some calc:
        const fixedNumber = toFixed(number || 0, usePrecision);
        const negative = fixedNumber < 0 ? '-' : '';
        const base = String(parseInt(Math.abs(fixedNumber), 10));
        const mod = base.length > 3 ? base.length % 3 : 0;

        // Format the number:
        return (
            negative +
            (mod ? base.substr(0, mod) + opts.thousand : '') +
            base.substr(mod).replace(/(\d{3})(?=\d)/g, '$1' + opts.thousand) +
            (usePrecision ? opts.decimal + toFixed(Math.abs(number), usePrecision).split('.')[1] : '')
        );
    }
}

const listCountries = HelperUtil.listCountries;
const isArray = HelperUtil.isArray;
const hasRequiredKeys = HelperUtil.hasRequiredKeys;
const isLastIndex = HelperUtil.isLastIndex;
const stripHtml = HelperUtil.stripHtml;
const stripIframeTags = HelperUtil.stripIframeTags;
const isAndroid = HelperUtil.isAndroid();
const isApple = HelperUtil.isApple();
const isVoid = HelperUtil.isVoid;
const isResource = HelperUtil.isResource;
const endSession = HelperUtil.endSession;
const logError = HelperUtil.logError;
const mutatePlaces = HelperUtil.mutatePlaces;
const debounce = HelperUtil.debounce;
const deepGet = HelperUtil.deepGet;
const config = HelperUtil.config;
const sum = HelperUtil.sum;
const getColorCode = HelperUtil.getColorCode;
const unformat = HelperUtil.unformat;
const toFixed = HelperUtil.toFixed;
const checkPrecision = HelperUtil.checkPrecision;
const defaults = HelperUtil.defaults;
const toString = HelperUtil.toString;
const isObject = HelperUtil.isObject;
const checkCurrencyFormat = HelperUtil.checkCurrencyFormat;
const formatNumber = HelperUtil.formatNumber;

export {
    listCountries,
    isArray,
    hasRequiredKeys,
    isLastIndex,
    stripHtml,
    stripIframeTags,
    isAndroid,
    isApple,
    isVoid,
    isResource,
    endSession,
    logError,
    mutatePlaces,
    debounce,
    deepGet,
    config,
    sum,
    getColorCode,
    unformat,
    toFixed,
    checkPrecision,
    defaults,
    toString,
    isObject,
    checkCurrencyFormat,
    formatNumber,
};
