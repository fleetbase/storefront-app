import React from 'react';
import { Text } from 'react-native';
import { formatCurrency } from 'utils';
import { calculatePercentage } from 'utils/Calculate';

const TipView = ({ style, tip, subtotal, currency }) => {
    if (typeof tip === 'string' && tip.endsWith('%')) {
        const tipAmount = formatCurrency(calculatePercentage(parseInt(tip), subtotal) / 100, currency);

        return <Text style={style}>{`${tip} (${tipAmount})`}</Text>;
    }

    return <Text style={style}>{formatCurrency(tip / 100, currency)}</Text>;
};

export default TipView;
