export default function formatCurrency(amount = 0, currency = 'USD', currencyDisplay = 'symbol') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay }).format(amount);
}