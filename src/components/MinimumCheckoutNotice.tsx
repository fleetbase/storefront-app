import React from 'react';
import { YStack, Text } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency } from '../utils/format';
import useCart from '../hooks/use-cart';

interface MinimumCheckoutNoticeProps {
    minimumAmount: number;
    currentSubtotal: number;
}

const MinimumCheckoutNotice = ({ minimumAmount, currentSubtotal }: MinimumCheckoutNoticeProps) => {
    const { t } = useLanguage();
    const [cart] = useCart();

    return (
        <YStack bg='$warning' borderWidth={1} borderColor='$warningBorder' borderRadius='$4' p='$3' space='$2'>
            <Text color='$warningText' fontSize='$4' fontWeight='600'>
                {t('checkout.minimumOrderNotReached')}
            </Text>
            <Text color='$warningText' fontSize='$3'>
                {t('checkout.minimumOrderMessage', { 
                    minimum: formatCurrency(minimumAmount, cart.getAttribute('currency')),
                    current: formatCurrency(currentSubtotal, cart.getAttribute('currency'))
                })}
            </Text>
        </YStack>
    );
};

export default MinimumCheckoutNotice;
