import React, { useState } from 'react';
import { Image as TamaguiImage } from 'tamagui';
import FastImage from 'react-native-fast-image';

const Image = ({ fast = false, source, fallbackSource, ...props }) => {
    const [currentSource, setCurrentSource] = useState(source);

    const handleError = () => {
        if (fallbackSource) {
            setCurrentSource(fallbackSource);
        }
    };

    if (fast) {
        return <FastImage {...props} source={currentSource} onError={handleError} style={[{ ...props }]} />;
    }

    return <TamaguiImage {...props} source={currentSource} onError={handleError} />;
};

export default Image;
