<p align="center">
  <img src="https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/storefront-logo.svg" width="380" height="100" alt="Fleetbase Storefront" />
</p>

<p align="center">
  An open source shopping app for iOS, Android and the web, built with React Native on <a href="https://fleetbase.io">Fleetbase</a>.<br>
  Run one store, a marketplace of many, or a fleet of food trucks from the same codebase.
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
  <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-store-details.webp" width="200" alt="A store's home page with its categories and recommended products" />
  <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-product-details.webp" width="200" alt="A product with required and optional choices" />
  <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-network-details.webp" width="200" alt="The marketplace home of a Network, with member stores" />
  <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-food-trucks-map.webp" width="200" alt="Live food trucks on a map, with the trucks serving the customer's zone" />
</p>

<p align="center">
  <a href="https://fleetbase.io">fleetbase.io</a> · <a href="https://fleetbase.io/docs">Docs</a> · <a href="https://console.fleetbase.io">Console</a> · <a href="https://discord.gg/V7RVWRQ2Wm">Discord</a> · <a href="https://twitter.com/fleetbase_io">@fleetbase_io</a>
</p>

## Contents

- [What it is](#what-it-is)
- [Features](#features)
- [Screenshots](#screenshots)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Editions](#editions)
- [Payments](#payments)
- [Push notifications](#push-notifications)
- [Languages](#languages)
- [Making it yours](#making-it-yours)
- [Development](#development)
- [Releases and screenshots](#releases-and-screenshots)
- [Contributing](#contributing)
- [License](#license)

## What it is

Storefront is the commerce extension of [Fleetbase](https://fleetbase.io): products, catalogs, carts, customers, checkout and orders, with delivery handled by Fleetbase's logistics. This repository is the customer app for it. Customers browse, order, pay and follow their delivery; you manage the store, its orders and its drivers in the Fleetbase Console.

The key you build the app with decides what it is:

| Key | The app becomes |
| --- | --- |
| `store_…` | One store's own app. Home is the store page. |
| `network_…` | A marketplace (a Storefront **Network**) of member stores, with discovery, search across stores, a stores map and carts that can span stores. |
| either, with `HOME_SCREEN=foodTrucks` | A food-truck app: home is a live map of the trucks serving the customer's zone. |

## Features

- **Shopping:** store and marketplace home pages, categories, search with filters, product options and add-ons, recommended products, offers and promo codes.
- **Ordering:** delivery or pickup, tips, scheduled orders and bookings, saved places, a cart that remembers the device, checkout with Stripe, QPay or PayPal.
- **After the order:** live tracking on a map with the driver's position, order status in real time over sockets, push notifications, chat with the driver, receipts and order history, reviews.
- **Accounts:** sign in with a phone number and a texted code, profile and saved payment methods, account deletion from the app.
- **Food trucks:** live truck positions and zones, each truck's menu, ordering from the nearest truck.
- **Built to be rebranded:** colors, fonts, buttons, tabs and screens are set from a `brand/` folder, so a client build upgrades with a plain merge. See [Making it yours](#making-it-yours).
- **Accessible and themed:** light and dark appearance, text that scales with the system font size, screen reader labels.

## Screenshots

Captured automatically on the iOS Simulator and the Android Emulator for every release, against demo data. See [Releases and screenshots](#releases-and-screenshots).

**A single store**

| Store | Product | Cart | Checkout | Order |
| :-: | :-: | :-: | :-: | :-: |
| <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-store-details.webp" width="160" alt="Store page" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-product-details.webp" width="160" alt="Product" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-cart-details.webp" width="160" alt="Cart" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-checkout-create.webp" width="160" alt="Checkout" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-order-details.webp" width="160" alt="An order in progress" /> |

**A Network (marketplace)**

| Marketplace | Member store | Search | Stores map | Account |
| :-: | :-: | :-: | :-: | :-: |
| <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-network-details.webp" width="160" alt="Marketplace home" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-store-details-network.webp" width="160" alt="Member store" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-products-list-network.webp" width="160" alt="Search results across stores" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-stores-map-network.webp" width="160" alt="Stores map" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-account-details-network.webp" width="160" alt="Account" /> |

**Food trucks**

| Trucks map | Trucks list | Truck menu | Search | Light appearance |
| :-: | :-: | :-: | :-: | :-: |
| <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-food-trucks-map.webp" width="160" alt="Trucks map" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-food-trucks-list.webp" width="160" alt="Trucks list" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-food-truck-details.webp" width="160" alt="A truck's menu" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-products-list-food-trucks.webp" width="160" alt="Search showing which truck has each product" /> | <img src="https://fleetbase.io/images/screenshots/storefront-app/ios/storefront-app-food-trucks-map-light.webp" width="160" alt="Trucks map in the light appearance" /> |

Android screenshots are published alongside, under `storefront-app/android/`.

## Quick start

**You need:** Node 20 (see `.nvmrc`), Yarn 3 through Corepack, Xcode 16 with CocoaPods for iOS, Android Studio with JDK 21 for Android, and a Fleetbase account ([cloud](https://console.fleetbase.io) or [self-hosted](https://github.com/fleetbase/fleetbase)) with the Storefront extension.

```bash
git clone https://github.com/fleetbase/storefront-app.git
cd storefront-app
corepack enable
yarn install
cp .env.example .env
```

Fill in `.env` (see [Configuration](#configuration)), then install the iOS pods and run:

```bash
yarn pod:install
yarn ios
```

```bash
yarn android
```

```bash
yarn web
```

To build a client's app, fork this repository into a private one and keep everything the client owns in `brand/`. See [docs/client-builds.md](docs/client-builds.md).

## Configuration

The app reads its settings from `.env` at build time.

**Required**

| Key | What it is |
| --- | --- |
| `STOREFRONT_KEY` | Your store key (`store_…`) or network key (`network_…`), from Storefront → Settings → API in the Console. |
| `FLEETBASE_KEY` | A Fleetbase API key, from Developers → API Keys in the Console. |
| `FLEETBASE_HOST` | Your Fleetbase API, e.g. `https://api.fleetbase.io` or your own server. |
| `GOOGLE_MAPS_API_KEY` | Google Maps for Android (Maps SDK for Android) and address lookup. |
| `APP_NAME`, `APP_IDENTIFIER` | The app's name and bundle id / application id. |

**Common options**

| Key | Default | What it does |
| --- | --- | --- |
| `PAYMENT_GATEWAY` | `stripe` | `stripe`, `qpay` or `paypal` |
| `STRIPE_KEY` | | Stripe publishable key, when using Stripe |
| `STRIPE_ENABLE_APPLE_PAY`, `STRIPE_ENABLE_GOOGLE_PAY` | `false` | Wallet buttons in the Stripe sheet |
| `HOME_SCREEN` | `store` | `foodTrucks` opens the app on the trucks map |
| `DEFAULT_LOCALE`, `AVAILABLE_LOCALES` | `en`, `en,mn,uk` | Languages offered |
| `DEFAULT_COORDINATES` | | `lat,lng` used before the customer's location is known |
| `SOCKETCLUSTER_HOST`, `SOCKETCLUSTER_PORT`, `SOCKETCLUSTER_SECURE` | Fleetbase cloud | Your realtime server |
| `TIP_INCREMENT` | `50` | Tip step, in the currency's smallest unit |
| `TOS_URL`, `PRIVACY_URL` | | Linked from the account screen |
| `APP_LINK_PREFIX` | | URL scheme for deep links |

`.env` is compiled into native builds, so changing it needs a rebuild. In development you can switch storefronts without one: put overrides in a git-ignored `env.dev.json` at the repository root, for example `{ "STOREFRONT_KEY": "network_…" }`, and restart Metro. Release builds ignore it.

## Editions

**Single store.** Build with a `store_…` key. Home is the store page; the tabs are Home, Search, Map, Cart and Account by default.

**Network.** Create a Network in the Console under Storefront → Networks, invite stores to it, and build with its `network_…` key. Customers discover stores, search products across them and see the stores on a map. Turn on multi-store carts in the Network's settings to let one order span several stores.

**Food trucks.** Add food trucks to a store in the Console (each one is a Fleet-Ops vehicle with a service area and zone) and build with `HOME_SCREEN=foodTrucks`. With a network key, the map shows every member store's trucks. In a Network you can also keep the regular home and add the trucks as a tab.

## Payments

Choose the gateway with `PAYMENT_GATEWAY` and set it up in the Console under Storefront → Settings → Payment gateways.

- **Stripe:** cards and saved payment methods through Stripe's payment sheet, with Apple Pay and Google Pay. Set `STRIPE_KEY` to your publishable key.
- **QPay:** Mongolian bank apps and QR; the app shows the customer's bank list and confirms the payment when they come back.
- **PayPal.**

## Push notifications

Customers get order updates as push notifications. Add a notification channel in the Console under Storefront → Settings → Notifications:

- **iOS (APNs):** enable Push Notifications in Xcode under Signing & Capabilities, create an APNs key in your Apple developer account, and enter its key id, your team id, the app's bundle id and the key's contents.
- **Android (FCM):** add an Android app to a Firebase project, place its `google-services.json` in `android/app/`, and paste the service account JSON and project name into the channel.

## Languages

English, Mongolian and Ukrainian ship with the app (`translations/`). Customers switch language from the account screen or the language button in the header. To add a language, add `translations/<code>.json` with the same keys and list it in `AVAILABLE_LOCALES`. Translation pull requests are welcome.

## Making it yours

Everything a branded build changes lives in `brand/`, which this repository never ships, so taking a new release is a merge without conflicts.

```
brand/
  storefront.brand.ts         colors, fonts, buttons, chips, tabs, home screen
  storefront.extensions.ts    replace screens, add screens and tabs
  screens/                    your own screens
  translations/<locale>.json  your copy over the app's strings
  fonts/                      font files, named by PostScript name
```

- [Branding](docs/branding.md): colors for light and dark, typography, gradient buttons, corner radii, tab bar, which tabs show.
- [Extending](docs/extensibility.md): every replaceable screen id, custom routes and tabs, platform-specific screens.
- [Client builds](docs/client-builds.md): the fork layout, what client code may import, and upgrading.

Generate the app icon and launch screen from `brand/app-icon.png` (1024×1024) and `brand/splash-screen.png`, or the templates in `assets/` when a build has none. The launch screen background is the brand file's `boot.background`, or pass `--background=#hex`:

```bash
yarn generate:app-icon
yarn generate:launch-screen
```

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

CI (`.github/workflows/react-native-ci.yml`) lints, type-checks, runs the tests with coverage, builds the web bundle, and builds iOS and Android on every pull request.

## Releases and screenshots

Pushing a `v*` tag publishes a GitHub release and asks [fleetbase/showcase](https://github.com/fleetbase/showcase) to capture that release. Showcase starts a Fleetbase stack with demo data, builds the app for each edition, and runs the [Maestro](https://maestro.mobile.dev) flows in [`.maestro/screenshots`](.maestro/screenshots) on the iOS Simulator and the Android Emulator, in dark and light. Changed screenshots are proposed to fleetbase.io in a pull request, and the images in this README update with it. Every run also produces a review gallery of all screens.

The flows select elements by `testID`. When you change a screen, keep its ids or update its flow in the same pull request.

## Contributing

Bug reports, translations and pull requests are welcome. For larger changes, open an issue or ask on [Discord](https://discord.gg/V7RVWRQ2Wm) first. Run `yarn lint:strict`, `yarn typecheck:strict` and `yarn test` before opening a pull request.

## License

Released under the [GNU Affero General Public License v3.0](LICENSE.md). If you modify the app and make it available to others, those modifications must be released under the same license. The [Fleetbase Commercial License](https://fleetbase.io/licensing/commercial) removes that obligation for proprietary and white-label builds. See the [licensing overview](https://fleetbase.io/licensing), or ask at hello@fleetbase.io.
