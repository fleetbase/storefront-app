import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faMinus, faPercent, faMoneyBill } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../../utils';
import tailwind from '../../tailwind';

const isString = (string) => typeof string === 'string';

const TipInput = (props) => {
    const [value, setValue] = useState(props.value ?? 100);
    const [currency, setCurrency] = useState(props.currency ?? 'USD');
    const [isPercent, setIsPercent] = useState(props.isPercent ?? false);

    const formattedValue = (() => {
        if (isPercent) {
            return `${parseInt(value)}%`;
        }

        return formatCurrency(value / 100, currency);
    })();

    const decrementDisabled = (() => {
        if (isPercent) {
            return value === 5;
        }

        return value === 100;
    })();

    const updateValue = (newValue, isPercent) => {
        setValue(newValue);

        if (typeof props.onChange === 'function') {
            props.onChange(newValue, isPercent);
        }
    };

    const increment = () => {
        if (isPercent) {
            return updateValue(value + 5, isPercent);
        }

        updateValue(value + 50, isPercent);
    };

    const decrement = () => {
        if (isPercent) {
            if (value === 5) {
                return;
            }
            
            return updateValue(value - 5, isPercent);
        }

        if (value == 100) {
            return;
        }

        updateValue(value - 50, isPercent);
    };

    const togglePercent = (enabled = false) => {
        setIsPercent(enabled);

        if (enabled) {
            updateValue(5, enabled);
        } else {
            updateValue(100, enabled);
        }
    };

    useEffect(() => {
        // if default value is percentage, switch to isPercent true
        if (typeof value === 'string' && value.endsWith('%')) {
            setValue(parseInt(value));
            setIsPercent(true);
        }
    }, []);

    return (
        <View>
            <View style={[tailwind('flex flex-row items-center'), { height: 52 }, props.style || {}]}>
                <View style={tailwind('flex flex-row items-center mr-2')}>
                    <TouchableOpacity style={tailwind('mr-2')} onPress={() => togglePercent(true)}>
                        <View style={tailwind(`flex items-center justify-center w-7 h-7 rounded-full ${isPercent ? 'bg-green-100' : 'bg-gray-100'}`)}>
                            <FontAwesomeIcon icon={faPercent} size={12} style={tailwind(`${isPercent ? 'text-green-700' : 'text-gray-700'}`)} />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => togglePercent(false)}>
                        <View style={tailwind(`flex items-center justify-center w-7 h-7 rounded-full ${!isPercent ? 'bg-green-100' : 'bg-gray-100'}`)}>
                            <FontAwesomeIcon icon={faMoneyBill} size={12} style={tailwind(`${!isPercent ? 'text-green-700' : 'text-gray-700'}`)} />
                        </View>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={decrement} disabled={decrementDisabled}>
                    <View style={tailwind('flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full')}>
                        <FontAwesomeIcon icon={faMinus} size={12} style={tailwind('text-gray-700')} />
                    </View>
                </TouchableOpacity>
                <View style={tailwind('mx-2 rounded-md flex py-2 w-14 justify-center items-center flex-row bg-gray-50')}>
                    <Text>{formattedValue}</Text>
                </View>
                <TouchableOpacity onPress={increment}>
                    <View style={tailwind('flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full')}>
                        <FontAwesomeIcon icon={faPlus} size={12} style={tailwind('text-gray-700')} />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default TipInput;
