import { useLocale } from 'hooks';
import React from 'react';
import { Switch, Text, View } from 'react-native';
import tailwind from 'tailwind';
import { CartSubtotalView, ServiceQuoteFeeView, TipInput, TipView } from 'ui';
import { formatCurrency, translate } from 'utils';

const capitalize = ([first, ...rest]) => `${first.toUpperCase()}${rest.join('')}`;

const CartFooter = (props) => {
    const { style, cart, info, serviceQuote, isFetchingServiceQuote, serviceQuoteError, tip, deliveryTip, isTipping, isTippingDriver, isPickupOrder, isCheckoutDisabled, total } = props;

    if (cart?.isEmpty) {
        return <View />;
    }

    const dispatch = function (event, ...args) {
        const eventName = `on${capitalize(event)}`;
        const cb = props[eventName];

        if (typeof cb === 'function') {
            cb(...args);
        }
    };

    const pickupEnabled = info?.options?.pickup_enabled === true;
    const tipsEnabled = info?.options?.tips_enabled === true;
    const deliveryTipsEnabled = info?.options?.delivery_tips_enabled === true;
    const taxEnabled = info?.options?.tax_enabled === true;
    const hasOptions = pickupEnabled || tipsEnabled || deliveryTipsEnabled;
    // const taxPercentage = info?.options?.tax_percentage ?? 0;

    const [locale] = useLocale();

    return (
        <View style={[tailwind('bg-gray-100 pt-2'), style]}>
            {hasOptions && (
                <View style={tailwind('mb-2')}>
                    <View style={tailwind('flex px-4 py-2 mb-2')}>
                        <View>
                            <Text style={tailwind('font-semibold text-gray-400')}>{translate('Cart.components.CartFooter.optionsLabelText')}</Text>
                        </View>
                    </View>
                    {pickupEnabled && (
                        <View style={tailwind('bg-white w-full')}>
                            <View style={tailwind('flex flex-row items-center border-b border-gray-100 h-14 px-4')}>
                                <View style={tailwind('w-14')}>
                                    <Switch
                                        trackColor={{ false: 'rgba(229, 231, 235, 1)', true: 'rgba(16, 185, 129, 1)' }}
                                        thumbColor={'#f4f3f4'}
                                        ios_backgroundColor='#3e3e3e'
                                        onValueChange={() => {
                                            const is = !isPickupOrder;

                                            dispatch('setIsPickupOrder', is);

                                            if (is) {
                                                dispatch('setIsTippingDriver', false);
                                                dispatch('setDeliveryTip', 100);
                                            }
                                        }}
                                        value={isPickupOrder}
                                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                    />
                                </View>
                                <View>
                                    <Text style={tailwind('font-semibold')}>{translate('Cart.components.CartFooter.pickupOrderLabelText')}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                    {tipsEnabled && (
                        <View style={tailwind('bg-white w-full')}>
                            <View style={tailwind('flex flex-row items-center border-b border-gray-100 h-14 px-4')}>
                                <View style={tailwind('w-14')}>
                                    <Switch
                                        trackColor={{ false: 'rgba(229, 231, 235, 1)', true: 'rgba(16, 185, 129, 1)' }}
                                        thumbColor={'#f4f3f4'}
                                        ios_backgroundColor='#3e3e3e'
                                        onValueChange={() => dispatch('setIsTipping', !isTipping)}
                                        value={isTipping}
                                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                    />
                                </View>
                                <View style={tailwind('flex-1 flex flex-row items-center justify-between')}>
                                    <View>
                                        <Text style={tailwind('font-semibold')}>{translate('Cart.components.CartFooter.askTipLabelText')}</Text>
                                    </View>
                                    {isTipping && (
                                        <View style={tailwind('ml-2')}>
                                            <TipInput currency={cart.getAttribute('currency')} value={tip} onChange={(tip, isPercent) => dispatch('setTip', isPercent ? `${tip}%` : tip)} />
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}
                    {deliveryTipsEnabled && !isPickupOrder && (
                        <View style={tailwind('bg-white w-full')}>
                            <View style={tailwind('flex flex-row items-center border-b border-gray-100 h-14 px-4')}>
                                <View style={tailwind('w-14')}>
                                    <Switch
                                        trackColor={{ false: 'rgba(229, 231, 235, 1)', true: 'rgba(16, 185, 129, 1)' }}
                                        thumbColor={'#f4f3f4'}
                                        ios_backgroundColor='#3e3e3e'
                                        onValueChange={() => dispatch('setIsTippingDriver', !isTippingDriver)}
                                        value={isTippingDriver}
                                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                    />
                                </View>
                                <View style={tailwind('flex-1 flex flex-row items-center justify-between')}>
                                    <View>
                                        <Text style={tailwind('font-semibold')}>{translate('Cart.components.CartFooter.askDeliveryTipLabelText')}</Text>
                                    </View>
                                    {isTippingDriver && (
                                        <View style={tailwind('ml-2')}>
                                            <TipInput
                                                currency={cart.getAttribute('currency')}
                                                value={deliveryTip}
                                                onChange={(tip, isPercent) => dispatch('setDeliveryTip', isPercent ? `${tip}%` : tip)}
                                            />
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            )}
            <View style={tailwind('flex px-4 py-2')}>
                <View>
                    <Text style={tailwind('font-semibold text-gray-400')}>{translate('Cart.components.CartFooter.costLabelText')}</Text>
                </View>
            </View>
            <View style={tailwind('mt-2 mb-36 bg-white w-full')}>
                <View style={tailwind('flex flex-row items-center justify-between border-b border-gray-100 h-14 px-4')}>
                    <View>
                        <Text>{translate('Cart.components.CartFooter.cartSubtotalLabelText')}</Text>
                    </View>
                    <View>
                        <CartSubtotalView cart={cart} style={tailwind('font-bold')} />
                    </View>
                </View>
                {!isPickupOrder && (
                    <View style={tailwind('flex flex-row items-center justify-between border-b border-gray-100 h-14 px-4')}>
                        <View>
                            <Text>{translate('Cart.components.CartFooter.deliveryFeeLabelText')}</Text>
                        </View>
                        <View>
                            <ServiceQuoteFeeView
                                serviceQuote={serviceQuote}
                                isFetchingServiceQuote={isFetchingServiceQuote}
                                serviceQuoteError={serviceQuoteError}
                                style={tailwind('font-bold')}
                            />
                        </View>
                    </View>
                )}
                {isTipping && (
                    <View style={tailwind('flex flex-row items-center justify-between border-b border-gray-100 h-14 px-4')}>
                        <View>
                            <Text>{translate('Cart.components.CartFooter.tipLabelText')}</Text>
                        </View>
                        <View>
                            <TipView tip={tip} subtotal={cart.subtotal()} currency={cart.getAttribute('currency')} style={tailwind('font-bold')} />
                        </View>
                    </View>
                )}
                {isTippingDriver && !isPickupOrder && (
                    <View style={tailwind('flex flex-row items-center justify-between border-b border-gray-100 h-14 px-4')}>
                        <View>
                            <Text>{translate('Cart.components.CartFooter.deliveryTipLabelText')}</Text>
                        </View>
                        <View>
                            <TipView tip={deliveryTip} subtotal={cart.subtotal()} currency={cart.getAttribute('currency')} style={tailwind('font-bold')} />
                        </View>
                    </View>
                )}
                <View style={tailwind('flex flex-row items-center justify-between border-b border-gray-100 h-14 px-4')}>
                    <View>
                        <Text style={tailwind('font-bold')}>{translate('Cart.components.CartFooter.cartTotalLabelText')}</Text>
                    </View>
                    <View>
                        <Text style={tailwind('font-bold')}>{formatCurrency(total, cart.getAttribute('currency'))}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default CartFooter;
