import React from 'react';
import { View } from 'react-native-web';

// defaults from native library
const DEFAULT_BLUR_AMOUNT = 10;
const DEFAULT_BLUR_TYPE = 'dark';

const getBackgroundColor = (blurType) => {
    switch (blurType) {
        case 'light':
            return 'rgba(255,255,255,0.5)';
        case 'dark':
            return 'rgba(0,0,0,0.5)';
        default:
            // will just blur without any tinting.
            return 'transparent';
    }
};

const BlurView = ({ blurType = DEFAULT_BLUR_TYPE, blurAmount = DEFAULT_BLUR_AMOUNT, style }) => (
    <View
        style={[
            {
                backdropFilter: `blur(${blurAmount}px)`,
                backgroundColor: getBackgroundColor(blurType),
            },
            style,
        ]}
    />
);

export { BlurView };
