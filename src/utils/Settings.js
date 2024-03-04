const currency = {
    symbol: '$', // default currency symbol is '$'
    format: '%s%v', // controls output: %s = symbol, %v = value (can be object, see docs)
    decimal: '.', // decimal point separator
    thousand: ',', // thousands separator
    precision: 2, // decimal places
    grouping: 3, // digit grouping (not implemented yet)
};
const number = {
    precision: 0, // default precision on numbers is 0
    grouping: 3, // digit grouping (not implemented yet)
    thousand: ',',
    decimal: '.',
};

export { currency, number };
