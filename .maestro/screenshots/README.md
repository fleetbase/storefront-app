# Screenshot flows

[Maestro](https://maestro.mobile.dev) flows that capture the app's screens on the iOS Simulator and the Android Emulator. Fleetbase's screenshot pipeline runs them on every release against seeded demo data and publishes the images that changed to fleetbase.io. They live here so they change together with the screens they walk through.

| Flow              | Build                                   | Screens                                                                                                          |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `store.yaml`      | a store key (`store_…`)                 | store home, category, product, search, map, cart, sign-in, code, account, orders, order tracking, checkout        |
| `network.yaml`    | a network key (`network_…`)             | network home, store, product, search, map, cart, sign-in, code, account, orders, order details, checkout          |
| `food-trucks.yaml`| a store or network key with `HOME_SCREEN=foodTrucks` | trucks map, list, truck menu, trucks search; for a Network pass `QUALIFIER=-network` and `SEARCH_TAB=tab-network-search` |

## Running locally

1. Build a release-mode app (the JS must be bundled) pointed at a seeded Fleetbase: `FLEETBASE_HOST`, `FLEETBASE_KEY` and `STOREFRONT_KEY` in `.env`, `DEFAULT_LOCALE=en`.
2. Install it on a booted simulator or emulator. Set the appearance there (`xcrun simctl ui booted appearance dark`, `adb shell cmd uimode night yes`).
3. Run a flow:

```bash
maestro test .maestro/screenshots/store.yaml \
    -e APP_ID=com.storefront.app -e SHOT_SUFFIX= -e QUALIFIER= -e SEARCH_TAB=tab-store-search -e SEARCH_QUERY=tea \
    -e LATITUDE=1.2834 -e LONGITUDE=103.8607 -e CUSTOMER_PHONE=+6591000201 -e VERIFICATION_CODE=000000
```

Screenshots are written to the working directory as `<shot>.png`, named by showcase's rule (`<area>-<subject>-<view>[-qualifier]`, e.g. `storefront-app-product-details`); pass `-e SHOT_SUFFIX=-light` for the light appearance.

## Variables

Pass every one with `-e`. The flows declare no defaults, because a flow's own `env` takes precedence over the command line.

| Name                | Example              | Purpose                                                                                     |
| ------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `APP_ID`            | `com.storefront.app` | Bundle id / application id                                                                  |
| `SHOT_SUFFIX`       | empty                | Appended to every file name, e.g. `-light`                                                  |
| `SEARCH_QUERY`      | `tea`                | What the search screens search for                                                          |
| `QUALIFIER`         | empty                | `-network` for a Network build: names the sign-in and trucks screenshots                    |
| `SEARCH_TAB`        | `tab-store-search`   | The Search tab's id (food-trucks flow): `tab-network-search` in a Network                   |
| `LATITUDE`, `LONGITUDE` | Singapore        | Where the customer is (the seeded stores and truck zone)                                    |
| `CUSTOMER_PHONE`    | none                 | The seeded review customer (store flow)                                                      |
| `VERIFICATION_CODE` | none                 | The server's `STOREFRONT_BYPASS_VERIFICATION_CODE`, honoured only for `STOREFRONT_REVIEW_ACCOUNTS` |

## Selectors

Flows select by `testID` only, never by text, so copy and language changes don't break them. Ids are kebab-case: `tab-store-home`, `product-item`, `store-card`, `cart-checkout`, `phone-number`, `code-input`, `account-orders`, `order-row`. Tab ids come from the route name (`StoreCartTab` → `tab-store-cart`). When a screen changes, keep its ids, or update the flow in the same PR.
