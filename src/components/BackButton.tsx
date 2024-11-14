import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Button, useTheme } from 'tamagui';

const BackButton = ({ ...props }) => {
    const theme = useTheme();

    return (
        <Button {...props} justifyContent='center' alignItems='center' backgroundColor='$secondary' circular size={props.size ?? 45}>
            <Button.Icon>
                <FontAwesomeIcon icon={faArrowLeft} color={theme.color.val} />
            </Button.Icon>
        </Button>
    );
};

export default BackButton;
