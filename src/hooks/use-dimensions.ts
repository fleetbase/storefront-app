import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

export function useDimensions() {
    const [dimensions, setDimensions] = useState({
        screenWidth: Dimensions.get('window').width,
        screenHeight: Dimensions.get('window').height,
    });

    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                screenWidth: Dimensions.get('window').width,
                screenHeight: Dimensions.get('window').height,
            });
        };

        // Listen for dimension changes
        const subscription = Dimensions.addEventListener('change', updateDimensions);

        return () => subscription.remove(); // Cleanup listener on unmount
    }, []);

    return dimensions;
}

export default useDimensions;
