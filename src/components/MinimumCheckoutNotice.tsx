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
        <YStack bg='$warning' borderWidth={1} borderColor='$warningBorder' borderRadius='$4' px='$3' py='$2' space='$2'>
            <Text color='$warningText' fontSize='$5' fontWeight='bold'>
                {t('checkout.minimumOrderNotReached')}
            </Text>
            <Text color='$warningText' fontSize='$4'>
                {t('checkout.minimumOrderMessage', {
                    minimum: formatCurrency(minimumAmount, cart.getAttribute('currency')),
                    current: formatCurrency(currentSubtotal, cart.getAttribute('currency')),
                })}
            </Text>
        </YStack>
    );
};

export default MinimumCheckoutNotice;
