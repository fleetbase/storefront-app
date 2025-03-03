import { isVoid } from './Helper';
import getCurrency from './get-currency';
import countryLocaleMap from 'country-locale-map';
import tailwind from 'tailwind';

import { currency } from './Settings';
import { defaults, checkPrecision, isObject, checkCurrencyFormat, unformat, formatNumber, toFixed } from '../utils';

/**
 *  Utility class for formatting strings.
 *
 * @export
 * @class FormatUtil
 */
export default class FormatUtil {
    /**
     * Formats string into internationalized currency format.
     *
     * @static
     * @param {number} [amount=0]
     * @param {string} [currency='USD']
     * @param {string} [currencyDisplay='symbol']
     * @return {string}
     * @memberof FormatUtil
     */
    static currency(amount = 0, currency = 'USD', currencyDisplay = 'symbol', options = {}) {
        if (isVoid(currency)) {
            // default back to usd
            currency = 'USD';
        }

        const currencyData = getCurrency(currency);
        const locale = countryLocaleMap.getLocaleByAlpha2(currencyData?.iso2)?.replace('_', '-') ?? 'en-US';

        if (currencyData?.precision === 0) {
            options.minimumFractionDigits = 0;
            options.maximumFractionDigits = 0;
        }

        return FormatUtil.formatMoney(
            !currencyData.decimalSeparator ? amount : amount / 100,
            currencyData.symbol,
            currencyData.precision,
            currencyData.thousandSeparator,
            currencyData.decimalSeparator
        );
    }

    /**
     * Capitalize string
     *
     * @static
     * @param {String} string
     * @return {String}
     * @memberof FormatUtil
     */
    static capitalize([first, ...rest]) {
        return first.toUpperCase() + rest.join('');
    }

    /**
     * Format kilometers
     *
     * @static
     * @param {*} km
     * @return {*}
     * @memberof FormatUtil
     */
    static km(km) {
        return `${Math.round(km)}km`;
    }

    /**
     * Truncate string
     * @static
     * @param {String} str
     * @param {Number} length
     * @return {String}
     */
    static truncateString(str, length = 20) {
        if (str.length > length) {
            return str.substring(0, length) + '...';
        }
        return str;
    }

    /**
     * Get styles for statuses
     *
     * @static
     * @param {String} status
     * @return {Object}
     * @memberof FormatUtil
     */
    static getStatusColors(status, inverted = false) {
        status = status?.toLowerCase();

        let statusWrapperStyle = tailwind();
        let statusTextStyle = tailwind();
        let color = 'yellow';

        switch (status) {
            case 'live':
            case 'success':
            case 'operational':
            case 'active':
            case 'completed':
                statusWrapperStyle = inverted ? tailwind('bg-green-900 border-green-700') : tailwind('bg-green-100 border-green-300');
                statusTextStyle = inverted ? tailwind('text-green-50') : tailwind('text-green-800');
                color = 'green';
                break;

            case 'dispatched':
            case 'assigned':
                statusWrapperStyle = inverted ? tailwind('bg-indigo-900 border-indigo-700') : tailwind('bg-indigo-100 border-indigo-300');
                statusTextStyle = inverted ? tailwind('text-indigo-50') : tailwind('text-indigo-800');
                color = 'indigo';
                break;

            case 'disabled':
            case 'canceled':
            case 'incomplete':
            case 'unable':
            case 'failed':
                statusWrapperStyle = inverted ? tailwind('bg-red-900 border-red-700') : tailwind('bg-red-100 border-red-300');
                statusTextStyle = inverted ? tailwind('text-red-50') : tailwind('text-red-800');
                color = 'red';
                break;

            case 'created':
            case 'warning':
            case 'preparing':
            case 'pending':
            case 'enroute':
            case 'driver_enroute':
                statusWrapperStyle = inverted ? tailwind('bg-yellow-900 border-yellow-700') : tailwind('bg-yellow-100 border-yellow-300');
                statusTextStyle = inverted ? tailwind('text-yellow-50') : tailwind('text-yellow-800');
                color = 'yellow';
                break;

            case 'info':
            case 'in_progress':
                statusWrapperStyle = inverted ? tailwind('bg-blue-900 border-blue-700') : tailwind('bg-blue-100 border-blue-300');
                statusTextStyle = inverted ? tailwind('text-blue-50') : tailwind('text-blue-800');
                color = 'blue';
                break;

            default:
                statusWrapperStyle = inverted ? tailwind('bg-yellow-900 border-yellow-700') : tailwind('bg-yellow-100 border-yellow-300');
                statusTextStyle = inverted ? tailwind('text-yellow-50') : tailwind('text-yellow-800');
                color = 'yellow';
                break;
        }

        return { statusWrapperStyle, statusTextStyle, color };
    }

