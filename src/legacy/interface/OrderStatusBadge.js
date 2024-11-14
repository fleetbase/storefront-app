import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { getStatusColors } from 'utils';
import { tailwind } from 'tailwind';
import { format } from 'date-fns';

const OrderStatusBadge = ({ status, onPress, wrapperStyle, containerStyle, style, textStyle }) => {
    const { statusWrapperStyle, statusTextStyle } = getStatusColors(status);

    return (
        <View style={[tailwind('flex'), wrapperStyle]}>
            <TouchableOpacity style={[tailwind('border rounded-md'), statusWrapperStyle, containerStyle]} onPress={onPress}>
                <View style={[tailwind('px-4 py-1 flex flex-row items-center justify-center'), style]}>
                    <Text style={[tailwind('lowercase'), statusTextStyle, textStyle]}>{status}</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default OrderStatusBadge;
