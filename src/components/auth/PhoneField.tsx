import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput } from 'react-native';
import { countries, getEmojiFlag } from 'countries-list';
import { getLocales } from 'react-native-localize';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { storefrontConfig } from '../../utils';
import { Sheet, TextField, UIText, radius } from '../../ui';

type Country = { code: string; name: string; dial: string; flag: string };

const COUNTRIES: Country[] = Object.entries(countries)
    .map(([code, details]: [string, any]) => ({ code, name: details.name, dial: String(details.phone?.[0] ?? ''), flag: getEmojiFlag(code as any) }))
    .filter((country) => country.dial)
    .sort((a, b) => a.name.localeCompare(b.name));

function defaultCountry(): Country {
    const configured = storefrontConfig('defaultCountry');
    const fromDevice = getLocales()?.[0]?.countryCode;
    return COUNTRIES.find((country) => country.code === configured) ?? COUNTRIES.find((country) => country.code === fromDevice) ?? COUNTRIES.find((country) => country.code === 'US')!;
}

/** Splits "+6591234567" into its country and local number, best match first. */
function split(value: string | null | undefined): { country: Country; number: string } {
    const digits = (value ?? '').replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) {
        const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((country) => digits.slice(1).startsWith(country.dial));
        if (match) return { country: match, number: digits.slice(1 + match.dial.length) };
    }
    return { country: defaultCountry(), number: digits.replace('+', '') };
}

/**
 * A mobile number: a country button (flag and dial code, searchable list) and the local
 * number. Reports the full number in E.164 form ("+6591234567").
 */
export default function PhoneField({
    value,
    onChange,
    onSubmit,
    invalid = false,
    autoFocus = false,
}: {
    value: string;
    onChange: (phone: string) => void;
    onSubmit?: () => void;
    invalid?: boolean;
    autoFocus?: boolean;
}) {
    const theme = useTheme();
    const { t } = useLanguage();
    const initial = useMemo(() => split(value), []); // eslint-disable-line react-hooks/exhaustive-deps
    const [country, setCountry] = useState<Country>(initial.country);
    const [number, setNumber] = useState(initial.number);
    const [picking, setPicking] = useState(false);
    const [search, setSearch] = useState('');
    const [focused, setFocused] = useState(false);

    const report = (nextCountry: Country, nextNumber: string) => onChange(nextNumber ? `+${nextCountry.dial}${nextNumber.replace(/^0+/, '')}` : '');
    const matches = search.trim() ? COUNTRIES.filter((entry) => `${entry.name} ${entry.code} +${entry.dial}`.toLowerCase().includes(search.trim().toLowerCase())) : COUNTRIES;

    return (
        <>
            <XStack gap={8}>
                <Pressable
                    onPress={() => setPicking(true)}
                    accessibilityRole='button'
                    accessibilityLabel={t('Auth.countryCode', { country: country.name, code: country.dial })}
                    style={{
                        height: 54,
                        paddingHorizontal: 12,
                        borderRadius: radius.button,
                        borderWidth: 1,
                        borderColor: theme.borderColor.val,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <UIText variant='bodyStrong'>
                        {country.flag} +{country.dial}
                    </UIText>
                    <FontAwesomeIcon icon={faChevronDown} size={12} color={theme.textSecondary.val} />
                </Pressable>
                <TextInput
                    value={number}
                    onChangeText={(text) => {
                        const digits = text.replace(/\D/g, '').slice(0, 15);
                        setNumber(digits);
                        report(country, digits);
                    }}
                    keyboardType='phone-pad'
                    textContentType='telephoneNumber'
                    autoComplete='tel'
                    autoFocus={autoFocus}
                    returnKeyType='done'
                    onSubmitEditing={onSubmit}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    accessibilityLabel={t('Auth.mobileNumber')}
                    placeholder={t('Auth.phonePlaceholder')}
                    placeholderTextColor={theme.textPlaceholder.val}
                    style={{
                        flex: 1,
                        height: 54,
                        paddingHorizontal: 14,
                        borderRadius: radius.button,
                        borderWidth: 2,
                        borderColor: invalid ? theme.errorForeground.val : focused ? theme.primary.val : theme.borderColor.val,
                        color: theme.textPrimary.val,
                        fontSize: 17,
                        fontWeight: '600',
                        letterSpacing: 0.3,
                    }}
                />
            </XStack>

            <Sheet open={picking} onClose={() => setPicking(false)} title={t('Auth.chooseCountry')} maxHeightRatio={0.85}>
                <YStack gap={10}>
                    <TextField value={search} onChangeText={setSearch} placeholder={t('Auth.searchCountry')} accessibilityLabel={t('Auth.searchCountry')} height={44} autoCorrect={false} />
                    <FlatList
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        data={matches}
                        keyExtractor={(item) => item.code}
                        keyboardShouldPersistTaps='handled'
                        style={{ maxHeight: 420 }}
                        initialNumToRender={20}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => {
                                    setCountry(item);
                                    report(item, number);
                                    setPicking(false);
                                    setSearch('');
                                }}
                                accessibilityRole='radio'
                                accessibilityState={{ checked: item.code === country.code }}
                                style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: theme.borderColor.val }}
                            >
                                <UIText>{item.flag}</UIText>
                                <UIText flex={1} variant={item.code === country.code ? 'bodyStrong' : 'body'}>
                                    {item.name}
                                </UIText>
                                <UIText tone='secondary'>+{item.dial}</UIText>
                            </Pressable>
                        )}
                    />
                </YStack>
            </Sheet>
        </>
    );
}
