import { isVoid } from './Helper';

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
    static currency(amount = 0, currency = 'USD', currencyDisplay = 'symbol') {
        if (isVoid(currency)) {
            // default back to usd
            currency = 'USD';
        }

        return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay }).format(amount);
    }
}

const formatCurrency = FormatUtil.currency;

export { formatCurrency };
