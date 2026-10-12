# Extending the storefront app

Storefront builds can replace screens without editing the navigators or forking routing code. Navigators refer to screens by a stable **screen id**, and the screen registry resolves each id to the default screen, a compiled-in override, or a selected variant.

## What can be customized

| Mechanism            | Where                                               | Loaded from                              |
| -------------------- | --------------------------------------------------- | ---------------------------------------- |
| Screen overrides     | `brand/storefront.extensions.ts` → `screens`        | Compiled into the build                  |
| Screen variants      | `brand/storefront.extensions.ts` → `screenVariants` | Compiled into the build; selected by key |
| New screens (routes) | `brand/storefront.extensions.ts` → `routes`         | Compiled into the build                  |
| New tabs             | `brand/storefront.extensions.ts` → `tabs`           | Compiled into the build                  |
| Copy                 | `brand/translations/<locale>.json`                  | Merged over the app's translations       |

A client build keeps all of this in `brand/`; the root `storefront.extensions.ts` is an empty template used when there is no `brand/storefront.extensions.ts`. See [Client builds](client-builds.md).

Overrides are ordinary modules bundled with the app. The app never downloads or executes code from an API. Declarative configuration can only select variants that are already compiled in.

## Replacing a screen

1. Create the screen, for example `brand/screens/BrandStoreHomeScreen.tsx`:

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

2. Register it in `brand/storefront.extensions.ts`:

    ```ts
    import { defineStorefrontExtensions } from '../src/extensions';

    export default defineStorefrontExtensions({
        screens: {
            'store.home': { load: () => import('./screens/BrandStoreHomeScreen') },
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
    load: () => import('./screens/BrandStoreHomeScreen'),
    variants: { editorial: () => import('./screens/EditorialStoreHomeScreen') },
},
```

Select one with `screenVariants: { 'store.home': 'editorial' }`. An unknown variant key falls back to the override, or to the default when there is none.

## Adding screens and tabs

A build can add its own screens (routes) and tabs without editing the navigators:

```ts
import { defineStorefrontExtensions } from '../src/extensions';
import { faGift } from '@fortawesome/free-solid-svg-icons';

export default defineStorefrontExtensions({
    routes: {
        Rewards: { load: () => import('./screens/RewardsScreen'), path: 'rewards' },
        RewardDetail: { load: () => import('./screens/RewardDetailScreen'), path: 'rewards/:rewardId', presentation: 'modal' },
    },
    tabs: {
        RewardsTab: { initialRoute: 'Rewards', icon: faGift, labelKey: 'Brand.tabs.rewards', editions: ['store'] },
    },
});
```

**Routes**

- Every custom route is added to every stack of its editions (`editions`, default both), so `navigation.navigate('RewardDetail', { rewardId })` works from any screen, and the route opens in the current tab.
- Names are PascalCase. A name that matches a core route is skipped with a warning; replace core screens with screen overrides instead.
- `path` makes the route deep-linkable. Its path is declared once: on the custom tab's stack for a tab's own route, otherwise on the home stack.
- `presentation: 'modal'` presents the screen over the current one. Screens draw their own header (`headerShown` is off), like the app's screens.
- A route that fails to load or throws renders an error view in its place instead of crashing the app.

**Tabs**

- A tab opens one of the custom routes (`initialRoute`). Its stack also contains every custom route and the edition's shared screens (product, offers, locations; in a Network also stores, categories, reviews and notifications).
- `icon` is a FontAwesome icon or a function `({ color, size, focused }) => ReactNode`.
- `labelKey` is a translation key (add it in `brand/translations/<locale>.json`); `label` is a plain string or `{ en: 'Rewards', mn: '…' }`.
- Order: in single-store builds, list the tab in `navigation.store.tabs` in the branding to place it exactly. Otherwise it goes at `position` (an index), or just before Cart.
- `initial: true` opens the app on the tab (the food trucks home setting takes precedence). In single-store builds `navigation.store.defaultTab` can also name it.

Screens get `route` and `navigation` like any React Navigation screen. Build them from `src/ui` primitives and the app's hooks so they follow the theme.

## Copy

`brand/translations/<locale>.json` is merged over the app's translations for that locale: change any existing string, or add keys for your own screens (e.g. a `Brand` namespace). A file for a locale the app doesn't ship adds that locale; enable it with `AVAILABLE_LOCALES`.

## Failure behavior

- An override that fails to load, has no default export, or throws while rendering is replaced by the default screen with the same props. The error is reported to the console.
- If the default screen also fails, a generic "Something went wrong" view renders.
- In development, unknown screen ids and malformed entries throw when the app starts. In production they are ignored with a warning.

## Screen ids

| Screen id                   | Default screen          | Key params                             |
| --------------------------- | ----------------------- | -------------------------------------- |
| `store.home`                | `StoreHomeScreen`       | `storeId?`                             |
| `store.search`              | `StoreSearchScreen`     | none                                   |
| `store.map`                 | `StoreMapScreen`        | none                                   |
| `store.info`                | `StoreInfoScreen`       | `store`, `storeLocation?`              |
| `catalog.category`          | `StoreCategoryScreen`   | `categoryId?`, `category?`, `storeId?` |
| `catalog.index`             | `TruckMenuScreen`       | `foodTruckId`                          |
| `catalog.foodTruckCategory` | `TruckMenuScreen`       | `foodTruckId`                          |
| `foodTrucks.home`           | `FoodTrucksScreen`      | none                                   |
| `foodTrucks.search`         | `FoodTruckSearchScreen` | none                                   |
| `foodTrucks.menu`           | `TruckMenuScreen`       | `foodTruckId`, `truck?`, `categoryId?` |
| `product.detail`            | `ProductScreen`         | `product?`, `productId?`, `storeId?`   |
| `cart`                      | `CartScreen`            | none                                   |
| `cart.item`                 | `CartItemScreen`        | `cartItem?`                            |
| `checkout`                  | `CheckoutScreen`        | none                                   |
| `order.detail`              | `OrderScreen`           | `order`                                |
| `order.receipt`             | `ReceiptScreen`         | `order`                                |
| `order.history`             | `OrderHistoryScreen`    | none                                   |
| `account.profile`           | `ProfileScreen`         | none                                   |
| `account.details`           | `AccountScreen`         | none                                   |
| `auth.login`                | `LoginScreen`           | `redirectTo?`                          |
| `auth.createAccount`        | `CreateAccountScreen`   | `redirectTo?`                          |
| `network.home`              | `NetworkHomeScreen`     | none                                   |
| `network.directory`         | `NetworkCategoryScreen` | `categoryId?`                          |
| `network.search`            | `NetworkSearchScreen`   | none                                   |
| `network.map`               | `NetworkMapScreen`      | none                                   |
| `network.store`             | `NetworkStoreScreen`    | `storeId`                              |
| `network.product`           | `NetworkProductScreen`  | `productId`, `storeId?`                |

Full param types are in `src/extensions/screens/params.ts`. Inside a Network, `network.store` renders the `store.home` screen and `network.product` renders `product.detail`, so overrides of those screens apply in both editions.

Boot, location permission, payment gateway, phone verification and account deletion screens can't be overridden.

## Rules for contributors

- Navigators under `src/navigation` must reference overridable screens with `screenSlot(id)` instead of importing them. ESLint and `__tests__/extensions/navigation-boundaries.test.js` enforce this.
- Add new overridable screens to `src/extensions/screens/screen-ids.ts`, `params.ts` and `default-screens.ts`.
- Screen ids are a public contract. Don't rename them; add a new id instead.
