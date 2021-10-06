import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { getCountries } from '../../utils';
import tailwind from '../../tailwind';
import ReactNativePickerModule from 'react-native-picker-module';

const isString = (string) => typeof string === 'string';

const PhoneInput = (props) => {
    const [value, setValue] = useState(props.value || null);
    const [country, setCountry] = useState(props.country || null);
    const pickerRef = useRef();

    const updatePhoneNumber = (input) => {
        // if manually entering country code
        if (isString(input) && input.startsWith('+')) {
            const manuallySetCountry = getCountries().find((country) => {
                // get default coutnry from value if starting with country code
                if (isString(input) && input.startsWith(`+${country.phone}`)) {
                    return country;
                }
            });

            if (manuallySetCountry) {
                setCountry(manuallySetCountry);

                // patch input
                input = input.replace(`+${manuallySetCountry.phone}`, '');
            }
        }

        setValue(input);

        if (typeof props.onChangeText === 'function') {
            props.onChangeText(`+${country?.phone || '1'}${input}`);
        }
    };

    const getDefaultCountry = () => {
        const defaultCountry = getCountries().find((country) => {
            // get default coutnry from value if starting with country code
            if (isString(value) && value.startsWith(`+${country.phone}`)) {
                return country;
            }

            if (isString(props.defaultCountry) && country.iso2 === props.defaultCountry) {
                return country;
            }
        });

        return defaultCountry;
    };

    const selectCountry = (countryCode) => {
        const selectedCountry = getCountries(countryCode);
        setCountry(selectedCountry);

        if (typeof props.onChangeText === 'function') {
            props.onChangeText(`+${selectedCountry.phone}${value}`);
        }
    };

    useEffect(() => {
        const defaultCountry = getDefaultCountry();
        setCountry(defaultCountry);

        if (defaultCountry && isString(value)) {
            setValue(value.replace(`+${defaultCountry.phone}`, ''));
        }
    }, []);

    return (
        <View>
            <View style={[tailwind('form-input py-2 flex flex-row'), { height: 52 }, props.style || {}]}>
                <TouchableOpacity onPress={() => pickerRef.current.show()}>
                    <View style={tailwind('flex items-center justify-center mr-3')}>
                        <Text style={tailwind('text-2xl')}>{country?.emoji}</Text>
                    </View>
                </TouchableOpacity>
                <TextInput
                    value={value}
                    onChangeText={updatePhoneNumber}
                    keyboardType={'phone-pad'}
                    placeholder={props.placeholder || '+0 (000) 000 - 000'}
                    placeholderTextColor={'rgba(107, 114, 128, 1)'}
                    style={tailwind('w-full')}
                    disabled={props.disabled}
                />
            </View>
            <ReactNativePickerModule
                pickerRef={pickerRef}
                value={null}
                title={'Select Country'}
                items={getCountries().map((c) => ({ label: `${c.emoji} (+${c.phone}) ${c.name}`, value: c.iso2 }))}
                selectedColor="#3485e2"
                onValueChange={selectCountry}
            />
        </View>
    );
};

export default PhoneInput;
