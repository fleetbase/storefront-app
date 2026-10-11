import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { useBranding } from '../branding/BrandingProvider';
import { UIText } from './Text';
import { HIT_SIZE, elevation, radius } from './tokens';

/**
 * The current language as a short code (MN, EN) in a pill for screen headers. Tapping it
 * switches to the next available language. Hidden when only one language is available or
 * the brand turns it off (`navigation.languageSwitcher`).
 */
export function LanguageButton({ floating = false }: { floating?: boolean }) {
    const theme = useTheme();
    const { locale, setLocale, languages = [], t } = useLanguage();
    const { branding } = useBranding();
    if (!branding.navigation.languageSwitcher || languages.length < 2) return null;

    const index = languages.findIndex((language) => language.code === locale);
    const current = languages[index] ?? languages[0];
    const next = languages[(index + 1) % languages.length];

    return (
        <Pressable
            onPress={() => setLocale(next.code)}
            accessibilityRole='button'
            accessibilityLabel={`${t('AccountScreen.language')}: ${current.native ?? current.name ?? current.code}`}
            accessibilityHint={next.native ?? next.name ?? next.code}
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
    );
}