    /**
     * Format a number into currency
     *
     * Usage: formatMoney(number, symbol, precision, thousandsSep, decimalSep, format)
     * defaults: (0, "$", 2, ",", ".", "%s%v")
     *
     * Localise by overriding the symbol, precision, thousand / decimal separators and format
     * Second param can be an object matching `settings.currency` which is the easiest way.
     *
     * ```js
     * // Default usage:
     * formatMoney(12345678); // $12,345,678.00
     *
     * // European formatting (custom symbol and separators), can also use options object as second parameter:
     * formatMoney(4999.99, "€", 2, ".", ","); // €4.999,99
     *
     * // Negative values can be formatted nicely:
     * formatMoney(-500000, "£ ", 0); // £ -500,000
     *
     * // Simple `format` string allows control of symbol position (%v = value, %s = symbol):
     * formatMoney(5318008, { symbol: "GBP",  format: "%v %s" }); // 5,318,008.00 GBP
     * ```
     *
     * @method formatMoney
     * @param {Number}        number Number to be formatted.
     * @param {Object|String} [symbol="$"] String with the currency symbol. For conveniency if can be an object containing all the options of the method.
     * @param {Integer}       [precision=2] Number of decimal digits
     * @param {String}        [thousand=','] String with the thousands separator.
     * @param {String}        [decimal="."] String with the decimal separator.
     * @param {String}        [format="%s%v"] String with the format to apply, where %s is the currency symbol and %v is the value.
     * @return {String} The given number properly formatted as money.
     */
    static formatMoney(number, symbol = '$', precision = 2, thousand = ',', decimal = '.', format = '%s%v') {
        // Resursively format arrays:
        if (Array.isArray(number)) {
            return number.map(function (val) {
                return formatMoney(val, symbol, precision, thousand, decimal, format);
            });
        }

        // Clean up number:
        number = unformat(number);

        // Build options object from second param (if object) or all params, extending defaults:
        const opts = defaults(
            isObject(symbol)
                ? symbol
                : {
                      symbol: symbol,
                      precision: precision,
                      thousand: thousand,
                      decimal: decimal,
                      format: format,
                  },
            currency
        );

        // Check format (returns object with pos, neg and zero):
        const formats = checkCurrencyFormat(opts.format);

        // Clean up precision
        const usePrecision = checkPrecision(opts.precision);

        // fixedNumber's value is not really used, just used to determine negative or not
        const fixedNumber = toFixed(number || 0, usePrecision);
        // Choose which format to use for this value:
        const useFormat = fixedNumber > 0 ? formats.pos : fixedNumber < 0 ? formats.neg : formats.zero;

        // Return with currency symbol added:
        return useFormat.replace('%s', opts.symbol).replace('%v', formatNumber(Math.abs(number), checkPrecision(opts.precision), opts.thousand, opts.decimal));
    }
}

const formatCurrency = FormatUtil.currency;
const formatKm = FormatUtil.km;
const capitalize = FormatUtil.capitalize;
const getStatusColors = FormatUtil.getStatusColors;
const truncateString = FormatUtil.truncateString;
const removeNonNumber = (string = '') => string.replace(/[^\d]/g, '');
const removeLeadingSpaces = (string = '') => string.replace(/^\s+/g, '');

export { formatCurrency, formatKm, capitalize, getStatusColors, truncateString, removeNonNumber, removeLeadingSpaces };
