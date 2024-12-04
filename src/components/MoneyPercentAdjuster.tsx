import React, { useState, useEffect } from 'react';
import { Text, XStack, YStack, Button, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faMinus, faPercent, faMoneyBill } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/format';
import StorefrontConfig from '../../storefront.config';

const MoneyPercentAdjuster = ({ value: initialValue = 100, currency = 'USD', isPercent: initialIsPercent = false, style, onChange }) => {
    const theme = useTheme();
    const [value, setValue] = useState(initialValue);
    const [isPercent, setIsPercent] = useState(initialIsPercent);
    const formattedValue = isPercent ? `${value}%` : formatCurrency(value, currency);
    const decrementDisabled = isPercent ? value === 5 : value === 100;
    const incrementTipBy = StorefrontConfig.incrementTipBy || 50;

    const updateValue = (newValue, percent) => {
        setValue(newValue);
        if (onChange) {
            onChange(newValue, percent);
        }
    };

    const increment = () => updateValue(value + (isPercent ? 5 : incrementTipBy), isPercent);
    const decrement = () => {
        if (!decrementDisabled) {
            updateValue(value - (isPercent ? 5 : incrementTipBy), isPercent);
        }
    };

    const togglePercent = (enabled) => {
        setIsPercent(enabled);
        updateValue(enabled ? 5 : 100, enabled);
    };

    useEffect(() => {
        if (typeof value === 'string' && value.endsWith('%')) {
            setValue(parseInt(value, 10));
            setIsPercent(true);
        }
    }, []);

    return (
        <XStack ai='center' justifyContent='space-between' style={style}>
            <XStack flex={1} space='$3'>
                <Button onPress={() => togglePercent(true)} size='$4' circular backgroundColor={isPercent ? '$green-400' : '$gray-200'}>
                    <Button.Icon>
                        <FontAwesomeIcon icon={faPercent} color={theme['green-900'].val} size={20} />
                    </Button.Icon>
                </Button>
                <Button onPress={() => togglePercent(false)} size='$4' circular backgroundColor={!isPercent ? '$green-400' : '$gray-200'}>
                    <Button.Icon>
                        <FontAwesomeIcon icon={faMoneyBill} color={theme['green-900'].val} size={24} />
                    </Button.Icon>
                </Button>
            </XStack>

            <XStack flex={1} justifyContent='flex-end' space='$2'>
                <Button onPress={decrement} size='$4' circular backgroundColor='$gray-200' disabled={decrementDisabled}>
                    <Button.Icon>
                        <FontAwesomeIcon icon={faMinus} />
                    </Button.Icon>
                </Button>
                <YStack px='$4' py='$2' backgroundColor='$gray-200' borderRadius='$4' justifyContent='center' alignItems='center' minWidth={100}>
                    <Text color='$textPrimary' fontSize='$6' fontWeight='bold'>
                        {formattedValue}
                    </Text>
                </YStack>
                <Button onPress={increment} size='$4' circular backgroundColor='$gray-200'>
                    <Button.Icon>
                        <FontAwesomeIcon icon={faPlus} />
                    </Button.Icon>
                </Button>
            </XStack>
        </XStack>
    );
};

export default MoneyPercentAdjuster;
