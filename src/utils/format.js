import getCurrency from './currencies';
import countryLocaleMap from 'country-locale-map';
import { isNone, isArray, isObject, defaults } from './';

export const defaultCurrenyOptions = {
    symbol: '$', // default currency symbol is '$'
    format: '%s%v', // controls output: %s = symbol, %v = value (can be object, see docs)
    decimal: '.', // decimal point separator
    thousand: ',', // thousands separator
    precision: 2, // decimal places
    grouping: 3, // digit grouping (not implemented yet)
};

export const defaultNumberOptions = {
    precision: 0, // default precision on numbers is 0
    grouping: 3, // digit grouping (not implemented yet)
    thousand: ',',
    decimal: '.',
};

export function toFixed(value, precision = 2) {
    precision = checkPrecision(precision, defaultNumberOptions.precision);
    const power = Math.pow(10, precision);

    // Multiply up by precision, round accurately, then divide and use native toFixed():
    return (Math.round(unformat(value) * power) / power).toFixed(precision);
}

export function formatNumber(number, precision = 2, thousand = ',', decimal = '.') {
    // Resursively format arrays:
    if (isArray(number)) {
        return number.map(function (val) {
            return formatNumber(val, precision, thousand, decimal);
        });
    }

    // Clean up number:
    number = unformat(number);

    // Build options object from second param (if object) or all params, extending defaults:
    const opts = defaults(
        isObject(precision)
            ? precision
            : {
                  precision: precision,
                  thousand: thousand,
                  decimal: decimal,
              },
        defaultNumberOptions
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

export function unformat(value, decimal = '') {
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
    decimal = decimal || defaultNumberOptions.decimal;

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

export function checkCurrencyFormat(format) {
    const defaults = defaultCurrenyOptions.format;

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
            return (defaultCurrenyOptions.format = {
                pos: defaults,
                neg: defaults.replace('%v', '-%v'),
                zero: defaults,
            });
        }
    }
    // Otherwise, assume format was fine:
    return format;
}

export function checkPrecision(val, base) {
    val = Math.round(Math.abs(val));
    return isNaN(val) ? base : val;
}

export function formatCurrency(amount = 0, currency = 'USD', currencyDisplay = 'symbol', options = {}) {
    if (isNone(currency)) {
        currency = 'USD';
    }

    const currencyData = getCurrency(currency);
    const locale = countryLocaleMap.getLocaleByAlpha2(currencyData.iso2).replace('_', '-');

    if (currencyData?.precision === 0) {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    }

    return formatMoney(!currencyData.decimalSeparator ? amount : amount / 100, currencyData.symbol, currencyData.precision, currencyData.thousandSeparator, currencyData.decimalSeparator);
}

export function capitalize([first, ...rest]) {
    return first.toUpperCase() + rest.join('');
}

export function km(km) {
    return `${Math.round(km)}km`;
}

export function truncateString(str, length = 20) {
    if (str.length > length) {
        return str.substring(0, length) + '...';
    }
    return str;
}

export function formatMoney(number, symbol = '$', precision = 2, thousand = ',', decimal = '.', format = '%s%v') {
    // Resursively format arrays:
    if (isArray(number)) {
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
        defaultCurrenyOptions
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

export function removeNonNumber(string = '') {
    return string.replace(/[^\d]/g, '');
}

export function removeLeadingSpaces(string = '') {
    return string.replace(/^\s+/g, '');
}

export function numbersOnly(input, castInt = true) {
    const numbers = String(input).replace(/[^0-9]/g, '');
    return castInt ? parseInt(numbers) : numbers;
}
