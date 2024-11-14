import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { getColorCode } from 'utils';
import tailwind from 'tailwind';

const range = (size, startAt = 1) => [...Array(size).keys()].map((i) => i + startAt);

const Rating = (props) => {
    const [readonly, setReadonly] = useState(props.readonly ?? false);
    const [value, setValue] = useState(props.value ?? 0);

    const size = props.size ?? 18;
    const icon = props.icon ?? faStar;
    const count = props.count ?? 5;

    let inactiveColor = props.inactiveColor ?? 'text-gray-200';
    let activeColor = props.activeColor ?? 'text-yellow-500';

    if (inactiveColor.startsWith('text')) {
        inactiveColor = getColorCode(inactiveColor);
    }

    if (activeColor.startsWith('text')) {
        activeColor = getColorCode(activeColor);
    }

    const isWithinRating = (index) => index <= value;

    const setRating = (index) => {
        setValue(index);

        if (typeof props.onRatingChange === 'function') {
            props.onRatingChange(index);
        }
    };

    return (
        <View style={[props.containerStyle]}>
            <View style={[tailwind('flex flex-row items-center'), props.containerInnerStyle]}>
                {range(count).map((index) => (
                    <TouchableOpacity key={index} onPress={() => setRating(index)} style={[props.ratingContainer]} disabled={readonly}>
                        <FontAwesomeIcon icon={icon} size={size} style={[props.ratingStyle, { color: isWithinRating(index) ? activeColor : inactiveColor }]} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

export default Rating;
