# Extending the storefront app

Storefront builds can replace screens without editing the navigators or forking routing code. Navigators refer to screens by a stable **screen id**, and the screen registry resolves each id to the default screen, a compiled-in override, or a selected variant.

## What can be customized

| Mechanism | Where | Loaded from |
|---|---|---|
| Screen overrides | `storefront.extensions.ts` → `screens` | Compiled into the build |
| Screen variants | `storefront.extensions.ts` → `screenVariants` | Compiled into the build; selected by key |

Overrides are ordinary modules bundled with the app. The app never downloads or executes code from an API. Declarative configuration can only select variants that are already compiled in.

## Replacing a screen

1. Create the screen, for example `custom/screens/BrandStoreHomeScreen.tsx`:

    ```tsx
    import React from 'react';
    import { YStack, Text } from 'tamagui';
    import type { StorefrontScreen } from '../../src/extensions';

    const BrandStoreHomeScreen: StorefrontScreen<'store.home'> = ({ route, navigation, DefaultScreen }) => (
        <YStack flex={1}>
            <Text>Welcome to our store</Text>
            {/* Optional: compose the default implementation */}
            <DefaultScreen route={route} navigation={navigation} />
        </YStack>
    );

    export default BrandStoreHomeScreen;
    ```

2. Register it in `storefront.extensions.ts`:

    ```ts
    import { defineStorefrontExtensions } from './src/extensions';

    export default defineStorefrontExtensions({
        screens: {
            'store.home': { load: () => import('./custom/screens/BrandStoreHomeScreen') },
        },
    });
    ```

No navigator changes are needed. Routes, deep links, authentication guards and header options stay the same.

### Platform-specific screens

Loader paths resolve platform files the usual way, so `BrandStoreHomeScreen.web.tsx` and `BrandStoreHomeScreen.native.tsx` work. To apply an override on some platforms only, set `platforms: ['ios', 'android']`. Other platforms use the default screen.

### Variants

An override (or the defaults) can register named variants:

```ts
'store.home': {
    load: () => import('./custom/screens/BrandStoreHomeScreen'),
    variants: { editorial: () => import('./custom/screens/EditorialStoreHomeScreen') },
},
```

Select one with `screenVariants: { 'store.home': 'editorial' }`. An unknown variant key falls back to the override, or to the default when there is none.

## Failure behavior

- An override that fails to load, has no default export, or throws while rendering is replaced by the default screen with the same props. The error is reported to the console.
- If the default screen also fails, a generic "Something went wrong" view renders.
- In development, unknown screen ids and malformed entries throw when the app starts. In production they are ignored with a warning.

## Screen ids

| Screen id | Default screen | Key params |
|---|---|---|
| `store.home` | `StoreHomeScreen` | `storeId?` |
| `store.search` | `StoreSearchScreen` | none |
| `store.map` | `StoreMapScreen` | none |
| `store.info` | `StoreInfoScreen` | `store`, `storeLocation?` |
| `catalog.category` | `StoreCategoryScreen` | `categoryId?`, `category?`, `storeId?` |
| `catalog.index` | `CatalogScreen` | none |
| `catalog.foodTruckCategory` | `CatalogCategoryScreen` | none |
| `product.detail` | `ProductScreen` | `product?`, `productId?`, `storeId?` |
| `cart` | `CartScreen` | none |
| `cart.item` | `CartItemScreen` | `cartItem?` |
| `checkout` | `CheckoutScreen` | none |
| `order.detail` | `OrderScreen` | `order` |
| `order.receipt` | `ReceiptScreen` | `order` |
| `order.history` | `OrderHistoryScreen` | none |
| `account.profile` | `ProfileScreen` | none |
| `account.details` | `AccountScreen` | none |
| `auth.login` | `LoginScreen` | `redirectTo?` |
| `auth.createAccount` | `CreateAccountScreen` | `redirectTo?` |
| `network.home` | `NetworkHomeScreen` | none |
| `network.directory` | `NetworkCategoryScreen` | `categoryId?` |
| `network.search` | `NetworkSearchScreen` | none |
| `network.map` | `NetworkMapScreen` | none |
| `network.store` | `NetworkStoreScreen` | `storeId` |
| `network.product` | `NetworkProductScreen` | `productId`, `storeId?` |

Full param types are in `src/extensions/screens/params.ts`. Inside a Network, `network.store` renders the `store.home` screen and `network.product` renders `product.detail`, so overrides of those screens apply in both editions.

Boot, location permission, payment gateway, phone verification and account deletion screens can't be overridden.

## Rules for contributors

- Navigators under `src/navigation` must reference overridable screens with `screenSlot(id)` instead of importing them. ESLint and `__tests__/extensions/navigation-boundaries.test.js` enforce this.
- Add new overridable screens to `src/extensions/screens/screen-ids.ts`, `params.ts` and `default-screens.ts`.
- Screen ids are a public contract. Don't rename them; add a new id instead.
