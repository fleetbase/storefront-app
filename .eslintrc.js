// Screens that can be overridden through the screen registry. Navigators must
// reference them with `screenSlot(id)` so overrides apply without editing routing.
const OVERRIDABLE_SCREEN_MODULES = [
    'StoreHomeScreen',
    'StoreSearchScreen',
    'StoreMapScreen',
    'StoreInfoScreen',
    'StoreCategoryScreen',
    'CatalogScreen',
    'CatalogCategoryScreen',
    'ProductScreen',
    'CartScreen',
    'CartItemScreen',
    'CheckoutScreen',
    'OrderScreen',
    'ReceiptScreen',
    'OrderHistoryScreen',
    'ProfileScreen',
    'AccountScreen',
    'LoginScreen',
    'CreateAccountScreen',
];

module.exports = {
    // Written by scripts/link-brand.js.
    ignorePatterns: ['src/generated/'],
    root: true,
    extends: '@react-native',
    rules: {
        'react/prop-types': 'off',
    },
    overrides: [
        {
            files: ['src/navigation/**/*.{js,jsx,ts,tsx}'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: [...OVERRIDABLE_SCREEN_MODULES.map((name) => `**/screens/${name}`), '**/screens/network/*'],
                                message: 'Reference overridable screens with screenSlot(id) from src/extensions instead of importing them.',
                            },
                        ],
                    },
                ],
            },
        },
    ],
};
