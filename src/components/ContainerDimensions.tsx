import React, { useState, useEffect } from 'react';
import { View } from 'react-native';

const ContainerDimensions = ({ children, style }) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const onLayout = (event) => {
        const { width, height } = event.nativeEvent.layout;
        setDimensions({ width, height });
    };

    return (
        <View style={[style, { width: '100%', height: '100%', flex: 1 }]} onLayout={onLayout}>
            {dimensions.width > 0 && dimensions.height > 0 ? children(dimensions.width, dimensions.height) : null}
        </View>
    );
};

export default ContainerDimensions;
