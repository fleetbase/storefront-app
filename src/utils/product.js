import { isArray } from './';

export function createAddonSelectionDefaults(product) {
    const addonDefaults = {};
    const addonCategories = product.addons() || [];
    addonCategories.forEach((addonCategory) => {
        addonDefaults[addonCategory.id] = [];
    });

    return addonDefaults;
}

export function updateAddonSelection(checked, addon, addonCategoryId, currentSelection) {
    // Ensure the category exists in the selection state
    const categorySelection = currentSelection[addonCategoryId] || [];

    // Add or remove addon based on the checked status
    if (checked) {
        // Prevent duplicates
        if (!categorySelection.some((selectedAddon) => selectedAddon.id === addon.id)) {
            return {
                ...currentSelection,
                [addonCategoryId]: [...categorySelection, addon],
            };
        }
    } else {
        return {
            ...currentSelection,
            [addonCategoryId]: categorySelection.filter((selectedAddon) => selectedAddon.id !== addon.id),
        };
    }

    return currentSelection; // Return unchanged if no modifications are made
}

export function selectAddon(checked, addon, addonCategory, setSelectedAddons) {
    if (!addon || !addonCategory) {
        console.warn('Addon or category is missing in selectAddon function');
        return;
    }

    setSelectedAddons((prevSelectedAddons) => updateAddonSelection(checked, addon, addonCategory.id, prevSelectedAddons));
}

export function isAddonSelected(addonId, selectedAddons) {
    for (const categoryId in selectedAddons) {
        if (selectedAddons[categoryId].some((addon) => addon.id === addonId)) {
            return true;
        }
    }
    return false;
}

export function createVariationSelectionDefaults(product) {
    const variationDefaults = {};
    const variations = product.variants() || [];
    variations.forEach((variation) => {
        variationDefaults[variation.id] = null;
    });

    return variationDefaults;
}

export function selectVariant(currentSelection, variation, variant) {
    return {
        ...currentSelection,
        [variation.id]: variant,
    };
}

export function getVariantOptionById(variantOptionId, product) {
    const variations = product.variants() || [];

    for (const variation of variations) {
        if (isArray(variation?.options)) {
            const variationOption = variation.options.find((option) => option.id === variantOptionId);
            if (variationOption) {
                return variationOption; // Return immediately when a match is found
            }
        }
    }

    return null;
}

export function getSelectedVariantId(variation, selectedVariations) {
    // Check if the variation exists in the selected variations and return the id
    return selectedVariations[variation.id]?.id || null;
}

export function isVariantSelected(variationId, selectedVariations) {
    return !!selectedVariations[variationId];
}

export function getSelectedVariants(selectedVariants) {
    return Object.values(selectedVariants);
}

export function getSelectedAddons(selectedAddons) {
    return Object.values(selectedAddons).flatMap((categoryAddons) => categoryAddons);
}

export function isProductReadyForCheckout(product, selectedVariants) {
    // Ensure all required variants are selected
    return product.variants().every((variant) => !variant.is_required || selectedVariants[variant.id]);
}

export function productHasOptions(product) {
    return product.addons().length > 0 || product.variants().length > 0;
}

export function getVariantSelectionsFromCartItem(cartItem, product) {
    const productVariations = product.variants() || [];
    const cartVariants = cartItem.variants || [];

    return productVariations.reduce((selections, variation) => {
        const selectedVariant = cartVariants.find((variant) => variation.options.some((option) => option.id === variant.id));
        selections[variation.id] = selectedVariant || null;
        return selections;
    }, {});
}

export function getAddonSelectionsFromCartItem(cartItem, product) {
    const productAddonCategories = product.addons() || [];
    const cartAddons = cartItem.addons || [];

    return productAddonCategories.reduce((selections, category) => {
        const selectedAddons = cartAddons.filter((addon) => category.addons.some((categoryAddon) => categoryAddon.id === addon.id));
        selections[category.id] = selectedAddons;
        return selections;
    }, {});
}
