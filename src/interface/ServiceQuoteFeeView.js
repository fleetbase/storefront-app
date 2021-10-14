import React from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { formatCurrency } from 'utils';
import tailwind from 'tailwind';

const ServiceQuoteFeeView = ({ serviceQuote, isFetchingServiceQuote, serviceQuoteError, style }) => {
    let render = <ActivityIndicator />;

    if (!isFetchingServiceQuote && serviceQuote?.formattedAmount) {
        render = <Text style={style} numberOfLines={1}>{serviceQuote.formattedAmount}</Text>;
    } else if (!isFetchingServiceQuote) {
        render = (
            <Text style={style} numberOfLines={1} style={tailwind('w-3/4')}>
                ...
            </Text>
        );
    }

    if (serviceQuoteError) {
        render = (
            <Text style={style} numberOfLines={1} style={tailwind('text-red-500 w-1/2')}>
                {serviceQuoteError}
            </Text>
        );
    }

    return render;
};

export default ServiceQuoteFeeView;
