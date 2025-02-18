import React from 'react';
import { Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBolt } from '@fortawesome/free-solid-svg-icons';
import { Button, useTheme } from 'tamagui';

const isAndroid = Platform.OS === 'android';
const DEFAULT_BUTTON_SIZE = isAndroid ? 33 : 35;
const HeaderButton = ({ icon, size = DEFAULT_BUTTON_SIZE, onPress, ...props }) => {
    const theme = useTheme();

    const handlePress = function () {
        if (typeof onPress === 'function') {
            onPress();
        }
    };

    return (
        <Button onPress={handlePress} justifyContent='center' alignItems='center' backgroundColor='$secondary' circular size={size} {...props}>
            <Button.Icon>
                <FontAwesomeIcon icon={icon ? icon : faBolt} color={theme.color.val} />
            </Button.Icon>
        </Button>
    );
};

export default HeaderButton;
