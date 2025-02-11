import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FlatList, TextInput, Keyboard } from 'react-native';
import { countries, getEmojiFlag } from 'countries-list';
import BottomSheet, { BottomSheetView, BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme, View, Text, Button, XStack, YStack, Input } from 'tamagui';
import { Portal } from '@gorhom/portal';
import { getCountryByPhoneCode, getCountryByISO2, parsePhoneNumber, debounce, storefrontConfig } from '../utils';
import useAppTheme from '../hooks/use-app-theme';
import { getLocales } from 'react-native-localize';

function getDefaultValues(value = null, fallbackCountry = 'US') {
    if (typeof value === 'string' && value.startsWith('+')) {
        const segments = parsePhoneNumber(value);
        return {
            phoneNumber: segments.localNumber ?? '',
            ...segments,
        };
    }

    const country = getCountryByISO2(fallbackCountry);
    return {
        phoneNumber: '',
        country,
    };
}

const countryList = Object.entries(countries).map(([code, details]) => ({
    code,
    name: details.name,
    phone: details.phone[0],
    emoji: getEmojiFlag(code),
}));

const getDefaultCountryCode = (defaultValue = null, fallback = 'US') => {
    const locales = getLocales();
    const defaultLocale = storefrontConfig('defaultLocale', 'en');
    const currentLocale = locales.find((registeredLocale) => {
        return registeredLocale.languageCode === defaultLocale;
    });

    if (currentLocale) {
        return currentLocale.countryCode;
    }

    return defaultValue ?? fallback;
};

const PhoneInput = ({ value, onChange, bg, width = '100%', defaultCountryCode = null, size = '$5', wrapperProps = {} }) => {
    const countryCode = getDefaultCountryCode(defaultCountryCode);
    const defaultValue = getDefaultValues(value, countryCode);
    const theme = useTheme();
    const { isDarkMode } = useAppTheme();
    const [selectedCountry, setSelectedCountry] = useState(defaultValue.country);
    const [phoneNumber, setPhoneNumber] = useState(defaultValue.phoneNumber);
    const [searchTerm, setSearchTerm] = useState('');
    const bottomSheetRef = useRef<BottomSheet>(null);
    const phoneInputRef = useRef(null);
    const searchInputRef = useRef(null);
    const snapPoints = useMemo(() => ['50%', '75%'], []);
    const backgroundColor = bg ? bg : isDarkMode ? '$surface' : '$white';

    const filteredCountries = useMemo(() => {
        return countryList.filter(({ name, code, phone }) => {
            const lowerSearch = searchTerm.toLowerCase();
            return name.toLowerCase().includes(lowerSearch) || code.toLowerCase().includes(lowerSearch) || String(phone).includes(lowerSearch);
        });
    }, [searchTerm]);

    const openBottomSheet = () => {
        phoneInputRef.current?.blur();
        bottomSheetRef.current?.collapse();
        searchInputRef.current?.focus();
    };

    const closeBottomSheet = () => {
        Keyboard.dismiss();
        bottomSheetRef.current?.close();
        phoneInputRef.current?.focus();
    };

    const handleInputFocus = () => {
        bottomSheetRef.current?.close();
    };

    const handleCountrySelect = (country: { code: string; phone: string }) => {
        setSelectedCountry(country);
        closeBottomSheet();
    };

    useEffect(() => {
        if (onChange) {
            const combinedValue = `+${selectedCountry.phone}${phoneNumber}`;
            onChange(combinedValue, phoneNumber, selectedCountry);
        }
    }, [selectedCountry, phoneNumber, onChange]);

    return (
        <YStack space='$4' {...wrapperProps}>
            <XStack width='100%' paddingHorizontal={0} shadowOpacity={0} shadowRadius={0} borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$5' bg={backgroundColor}>
                <Button
                    size={size}
                    onPress={openBottomSheet}
                    bg={backgroundColor}
                    borderWidth={0}
                    width={80}
                    maxWidth={80}
                    borderRadius='$5'
                    borderBottomRightRadius={0}
                    borderTopRightRadius={0}
                >
                    <XStack alignItems='center' space='$2'>
                        <Text fontSize={size}>{getEmojiFlag(selectedCountry.code)}</Text>
                        <Text fontSize={size}>+{selectedCountry.phone}</Text>
                    </XStack>
                </Button>
                <Input
                    size={size}
                    ref={phoneInputRef}
                    flex={1}
                    placeholder='Enter phone number'
                    keyboardType='phone-pad'
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    onFocus={handleInputFocus}
                    bg={backgroundColor}
                    color='$textPrimary'
                    borderRadius={0}
                    borderTopRightRadius='$3'
                    borderBottomRightRadius='$3'
                    overflow='hidden'
                />
            </XStack>

            <Portal hostName='MainPortal'>
                <BottomSheet
                    ref={bottomSheetRef}
                    index={-1}
                    snapPoints={snapPoints}
                    keyboardBehavior='extend'
                    keyboardBlurBehavior='none'
                    enableDynamicSizing={false}
                    enablePanDownToClose={true}
                    enableOverDrag={false}
                    style={{ flex: 1, width: '100%' }}
                    backgroundStyle={{ backgroundColor: theme.background.val, borderWidth: 1, borderColor: theme.borderColorWithShadow.val }}
                    handleIndicatorStyle={{ backgroundColor: theme.secondary.val }}
                >
                    <YStack px='$2'>
                        <BottomSheetTextInput
                            ref={searchInputRef}
                            placeholder='Search country'
                            onChangeText={setSearchTerm}
                            autoCapitalize='none'
                            autoComplete='off'
                            autoCorrect={false}
                            style={{
                                color: theme.textPrimary.val,
                                backgroundColor: theme.surface.val,
                                borderWidth: 1,
                                borderColor: theme.borderColor.val,
                                padding: 14,
                                borderRadius: 12,
                                fontSize: 13,
                                marginBottom: 10,
                            }}
                        />
                    </YStack>
                    <BottomSheetView
                        style={{ flex: 1, backgroundColor: theme.background.val, paddingHorizontal: 8, borderColor: theme.borderColorWithShadow.val, borderWidth: 1, borderTopWidth: 0 }}
                    >
                        <BottomSheetFlatList
                            data={filteredCountries}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <Button
                                    size='$4'
                                    onPress={() => handleCountrySelect({ code: item.code, phone: item.phone })}
                                    bg='$surface'
                                    justifyContent='space-between'
                                    space='$2'
                                    mb='$2'
                                    px='$3'
                                    hoverStyle={{
                                        scale: 0.9,
                                        opacity: 0.5,
                                    }}
                                    pressStyle={{
                                        scale: 0.9,
                                        opacity: 0.5,
                                    }}
                                >
                                    <XStack alignItems='center' space='$2'>
                                        <Text>{item.emoji}</Text>
                                        <Text>{item.name}</Text>
                                    </XStack>
                                    <Text>+{item.phone}</Text>
                                </Button>
                            )}
                        />
                    </BottomSheetView>
                </BottomSheet>
            </Portal>
        </YStack>
    );
};

export default PhoneInput;
