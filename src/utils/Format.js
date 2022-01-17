import { isVoid } from './Helper';
import getCurrency from './get-currency';
import countryLocaleMap from 'country-locale-map';


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

        console.log(`Found locale ${locale} for currency ${currency} !`);
        console.log(`Found currency data for currency ${currency} !`, currencyData);
        
        if (currencyData?.precision === 0) {
            options.minimumFractionDigits = 0;
            options.maximumFractionDigits = 0;
        }

        return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay, ...options }).format(amount);
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
}

const formatCurrency = FormatUtil.currency;
const formatKm = FormatUtil.km;
const capitalize = FormatUtil.capitalize;

export { formatCurrency, formatKm, capitalize };
