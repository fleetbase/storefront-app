import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { calculateTip } from '../../utils/math';
import { formatCurrency } from '../../utils/format';
import StorefrontConfig from '../../../storefront.config';
import { IconButton, UIText, radius } from '../../ui';

const PRESETS = ['0', '10%', '15%', '20%'] as const;
type Choice = (typeof PRESETS)[number] | 'other';

/**
 * Tip presets (none, 10, 15, 20 %) and "Other" for a fixed amount. Reports the tip the
 * checkout hooks understand: 0, a percentage string like "15%", or an amount in minor units.
 */
export default function TipSelector({ title, note, subtotal, currency, onChange }: { title: string; note?: string; subtotal: number; currency: string; onChange: (tip: number | string) => void }) {
    const theme = useTheme();
    const { t } = useLanguage();
    const step = Number((StorefrontConfig as any)?.incrementTipBy) || 50;
    const [choice, setChoice] = useState<Choice>('0');
    const [custom, setCustom] = useState(step * 4);

    const choose = (next: Choice) => {
        setChoice(next);
        onChange(next === 'other' ? custom : next === '0' ? 0 : next);
    };
    const adjust = (delta: number) => {
        const next = Math.max(step, custom + delta);
        setCustom(next);
        onChange(next);
    };

    return (
        <YStack gap={10}>
            <XStack justifyContent='space-between' alignItems='baseline' gap={8}>
                <UIText variant='subheading'>{title}</UIText>
                {!!note && (
                    <UIText variant='caption' tone='secondary'>
                        {note}
                    </UIText>
                )}
            </XStack>
            <XStack gap={6} accessibilityRole='radiogroup' accessibilityLabel={title}>
                {[...PRESETS, 'other' as const].map((option) => {
                    const selected = choice === option;
                    const label = option === '0' ? t('Checkout.tipNone') : option === 'other' ? t('Checkout.tipOther') : option;
                    const amount = option !== '0' && option !== 'other' ? formatCurrency(calculateTip(option, subtotal), currency) : null;
                    return (
                        <Pressable
                            key={option}
                            onPress={() => choose(option)}
                            accessibilityRole='radio'
                            accessibilityState={{ checked: selected }}
                            accessibilityLabel={amount ? `${label}, ${amount}` : label}
                            style={{ flex: 1, minHeight: 48, borderRadius: radius.button, borderWidth: selected ? 2 : 1, borderColor: selected ? theme.primary.val : theme.borderColor.val, backgroundColor: selected ? theme.primarySoft.val : theme.background.val, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}
                        >
                            <UIText variant='captionStrong' tone={selected ? 'brand' : 'primary'}>
                                {label}
                            </UIText>
                            {!!amount && (
                                <UIText variant='caption' tone='secondary' style={{ fontSize: 11, lineHeight: 14 }}>
                                    {amount}
                                </UIText>
                            )}
                        </Pressable>
                    );
                })}
            </XStack>
            {choice === 'other' && (
                <XStack alignItems='center' justifyContent='space-between' gap={12} paddingHorizontal={4}>
                    <IconButton icon={faMinus} accessibilityLabel={t('Checkout.tipLess')} onPress={() => adjust(-step)} disabled={custom <= step} />
                    <UIText variant='heading' aria-live='polite'>
                        {formatCurrency(custom, currency)}
                    </UIText>
                    <IconButton icon={faPlus} accessibilityLabel={t('Checkout.tipMore')} onPress={() => adjust(step)} />
                </XStack>
            )}
        </YStack>
    );
}
