import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import { XStack, Button, Text } from 'tamagui';

const QuantityButton = ({
    quantity = 1,
    onIncrement,
    onDecrement,
    onChange,
    min = 1,
    max = 9999,
    buttonSize = '$2',
    disabled = false,
    wrapperProps = {},
    incrementButtonProps = {},
    decrementButtonProps = {},
    style = {},
}) => {
    const [currentQuantity, setCurrentQuantity] = useState(quantity);

    const handleIncrement = () => {
        if (currentQuantity < max) {
            const newQuantity = currentQuantity + 1;
            setCurrentQuantity(newQuantity);
            if (typeof onIncrement === 'function') {
                onIncrement(newQuantity);
            }
            if (typeof onChange === 'function') {
                onChange(newQuantity);
            }
        }
    };

    const handleDecrement = () => {
        if (currentQuantity > min) {
            const newQuantity = currentQuantity - 1;
            setCurrentQuantity(newQuantity);
            if (typeof onIncrement === 'function') {
                onIncrement(newQuantity);
            }
            if (typeof onChange === 'function') {
                onChange(newQuantity);
            }
        }
    };

    return (
        <XStack
            alignItems='center'
            space='$2'
            borderRadius='$4'
            borderWidth={2}
            padding='$1'
            borderColor='$borderColor'
            bg='$secondary'
            opacity={disabled ? 0.5 : 1}
            style={style}
            {...wrapperProps}
        >
            <Button
                size={buttonSize}
                borderRadius='$2'
                onPress={handleDecrement}
                disabled={currentQuantity <= min || disabled}
                theme={currentQuantity > min ? 'primary' : 'gray'}
                hoverStyle={{
                    scale: 0.75,
                    opacity: 0.5,
                }}
                pressStyle={{
                    scale: 0.75,
                    opacity: 0.5,
                }}
                {...incrementButtonProps}
            >
                <Button.Icon>
                    <FontAwesomeIcon icon={faMinus} />
                </Button.Icon>
            </Button>
            <Text fontSize='$5' fontWeight='bold' textAlign='center' flex={1}>
                {currentQuantity}
            </Text>
            <Button
                size={buttonSize}
                borderRadius='$2'
                onPress={handleIncrement}
                disabled={currentQuantity >= max || disabled}
                theme={currentQuantity < max ? 'primary' : 'gray'}
                hoverStyle={{
                    scale: 0.75,
                    opacity: 0.5,
                }}
                pressStyle={{
                    scale: 0.75,
                    opacity: 0.5,
                }}
                {...decrementButtonProps}
            >
                <Button.Icon>
                    <FontAwesomeIcon icon={faPlus} />
                </Button.Icon>
            </Button>
        </XStack>
    );
};

export default QuantityButton;
