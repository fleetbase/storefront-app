import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { useBranding } from '../branding/BrandingProvider';
import { ChoiceSheet } from './ChoiceSheet';
import { UIText } from './Text';
import { HIT_SIZE, elevation, radius } from './tokens';

/**
 * The current language as a short code (MN, EN) in a pill for screen headers. Tapping it
 * opens the same language choice as the Account screen. Hidden when only one language is available or
 * the brand turns it off (`navigation.languageSwitcher`).
 */
export function LanguageButton({ floating = false }: { floating?: boolean }) {
    const theme = useTheme();
    const { locale, setLocale, languages = [], t } = useLanguage();
    const { branding } = useBranding();
    const [choosing, setChoosing] = useState(false);
    if (!branding.navigation.languageSwitcher || languages.length < 2) return null;

    const current = languages.find((language) => language.code === locale) ?? languages[0];

    return (
        <>
        <Pressable
            onPress={() => setChoosing(true)}
            accessibilityRole='button'
            accessibilityLabel={`${t('AccountScreen.language')}: ${current.native ?? current.name ?? current.code}`}
            hitSlop={(HIT_SIZE - 36) / 2}
            style={({ pressed }) => ({
                height: 36,
                minWidth: 44,
                paddingHorizontal: 11,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: theme.borderColor.val,
                backgroundColor: floating ? theme.background.val : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
                ...(floating ? elevation.floating : null),
            })}
        >
            <UIText variant='captionStrong' style={{ letterSpacing: 0.4 }}>
                {current.code.slice(0, 2).toUpperCase()}
            </UIText>
        </Pressable>
        <ChoiceSheet
            open={choosing}
            title={t('Account.language')}
            options={languages.map((language: any) => ({ key: language.code, label: [language.emoji, language.native ?? language.name ?? language.code].filter(Boolean).join('  ') }))}
            selected={locale}
            onSelect={setLocale}
            onClose={() => setChoosing(false)}
        />
        </>
    );
}
