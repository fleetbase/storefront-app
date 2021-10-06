import { Collection } from '@fleetbase/sdk';
import { EventRegister } from 'react-native-event-listeners';
import { countries } from 'countries-list';
import { set } from './Storage';
import { getCurrentLocation } from './Geo';
import config from 'config';

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
        return 'FLEETBASE_KEY' in config && 'STOREFRONT_KEY' in config;
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
}

const listCountries = HelperUtil.listCountries;
const isArray = HelperUtil.isArray;
const hasRequiredKeys = HelperUtil.hasRequiredKeys;
const isLastIndex = HelperUtil.isLastIndex;
const stripHtml = HelperUtil.stripHtml;
const isAndroid = HelperUtil.isAndroid();
const isApple = HelperUtil.isApple();
const isVoid = HelperUtil.isVoid;
const endSession = HelperUtil.endSession;

export { listCountries, isArray, hasRequiredKeys, isLastIndex, stripHtml, isAndroid, isApple, isVoid, endSession };
