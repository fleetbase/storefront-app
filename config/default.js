export const DefaultConfig = {
    theme: 'blue',
    paymentGateway: 'stripe',
    incrementTipBy: 50,
    stripePaymentMethod: 'sheet', // `sheet` or `field`
    stripePaymentSheetOptions: {
        applePay: false,
        googlePay: false,
    },
    showDriversOnMap: false,
    styles: {
        StoreHeader: {
            direction: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            space: '$1',
            padding: '$4',
        },
    },
};

export function mergeConfigs(defaultConfig, targetConfig) {
    // If targetConfig is not an object, just return defaultConfig directly
    if (typeof targetConfig !== 'object' || targetConfig === null) {
        return defaultConfig;
    }

    const result = { ...defaultConfig };

    for (const key in targetConfig) {
        // If both defaultConfig[key] and targetConfig[key] are objects, merge them deeply
        if (
            typeof targetConfig[key] === 'object' &&
            targetConfig[key] !== null &&
            !Array.isArray(targetConfig[key]) &&
            typeof result[key] === 'object' &&
            result[key] !== null &&
            !Array.isArray(result[key])
        ) {
            result[key] = mergeConfigs(result[key], targetConfig[key]);
        } else {
            // Otherwise, overwrite the value with the user's provided value
            result[key] = targetConfig[key];
        }
    }

    return result;
}

export function createStorefrontConfig(userConfig = {}) {
    return mergeConfigs(DefaultConfig, userConfig);
}
