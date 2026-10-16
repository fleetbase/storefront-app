# Home screens and tabs

What a customer sees first, and the tabs around it, is set in the brand file. This page covers the home screens each edition can open on, the tabs, and how offers are shown alongside the products they apply to.

## What is built in, and what belongs to a client

This repository is the app every client builds from, so it holds only features that work for any store or Network. A feature a client asks for goes in one of two places:

- **Built in, switched off by default**, when it is useful beyond that client: a brand file setting or a screen variant turns it on. The shop home below is one: it was made for a Network built around one main store, but nothing in it names or assumes a particular business. With no brand setting, every app behaves exactly as before.
- **In the client's `brand/` folder**, when it only makes sense for that client: their own screens, registered in `brand/storefront.extensions.ts` to replace a built-in screen or add a route or tab. See [Extending](extensibility.md) and [Client builds](client-builds.md).

Client names, keys, tags and copy never go in this repository. They go in the client's brand file, `brand/translations`, or `.env`.

## Single store

| Home | How to choose it |
| --- | --- |
| The store page: header, categories, recommended products and every section of the catalog | Default |
| The food trucks screen: the store's trucks and locations, as a map or a list | `navigation.home: 'foodTrucks'`; `navigation.foodTrucksView: 'list'` opens it on the list |

Tabs: `navigation.store.tabs` (`StoreHomeTab`, `StoreSearchTab`, `StoreMapTab`, `StoreCartTab`, `StoreProfileTab`, `StoreFoodTruckTab`, or a custom tab), in order.

## Network

| Home | How to choose it |
| --- | --- |
| The directory: the Network's hero, search, categories, curated store rails and every member store | Default |
| The food trucks screen: every member store's trucks and locations | `navigation.home: 'foodTrucks'` |
| The shop home: one main store's categories first, with offers, orders, services and partner shops | `screens: { 'network.home': { variant: 'shop' } }` and `navigation.network.mainStoreTag` |

Tabs: `navigation.network.tabs`, in order. The default is `['NetworkHomeTab', 'NetworkSearchTab', 'NetworkMapTab', 'NetworkCartTab', 'NetworkProfileTab']`. Also available: `NetworkOffersTab` (every live offer) and `NetworkFoodTruckTab`, plus custom tabs from the build's extensions. The food trucks home leaves out the Map tab; `navigation.network.foodTrucks: true` adds the Trucks tab after Home when the list doesn't place it.

### The shop home

For a Network built around one main store, such as a business selling its own range from a central warehouse, with partner shops alongside it. From the top:

1. **Header.** A greeting with the customer's first name, "Deliver to" and the delivery address (tap to change it), the notifications button with the unread count, the language button and search.
2. **Active orders.** While orders are in progress, a card for each (several scroll sideways): its status, reference and when it was placed, a small timeline of its steps with the current one and when it was reached, and the products in it with the total. A quiet link opens the order history.
3. **Offers.** Every live offer, as swipeable cards. Tapping one opens it.
4. **Shop by category.** The main store's top-level categories as a grid, with their icons. A category with an offer aimed at it, or at a category under it, carries the offer's badge ("10%", "2+1"). With more than eight, the last tile and the section's All link open every category as a grid (`network.shopCategories`).
5. **Your usual.** The products the signed-in customer orders most, from their recent orders, with a link to the order history.
6. **Services.** Bookable services from partner shops, each opening its booking screen.
7. **Partner shops.** Every other member store, nearest first.

Sections with nothing to show are left out, so a new customer sees no orders or usual items.

**The main store** is the member store carrying the tag set in `navigation.network.mainStoreTag`. Add the same tag to that store in the Console; moving it to another store changes the main store without an app update. Without a tagged member the grid shows the Network's own categories and every member is a partner shop.

**A category** opens on a screen of its own (`network.shopCategory`):

- its products, and those of every category under it;
- chips to narrow it to a subcategory;
- a banner for each offer aimed at the category, a category above or under it, or a product shown;
- an offer badge on each product an offer covers.

### Example

```ts
// brand/storefront.brand.ts
export default defineBranding({
    schemaVersion: 1,
    screens: { 'network.home': { variant: 'shop' } },
    navigation: {
        home: 'store',
        network: {
            mainStoreTag: 'main-store',
            tabs: ['NetworkHomeTab', 'NetworkOffersTab', 'NetworkSearchTab', 'NetworkCartTab', 'NetworkProfileTab'],
        },
        tabs: { NetworkHomeTab: { icon: 'shop', label: 'tabs.Shop' } },
    },
});
```

```json
// brand/translations/en.json: the search field's text on the shop home
{ "Shop": { "searchPlaceholder": "Search rice, flour, oil…" } }
```

## Tab icons and labels

`navigation.tabs.<Tab>` sets one tab's icon and label in either edition, over the defaults:

```ts
navigation: { tabs: { NetworkHomeTab: { icon: 'shop', label: 'tabs.Shop' }, NetworkOffersTab: { icon: 'tag' } } },
```

- `icon`: `home`, `store`, `shop`, `bag`, `truck`, `utensils`, `map`, `compass`, `search`, `cart`, `user` or `tag`.
- `label`: a translation key, so it follows the language (`tabs.Shop` is Shop, Дэлгүүр, Магазин), or plain text. A build's own keys go in `brand/translations/<locale>.json`.

## Offers next to what they apply to

An offer applies to the products, categories or stores chosen for it in the Console, minus its exclusions. The app shows it where those are:

| Where | Which offers |
| --- | --- |
| Offers tab, offers on the home screens | Every live offer |
| A category tile's badge (shop home) | Offers aimed at that category or one under it |
| A category screen's banners | Offers aimed at the category, a category above or under it, or a product on the screen |
| A product tile's badge | Offers aimed at the product or its category, when the product isn't already on sale |

An offer on a whole store or the whole Network isn't aimed at anything in particular, so it gets no badges; it appears in the Offers tab and the offer cards. The matching is in `src/commerce/offers.ts` (`offerTargets`, `offersForProduct`).

## Replacing a home screen entirely

When none of these fit a client, their own home screen replaces the built-in one from `brand/storefront.extensions.ts`, without touching this repository:

```ts
screens: {
    'network.home': { load: () => import('./screens/HomeScreen') },
},
```

See [Extending](extensibility.md) for every screen id and for adding routes and tabs.
