import isVoid from './is-void';

export default function formatCurrency(amount = 0, currency = 'USD', currencyDisplay = 'symbol') {
    if (isVoid(currency)) {
        // default back to usd
        currency = 'USD';
    }

    return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay }).format(amount);
}