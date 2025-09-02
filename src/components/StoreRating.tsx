import React, { useState, useEffect } from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';

const range = (size, startAt = 1) => [...Array(size).keys()].map((i) => i + startAt);

const StoreRating = ({
    rating = 0,
    size = 18,
    icon = faStar,
    count = 5,
    inactiveColor = '$gray-200',
    activeColor = '$yellow-500',
    readOnly = false,
    onRatingChange,
    containerStyle = {},
    containerInnerStyle = {},
    ratingStyle = {},
    ratingContainer = {},
}) => {
    const theme = useTheme();
    const [isReadOnly, setIsReadOnly] = useState(readOnly);
    const [value, setValue] = useState(rating);

    const isWithinRating = (index) => index <= value;
    const setRating = (index) => {
        setValue(index);

        if (typeof nRatingChange === 'function') {
            onRatingChange(index);
        }
    };

    return (
        <YStack style={containerStyle}>
            <XStack alignItems='center' gap='$1' style={[containerInnerStyle]}>
                {range(count).map((index) => (
                    <Pressable key={index} onPress={() => setRating(index)} style={[ratingContainer]} disabled={isReadOnly}>
                        <FontAwesomeIcon icon={faStar} size={size} color={isWithinRating(index) ? theme[activeColor].val : theme[inactiveColor].val} style={[ratingStyle]} />
                    </Pressable>
                ))}
            </XStack>
        </YStack>
    );
};

export default StoreRating;
