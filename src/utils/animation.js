import { Animated } from 'react-native';
import LocationPicker from '../components/LocationPicker';

export function createHiddenLocationPickerAnimation(navigation, scrollY, headerHeight, additionalOptions = {}) {
    scrollY.addListener(({ value }) => {
        const opacity = Math.max(0, 1 - value / headerHeight);
        const translateY = Math.min(0, -value);

        navigation.setOptions({
            headerLeft: () => {
                return (
                    <LocationPicker
                        triggerStyle={{
                            transform: [{ translateY }],
                            backgroundColor: `rgba(0,0,0, ${opacity})`,
                            borderColor: `rgba(0,0,0, ${opacity})`,
                            borderWidth: 1,
                            borderRadius: 10,
                            paddingHorizontal: 6,
                            paddingVertical: 3,
                        }}
                        onPressAddNewLocation={(navigation) => navigation.navigate('StoreHomeTab', { screen: 'AddNewLocation' })}
                    />
                );
            },
        });
    });
}
