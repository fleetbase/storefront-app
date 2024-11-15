import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Button, useTheme } from 'tamagui';

const BackButton = ({ ...props }) => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { onPress } = props;

    const handlePress = function () {
        if (typeof onPress === 'function') {
            onPress();
        } else {
            navigation.goBack();
        }
    };

    return (
        <Button onPress={handlePress} justifyContent='center' alignItems='center' backgroundColor='$secondary' circular size={props.size ?? 45} {...props}>
            <Button.Icon>
                <FontAwesomeIcon icon={faArrowLeft} color={theme.color.val} />
            </Button.Icon>
        </Button>
    );
};

export default BackButton;
