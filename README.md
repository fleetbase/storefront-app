<p align="center">
  <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/storefront-logo.svg" width="380" height="100" alt="Fleetbase Storefront" />
</p>

<p align="center">
  The customer app for ordering, booking and delivery on <a href="https://fleetbase.io">Fleetbase</a>.<br>
  One store, a marketplace of many, or a fleet of mobile trucks, on iOS, Android and the web.
</p>

<p align="center">
  <a href="https://github.com/fleetbase/storefront-app/actions/workflows/react-native-ci.yml"><img src="https://github.com/fleetbase/storefront-app/actions/workflows/react-native-ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://codecov.io/gh/fleetbase/storefront-app"><img src="https://codecov.io/gh/fleetbase/storefront-app/branch/main/graph/badge.svg" alt="Coverage" /></a>
  <a href="https://github.com/fleetbase/storefront-app/releases"><img src="https://img.shields.io/github/v/release/fleetbase/storefront-app?sort=semver" alt="Latest release" /></a>
  <img src="https://img.shields.io/badge/React%20Native-0.86-61dafb?logo=react&logoColor=white" alt="React Native 0.86" />
  <img src="https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-4b5563" alt="Platforms: iOS, Android, Web" />
  <a href="LICENSE.md"><img src="https://img.shields.io/github/license/fleetbase/storefront-app" alt="License: AGPL-3.0" /></a>
  <a href="https://discord.gg/V7RVWRQ2Wm"><img src="https://img.shields.io/discord/699834923032248430?logo=discord&logoColor=white&label=discord" alt="Discord" /></a>
</p>

<p align="center">
  <a href="https://fleetbase.io/platform/storefront">Storefront</a> · <a href="https://fleetbase.io/docs/storefront/app/overview">Docs</a> · <a href="https://console.fleetbase.io">Console</a> · <a href="https://fleetbase.io/pricing">Pricing</a> · <a href="https://discord.gg/V7RVWRQ2Wm">Discord</a>
</p>

<p align="center">
  <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-store-details.webp" width="240" alt="A store's home page: categories, recommended products and the store's open hours" />
  <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-network-details.webp" width="240" alt="A marketplace home: featured stores, categories and stores near the customer" />
  <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-food-trucks-map.webp" width="240" alt="The trucks home: live trucks on a map with the trucks serving the customer's zone" />
</p>

## Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Run it on Fleetbase Cloud](#run-it-on-fleetbase-cloud)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Payments](#payments)
- [Sign-in](#sign-in)
- [Push notifications](#push-notifications)
- [Languages](#languages)
- [Branding and customization](#branding-and-customization)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Overview

Storefront is the commerce side of [Fleetbase](https://fleetbase.io): catalogs, customers, checkout and orders, with delivery run by Fleetbase's dispatch and driver apps. This is the app your customers use. They browse and search, order products, book services, pay, chat with you and their driver, and follow the delivery live. You run the stores, orders, drivers and promotions from the Fleetbase Console.

The key you build with decides what the app is:

| Build with | The app becomes |
| --- | --- |
| A store key (`store_…`) | One business's own branded app. Home is the store page. |
| A network key (`network_…`) | A marketplace of member stores, with discovery, search across stores, a stores map and carts that span stores. |
| Either key, with the trucks home | A mobile commerce app: home is a live map and list of the trucks serving the customer's zone, alongside your fixed stores. |

## Features

**Shopping**
- Store and marketplace home pages with categories, recommended products and featured stores.
- Search with recent searches, popular categories and filters, scoped to a store or across a marketplace.
- Product variants and add-ons with required and optional choices, sale prices and live stock levels.
- Offers and promo codes, applied at checkout.

**Service bookings**
- Bookable services alongside products: customers pick a day and a start time from the slots you have open.
- Deposits taken at booking, with the balance settled later.
- Booked appointments can be added to the customer's calendar.

**Marketplace**
- One app for many independent stores, each with its own catalog, hours and locations.
- Discovery by category, tag and distance, and a map of every member store.
- One cart and one checkout across stores.

**Trucks**
- Mobile stores on a live map, each truck with its own catalog and service zone.
- Trucks shown alongside fixed store locations, as a map or a list.
- Customers order from the trucks serving their location.

**Ordering and checkout**
- Delivery or pickup, scheduled orders and tips.
- Saved addresses, with a map pin for places address search can't find.
- Two payment gateways: Stripe (cards, saved cards, Apple Pay, Google Pay) and QPay (Mongolian bank apps and QR).
- Unavailable items are flagged before payment, not after.

**After the order**
- Live tracking with the driver's position on the map and the order's progress in real time.
- Live chat with the store and with the driver, from the order screen.
- Order changes made by the store show up live, with any balance to pay; customers can report a wrong address.
- Receipts, order history and reviews of the stores they ordered from.
- Push notifications for order updates, chat messages and offers, plus an in-app inbox.

**Accounts**
- Sign in with a phone number and a texted code, or with Apple and Google.
- Profile, saved payment methods and address book.
- Account deletion from inside the app, as the app stores require.

**Your brand**
- Colors for light and dark, fonts, buttons, chips, corner radii, tab bar, which tabs show and their icons and labels, all from one brand file.
- App icon and launch screen generated from your artwork.
- Replace any screen or add your own screens and tabs without forking the app's code.

**Built for everyone**
- iOS, Android and the web from one codebase.
- Light and dark appearance, text that follows the system font size, and screen reader labels.
- English, Mongolian and Ukrainian included, with a language switcher.

## Screenshots

Every screen is designed to feel native on iOS and Android, in light and dark. Customers find what they want in a couple of taps, check out in seconds and watch their order arrive live, with your brand on every screen.

**A single store**

| Store | Category | Product | Cart | Order |
| :-: | :-: | :-: | :-: | :-: |
| <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-store-details.webp" width="160" alt="Store page" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-category-details.webp" width="160" alt="A category with its products" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-product-details.webp" width="160" alt="Product" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-cart-details.webp" width="160" alt="Cart" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-order-details.webp" width="160" alt="An order in progress" /> |

**A Network (marketplace)**

| Marketplace | Member store | Search | Stores map | Account |
| :-: | :-: | :-: | :-: | :-: |
| <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-network-details.webp" width="160" alt="Marketplace home" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-store-details-network.webp" width="160" alt="Member store" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-products-list-network.webp" width="160" alt="Search results across stores" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-stores-map-network.webp" width="160" alt="Stores map" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-account-details-network.webp" width="160" alt="Account" /> |

**Trucks**

| Trucks map | Trucks list | Truck menu | Search | Light appearance |
| :-: | :-: | :-: | :-: | :-: |
| <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-food-trucks-map.webp" width="160" alt="Trucks map" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-food-trucks-list.webp" width="160" alt="Trucks list" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-food-truck-details.webp" width="160" alt="A truck's menu" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-products-list-food-trucks.webp" width="160" alt="Search showing which truck has each product" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-food-trucks-map-light.webp" width="160" alt="Trucks map in the light appearance" /> |

**On Android**

| Store | Product | Marketplace | Trucks map | Order |
| :-: | :-: | :-: | :-: | :-: |
| <img src="https://fleetbase.io/images/screenshots/storefront-app/android/storefront-app-store-details.webp" width="160" alt="Store page on Android" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/android/storefront-app-product-details.webp" width="160" alt="Product on Android" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/android/storefront-app-network-details.webp" width="160" alt="Marketplace home on Android" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/android/storefront-app-food-trucks-map.webp" width="160" alt="Trucks map on Android" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/android/storefront-app-order-details.webp" width="160" alt="An order in progress on Android" /> |

**Light appearance**

| Store | Marketplace | Product | Cart | Order |
| :-: | :-: | :-: | :-: | :-: |
| <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-store-details-light.webp" width="160" alt="Store page in the light appearance" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-network-details-light.webp" width="160" alt="Marketplace home in the light appearance" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-product-details-light.webp" width="160" alt="Product in the light appearance" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-cart-details-light.webp" width="160" alt="Cart in the light appearance" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-order-details-light.webp" width="160" alt="An order in progress in the light appearance" /> |

## Run it on Fleetbase Cloud

The app needs a Fleetbase backend with the Storefront extension. [Fleetbase Cloud](https://console.fleetbase.io) is the quickest way to get one: sign up, create a store, add products, and you have the keys to build the app the same day. Everything the app shows is managed from the Console:

- Stores, locations, opening hours and catalogs, including bookable services.
- Networks for a marketplace, and trucks with their zones.
- Payment gateways, notification channels, promotions and promo codes.
- Orders, dispatch and drivers, with the [Navigator](https://github.com/fleetbase/navigator-app) driver app.

See [pricing](https://fleetbase.io/pricing), or [talk to us](https://fleetbase.io/contact/sales) about a managed launch. Fleetbase is also available to [self-host](https://github.com/fleetbase/fleetbase).

## Quick start

You need:
- Node 20 (see `.nvmrc`) and Yarn 3 through Corepack.
- Xcode with CocoaPods for iOS, and Android Studio with JDK 21 for Android.
- A Fleetbase account with the Storefront extension, on [Fleetbase Cloud](https://console.fleetbase.io) or [self-hosted](https://github.com/fleetbase/fleetbase).

```bash
git clone https://github.com/fleetbase/storefront-app.git
cd storefront-app
corepack enable
yarn install
cp .env.example .env
```

Set your keys in `.env` (see [Configuration](#configuration)). Then run on iOS:

```bash
yarn pod:install
```

```bash
yarn ios
```

Or on Android, or in a browser:

```bash
yarn android
```

```bash
yarn web
```

The [Storefront app quickstart](https://fleetbase.io/docs/storefront/app/quickstart) walks through creating the store and its keys in the Console. To ship a branded app for a client, see [Branding and customization](#branding-and-customization) and [Build and release](https://fleetbase.io/docs/storefront/app/build-and-release).

## Configuration

The app reads `.env` at build time, so a change needs a rebuild. The full list is in the [configuration docs](https://fleetbase.io/docs/storefront/app/configuration).

**Required**

| Key | What it is |
| --- | --- |
| `STOREFRONT_KEY` | Your store key (`store_…`) or network key (`network_…`), from Storefront → Settings → API in the Console. |
| `FLEETBASE_KEY` | A Fleetbase API key, from Developers → API Keys in the Console. |
| `FLEETBASE_HOST` | Your Fleetbase API: `https://api.fleetbase.io` on Fleetbase Cloud, or your own server. |
| `GOOGLE_MAPS_API_KEY` | Google Maps on Android, and address search. |
| `APP_NAME`, `APP_IDENTIFIER` | The app's display name and its bundle id / application id. |

**Common options**

| Key | Default | What it does |
| --- | --- | --- |
| `PAYMENT_GATEWAY` | `stripe` | `stripe` or `qpay` |
| `STRIPE_KEY` | | Stripe publishable key, when using Stripe |
| `STRIPE_ENABLE_APPLE_PAY`, `STRIPE_ENABLE_GOOGLE_PAY` | `false` | Wallet buttons in the Stripe payment sheet |
| `TIP_INCREMENT` | `50` | Tip step, in the currency's smallest unit |
| `PRIORITIZE_PICKUP` | `false` | Start checkout on pickup instead of delivery |
| `DEFAULT_LOCALE`, `AVAILABLE_LOCALES` | `en`, `en,mn,uk` | The starting language and the languages offered |
| `DEFAULT_COUNTRY` | device region | Country the phone field starts on, e.g. `MN` for +976 |
| `DEFAULT_COORDINATES` | | `lat,lng` used until the customer's location is known |
| `DEFAULT_MAP_TYPE` | `standard` | `standard`, `satellite`, `hybrid` or `terrain`, on every map |
| `DISABLE_GEOCODING_SCREEN` | `false` | Add addresses with the map pin only, for regions where address search is weak |
| `APPLE_LOGIN_ENABLED`, `GOOGLE_LOGIN_ENABLED` | `false` | Sign-in options; see [Sign-in](#sign-in) |
| `TOS_URL`, `PRIVACY_URL` | | Linked from the account screen |
| `APP_LINK_PREFIX` | | URL scheme for deep links, e.g. `myshop` |
| `SOCKETCLUSTER_HOST`, `SOCKETCLUSTER_PORT`, `SOCKETCLUSTER_SECURE`, `SOCKETCLUSTER_PATH` | Fleetbase Cloud | Your realtime server, when self-hosting |

The look of the app, which tabs show and whether home is the store or the trucks are set in the brand file, not in `.env`. See [Branding and customization](#branding-and-customization).

In development you can switch keys without rebuilding: put overrides in a git-ignored `env.dev.json` at the repository root, for example `{ "STOREFRONT_KEY": "network_…" }`, and restart Metro. Release builds ignore it.

## Payments

Set the gateway with `PAYMENT_GATEWAY`, and its credentials in the Console under Storefront → Settings → Payment gateways. See [payment gateways](https://fleetbase.io/docs/storefront/orders/payment-gateways).

- **Stripe:** cards and saved cards through Stripe's payment sheet, with Apple Pay and Google Pay. Set `STRIPE_KEY` to your publishable key.
- **QPay:** the customer picks their bank app or scans a QR code; the app confirms the payment when they return, and lets them retry or pay another way if it doesn't go through.

## Sign-in

Customers sign in with a phone number and a code sent by text. Apple and Google can be added:

- **Apple:** `APPLE_LOGIN_ENABLED=true`, with the Sign in with Apple capability in Xcode. Shown on iOS.
- **Google:** `GOOGLE_LOGIN_ENABLED=true`, `GOOGLE_CLIENT_ID` (the web client) and `GOOGLE_IOS_CLIENT_ID` (the iOS client), both without the `.apps.googleusercontent.com` ending. Android also needs an Android OAuth client for your package name and signing key. Shown on iOS and Android.

See [customer authentication](https://fleetbase.io/docs/storefront/customers/authentication).

## Push notifications

Add a notification channel in the Console under Storefront → Settings → Notifications. See [notification settings](https://fleetbase.io/docs/storefront/settings/notifications).

- **iOS (APNs):** enable Push Notifications under Signing & Capabilities in Xcode, create an APNs key in your Apple developer account, and enter its key id, your team id, the bundle id and the key in the channel.
- **Android (FCM):** add an Android app to a Firebase project, place its `google-services.json` in `android/app/`, and add the service account to the channel.

## Languages

English, Mongolian and Ukrainian are included in `translations/`. Customers switch language from the account screen or the language button in the header. To add a language, add `translations/<code>.json` with the same keys and list it in `AVAILABLE_LOCALES`. Translation pull requests are welcome.

## Branding and customization

Everything a branded build changes lives in `brand/`, which this repository never ships, so a client build takes each new release as a plain merge.

```
brand/
  storefront.brand.ts         colors, fonts, buttons, tabs, home screen
  storefront.extensions.ts    replaced screens, added screens and tabs
  screens/                    your own screens
  translations/<locale>.json  your copy over the app's strings
  fonts/                      font files, named by PostScript name
  app-icon.png                1024×1024, for the app icon
  splash-screen.png           the logo on the launch screen
```

A few things the brand file sets:

```ts
navigation: {
    home: 'foodTrucks',          // open on the trucks home ('store' by default)
    foodTrucksView: 'list',      // the trucks home opens as a list, with the map as a toggle
    tabs: { StoreHomeTab: { icon: 'shop', label: 'tabs.Shop' } },
},
```

Generate the app icon and launch screen from your artwork. The launch screen uses the brand file's boot background unless you pass `--background=#hex`:

```bash
yarn generate:app-icon
```

```bash
yarn generate:launch-screen
```

- [Branding](docs/branding.md): every brand file option, for light and dark.
- [Extending](docs/extensibility.md): replaceable screen ids, custom routes and tabs, platform-specific screens.
- [Client builds](docs/client-builds.md): the private fork layout, what client code may import, and upgrading.
- [Home screens and tabs](docs/home-screens.md): the home each edition can open on (including the shop home for a Network built around one main store), tabs, and offers shown next to the products they apply to. Also what belongs in this repository and what belongs in a client's `brand/`.
- [Theming](https://fleetbase.io/docs/storefront/app/theming) and [integrations](https://fleetbase.io/docs/storefront/app/integrations) on fleetbase.io.

## Development

| Command | What it does |
| --- | --- |
| `yarn start` | Metro |
| `yarn ios`, `yarn android`, `yarn web` | Run the app |
| `yarn test` | Jest |
| `yarn lint:strict`, `yarn typecheck:strict` | The lint and type checks CI runs |
| `yarn web:build` | Production web bundle |
| `yarn pod:install`, `yarn pod:reset` | iOS dependencies |
| `yarn brand:link` | Re-link `brand/` after adding or removing a file in it |

CI lints, type-checks, runs the tests with coverage, builds the web bundle, and builds iOS and Android on every pull request.

## Contributing

Bug reports, translations and pull requests are welcome. For larger changes, open an issue or ask on [Discord](https://discord.gg/V7RVWRQ2Wm) first. Run `yarn lint:strict`, `yarn typecheck:strict` and `yarn test` before opening a pull request. The screenshot flows in `.maestro/screenshots` select elements by `testID`, so keep a screen's ids or update its flow in the same pull request.

## License

Released under the [GNU Affero General Public License v3.0](LICENSE.md). If you modify the app and make it available to others, those modifications must be released under the same license. The [Fleetbase Commercial License](https://fleetbase.io/licensing/commercial) removes that obligation for proprietary and white-label builds. See the [licensing overview](https://fleetbase.io/licensing), or write to hello@fleetbase.io.
