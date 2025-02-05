import React, { useState, useEffect } from 'react';
import { Text, YStack, XStack, Label, RadioGroup, Checkbox, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faAsterisk, faCheck } from '@fortawesome/free-solid-svg-icons';
import { formatCurrency } from '../utils/format';
import { isEmpty } from '../utils';
import {
    createAddonSelectionDefaults,
    selectAddon,
    isAddonSelected,
    createVariationSelectionDefaults,
    selectVariant,
    getVariantOptionById,
    isVariantSelected,
    getSelectedVariantId,
} from '../utils/product';
import Spacer from './Spacer';

const ProductOptionsForm = ({ product, onAddonsChanged, onVariationsChanged, defaultSelectedAddons = null, defaultSelectedVariants = null, wrapperProps = {} }) => {
    console.log('[product]', product);
    console.log('[product.variants]', typeof product.variants);
    console.log('[product.addons]', typeof product.addons);
    return <YStack />;
    const theme = useTheme();
    const [selectedAddons, setSelectedAddons] = useState(isEmpty(defaultSelectedAddons) ? createAddonSelectionDefaults(product) : defaultSelectedAddons);
    const [selectedVariants, setSelectedVariants] = useState(isEmpty(defaultSelectedVariants) ? createVariationSelectionDefaults(product) : defaultSelectedVariants);

    const handleAddonToggle = (checked, addon, addonCategory) => {
        selectAddon(checked, addon, addonCategory, setSelectedAddons);
    };

    const handleVariationToggle = (variationOptionId, variation) => {
        const variant = getVariantOptionById(variationOptionId, product);
        if (variant) {
            const updatedSelection = selectVariant(selectedVariants, variation, variant);
            setSelectedVariants(updatedSelection);
        }
    };

    useEffect(() => {
        if (typeof onVariationsChanged === 'function') {
            onVariationsChanged(selectedVariants);
        }
    }, [selectedVariants]);

    useEffect(() => {
        if (typeof onAddonsChanged === 'function') {
            onAddonsChanged(selectedAddons);
        }
    }, [selectedAddons]);

    return (
        <YStack space='$5' {...wrapperProps}>
            {product.variants().length > 0 && (
                <YStack space='$5' px='$4'>
                    {product.variants().map((variation, i) => (
                        <YStack key={i}>
                            <XStack space='$1'>
                                <Text fontSize='$7' fontWeight='bold' color='$color'>
                                    {variation.name}
                                </Text>
                                {variation.is_required && <FontAwesomeIcon icon={faAsterisk} size={8} color='red' />}
                            </XStack>
                            <XStack mt='$1' mb='$2'>
                                <Text fontSize='$4' color='$color'>
                                    Choose one item
                                </Text>
                            </XStack>
                            <RadioGroup
                                value={getSelectedVariantId(variation, selectedVariants)}
                                onValueChange={(id) => handleVariationToggle(id, variation)}
                                aria-labelledby='Select one item'
                                defaultValue='3'
                                name='form'
                            >
                                <YStack space='$2'>
                                    {variation.options.map((variant, j) => (
                                        <XStack key={j} alignItems='center' justifyContent='space-between'>
                                            <XStack alignItems='center' justifyContent='space-between'>
                                                <RadioGroup.Item animation='quick' value={variant.id} id={variant.id} size={26} bg='$background' borderColor='$primary' borderWidth={2}>
                                                    <RadioGroup.Indicator bg='blue' borderColor='red' />
                                                </RadioGroup.Item>
                                                <Label htmlFor={variant.id} flex={1} ml='$2' paddingVertical='$2'>
                                                    <XStack flex={1} alignItems='center' justifyContent='space-between'>
                                                        <YStack flex={1}>
                                                            <Text fontSize='$5'>{variant.name}</Text>
                                                        </YStack>
                                                        <YStack flex={1} alignItems='flex-end'>
                                                            <Text fontSize='$5'>+{formatCurrency(variant.additional_cost, product.getAttribute('currency'))}</Text>
                                                        </YStack>
                                                    </XStack>
                                                </Label>
                                            </XStack>
                                        </XStack>
                                    ))}
                                </YStack>
                            </RadioGroup>
                        </YStack>
                    ))}
                </YStack>
            )}
            {product.addons().length > 0 && (
                <YStack space='$5' px='$4'>
                    {product.addons().map((addonCategory, i) => (
                        <YStack key={i}>
                            <XStack space='$1'>
                                <Text fontSize='$7' fontWeight='bold' color='$color'>
                                    {addonCategory.name}
                                </Text>
                            </XStack>
                            <XStack mt='$1' mb='$3'>
                                <Text fontSize='$4' color='$color'>
                                    Choose up to 4 items
                                </Text>
                            </XStack>
                            <YStack space='$2'>
                                {addonCategory.addons.map((addon, j) => (
                                    <XStack key={j} alignItems='center' justifyContent='space-between'>
                                        <XStack alignItems='center' justifyContent='space-between'>
                                            <Checkbox
                                                onCheckedChange={(checked) => handleAddonToggle(checked, addon, addonCategory)}
                                                animation='quick'
                                                id={addon.id}
                                                value={addon.id}
                                                checked={isAddonSelected(addon.id, selectedAddons)}
                                                size={26}
                                                bg='$background'
                                                borderColor='$primary'
                                                borderWidth={2}
                                                circular
                                            >
                                                <Checkbox.Indicator>
                                                    <FontAwesomeIcon icon={faCheck} size={15} color={theme.primary.val} />
                                                </Checkbox.Indicator>
                                            </Checkbox>
                                            <Label htmlFor={addon.id} flex={1} ml='$2' paddingVertical='$1'>
                                                <XStack flex={1} alignItems='center' justifyContent='space-between'>
                                                    <YStack flex={1} paddingVertical='$2'>
                                                        <Text fontSize='$5'>{addon.name}</Text>
                                                    </YStack>
                                                    <YStack flex={1} alignItems='flex-end' paddingVertical='$2'>
                                                        <Text fontSize='$5'>+{formatCurrency(addon.is_on_sale ? addon.sale_price : addon.price, product.getAttribute('currency'))}</Text>
                                                        {addon.is_on_sale && (
                                                            <Text ml='$1' fontSize='$5' textDecorationLine='line-through'>
                                                                {formatCurrency(addon.price, product.getAttribute('currency'))}
                                                            </Text>
                                                        )}
                                                    </YStack>
                                                </XStack>
                                            </Label>
                                        </XStack>
                                        <XStack></XStack>
                                    </XStack>
                                ))}
                            </YStack>
                        </YStack>
                    ))}
                </YStack>
            )}
            <Spacer height={200} />
        </YStack>
    );
};

export default ProductOptionsForm;
