import React from 'react';
import { YStack, XStack, Label, Switch, AnimatePresence } from 'tamagui';
import { dasherize } from 'inflected';
import MoneyPercentAdjuster from './MoneyPercentAdjuster';

const TipInput = ({ label, isTipping, setTipping, tipValue, setTipValue, currency, wrapperProps = {} }) => {
    const id = dasherize(label);

    return (
        <YStack {...wrapperProps}>
            <XStack alignItems='center' justifyContent='space-between' px='$2' py='$1'>
                <YStack flex={1}>
                    <Label htmlFor={id} size='$5' color='$textPrimary' fontWeight='bold' justifyContent='flex-end' numberOfLines={1}>
                        {label}
                    </Label>
                </YStack>
                <YStack flex={1} alignItems='flex-end'>
                    <Switch id={id} onCheckedChange={setTipping} checked={isTipping} bg={isTipping ? '$success' : '$gray-500'} borderColor={isTipping ? '$successBorder' : '$gray-800'}>
                        <Switch.Thumb animation='quick' />
                    </Switch>
                </YStack>
            </XStack>
            <AnimatePresence>
                {isTipping && (
                    <YStack mt='$1' pb='$3' animation='quick'>
                        <MoneyPercentAdjuster value={tipValue} onChange={(tip, isPercent) => setTipValue(isPercent ? `${tip}%` : tip)} currency={currency} />
                    </YStack>
                )}
            </AnimatePresence>
        </YStack>
    );
};

export default TipInput;
