import React, { useState, useRef, useEffect } from 'react';
import { Switch, Text, Label, Separator, YStack, XStack, useTheme } from 'tamagui';
import TipInput from './TipInput';
import useStorefrontInfo from '../hooks/use-storefront-info';

const CheckoutOptions = ({ onChange, isPickup = false }) => {
    const { info, enabled } = useStorefrontInfo();
    const [leavingTip, setLeavingTip] = useState(false);
    const [tip, setTip] = useState(false);
    const [leavingDeliveryTip, setLeavingDeliveryTip] = useState(false);
    const [deliveryTip, setDeliveryTip] = useState(false);

    useEffect(() => {
        if (typeof onChange === 'function') {
            onChange({ tip, leavingTip, deliveryTip, leavingDeliveryTip });
        }
    }, [tip, leavingTip, deliveryTip, leavingDeliveryTip]);

    if (!enabled('tips') && !enabled('delivery_tips')) {
        return null;
    }

    return (
        <YStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' space='$2'>
            {enabled('tips') && (
                <>
                    <TipInput
                        label='Leave a tip'
                        isTipping={leavingTip}
                        setTipping={setLeavingTip}
                        tipValue={tip}
                        setTipValue={setTip}
                        currency={info.currency}
                        wrapperProps={{ px: '$3' }}
                    />
                    <Separator />
                </>
            )}

            {enabled('delivery_tips') && !isPickup && (
                <>
                    <TipInput
                        label='Leave delivery tip'
                        isTipping={leavingDeliveryTip}
                        setTipping={setLeavingDeliveryTip}
                        tipValue={deliveryTip}
                        setTipValue={setDeliveryTip}
                        currency={info.currency}
                        wrapperProps={{ px: '$3' }}
                    />
                    <Separator />
                </>
            )}
        </YStack>
    );
};

export default CheckoutOptions;
