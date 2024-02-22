import { isVoid } from './Helper';
import getCurrency from './get-currency';
import countryLocaleMap from 'country-locale-map';
import tailwind from 'tailwind';

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
}

const formatCurrency = FormatUtil.currency;
const formatKm = FormatUtil.km;
const capitalize = FormatUtil.capitalize;
const getStatusColors = FormatUtil.getStatusColors;
const truncateString = FormatUtil.truncateString;

export { formatCurrency, formatKm, capitalize, getStatusColors, truncateString };
