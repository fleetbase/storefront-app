import React from 'react';
import { Text } from 'react-native';
import { formatCurrency } from 'utils';
import { calculatePercentage } from 'utils/Calculate';

const TipView = ({ style, tip, subtotal, currency }) => {
    if (typeof tip === 'string' && tip.endsWith('%')) {
        const tipAmount = formatCurrency(calculatePercentage(parseInt(tip), subtotal), currency);

        return <Text style={style}>{`${tip} (${tipAmount})`}</Text>;
    }

    return <Text style={style}>{formatCurrency(tip, currency)}</Text>;
};

export default TipView;
