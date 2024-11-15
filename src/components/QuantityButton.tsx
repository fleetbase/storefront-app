import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import { XStack, Button, Text } from 'tamagui';

const QuantityButton = ({ quantity = 1, onIncrement, onDecrement, onChange, min = 1, max = 9999, wrapperProps = {}, incrementButtonProps = {}, decrementButtonProps = {}, style = {} }) => {
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
        <XStack alignItems='center' space='$2' borderRadius='$4' borderWidth={2} padding='$1' borderColor='$borderColor' bg='$secondary' style={style} {...wrapperProps}>
            <Button size='$2' borderRadius='$2' onPress={handleDecrement} disabled={currentQuantity <= min} theme={currentQuantity > min ? 'primary' : 'gray'} {...incrementButtonProps}>
                <Button.Icon>
                    <FontAwesomeIcon icon={faMinus} />
                </Button.Icon>
            </Button>
            <Text fontSize='$5' fontWeight='bold' textAlign='center' flex={1}>
                {currentQuantity}
            </Text>
            <Button size='$2' borderRadius='$2' onPress={handleIncrement} disabled={currentQuantity >= max} theme={currentQuantity < max ? 'primary' : 'gray'} {...decrementButtonProps}>
                <Button.Icon>
                    <FontAwesomeIcon icon={faPlus} />
                </Button.Icon>
            </Button>
        </XStack>
    );
};

export default QuantityButton;
