# Screenshot flows

[Maestro](https://maestro.mobile.dev) flows that capture the app's screens on the iOS Simulator and the Android Emulator. The [showcase](https://github.com/fleetbase/showcase) pipeline runs them on every release against seeded demo data and opens a PR on fleetbase.io with the images that changed. They live here so they change together with the screens they walk through.

| Flow              | Build                                   | Screens                                                                                                          |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `store.yaml`      | a store key (`store_…`)                 | store home, category, product, search, map, cart, sign-in, code, account, orders, order tracking, checkout        |
| `network.yaml`    | a network key (`network_…`)             | network home, store, product, search, map, cart                                                                  |
| `food-trucks.yaml`| a store key with `HOME_SCREEN=foodTrucks` | trucks map, list, truck menu, trucks search                                                                      |

## Running locally

1. Build a release-mode app (the JS must be bundled) pointed at a seeded Fleetbase: `FLEETBASE_HOST`, `FLEETBASE_KEY` and `STOREFRONT_KEY` in `.env`, `DEFAULT_LOCALE=en`.
2. Install it on a booted simulator or emulator. Set the appearance there (`xcrun simctl ui booted appearance dark`, `adb shell cmd uimode night yes`).
3. Run a flow:

```bash
maestro test .maestro/screenshots/store.yaml -e CUSTOMER_PHONE=+6590000000 -e VERIFICATION_CODE=000000
```

Screenshots are written to the working directory as `<shot>.png`; pass `-e SHOT_SUFFIX=-light` for the light appearance.

## Variables

| Name                | Default              | Purpose                                                                                     |
| ------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `APP_ID`            | `com.storefront.app` | Bundle id / application id                                                                  |
| `SHOT_SUFFIX`       | empty                | Appended to every file name, e.g. `-light`                                                  |
| `SEARCH_QUERY`      | `tea`                | What the search screens search for                                                          |
| `LATITUDE`, `LONGITUDE` | Singapore        | Where the customer is (the seeded stores and truck zone)                                    |
| `CUSTOMER_PHONE`    | none                 | The seeded review customer (store flow)                                                      |
| `VERIFICATION_CODE` | none                 | The server's `STOREFRONT_BYPASS_VERIFICATION_CODE`, honoured only for `STOREFRONT_REVIEW_ACCOUNTS` |

## Selectors

Flows select by `testID` only, never by text, so copy and language changes don't break them. Ids are kebab-case: `tab-store-home`, `product-item`, `store-card`, `cart-checkout`, `phone-number`, `code-input`, `account-orders`, `order-row`. Tab ids come from the route name (`StoreCartTab` → `tab-store-cart`). When a screen changes, keep its ids, or update the flow in the same PR.
