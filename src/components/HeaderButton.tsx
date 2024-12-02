import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBolt } from '@fortawesome/free-solid-svg-icons';
import { Button, useTheme } from 'tamagui';

const HeaderButton = ({ icon, size, onPress, ...props }) => {
    const theme = useTheme();

    const handlePress = function () {
        if (typeof onPress === 'function') {
            onPress();
        }
    };

    return (
        <Button onPress={handlePress} justifyContent='center' alignItems='center' backgroundColor='$secondary' circular size={size ?? 45} {...props}>
            <Button.Icon>
                <FontAwesomeIcon icon={icon ? icon : faBolt} color={theme.color.val} />
            </Button.Icon>
        </Button>
    );
};

export default HeaderButton;
