> v0.1.0 ~ "A redesigned app for stores, marketplaces and trucks, branded from one file"

---
## Highlights

- **Redesigned throughout.** Every screen is rebuilt on a shared design system, in light and dark, with text that follows the system font size and screen reader labels.
- **Three kinds of app.** A store key builds one business's app; a network key builds a marketplace with discovery, search across stores, a stores map and carts that span stores; either can open on a live map and list of mobile trucks.
- **Shop home for Networks.** A Network built around one main store can open on its categories first, with live offers, the customer's active orders (live, with a small timeline), their usual items, bookable services and partner shops. Categories open on their own screen with subcategories and the offers aimed at them.
- **Service bookings.** Bookable services with free slots from the server, deposits, and appointments added to the calendar.
- **Offers everywhere they apply.** An Offers tab, offer detail with how to use it, promo codes applied in one tap, and offer badges and banners on the categories and products they cover.
- **After the order.** Live tracking, chat with the store and the driver, store edits shown live with any balance to pay, wrong-address reports, receipts, reviews with photos, and an in-app notifications inbox.
- **Checkout.** Stripe and QPay, delivery or pickup, tips, a note for the store that reaches every order (QPay included), unavailable items flagged before paying, and **Choose on the map** for addresses search can't find.
- **Sign-in.** Phone number and texted code, Sign in with Apple and Sign in with Google. Facebook sign-in is removed.
- **Branding from one file.** `brand/storefront.brand.ts` sets colors for light and dark, fonts, buttons, chips, radii, tabs (with icons and labels), the home screen and screen variants. The app icon and launch screen are generated from `brand/` artwork, and any screen can be replaced or added from `brand/storefront.extensions.ts`.
- **Languages.** English, Mongolian and Ukrainian, with a language switcher; `AVAILABLE_LOCALES` decides which are offered and `DEFAULT_COUNTRY` where the phone field starts.

---
## Upgrading
- Use with Storefront v0.4.27 or later on the server. Earlier versions don't keep the customer's note on QPay orders and have no nested categories for the shop home.
- React Native 0.86 with the New Architecture: run `yarn install` and `yarn pod:install` after merging.
- `.env` branding keys still work, but the brand file overrides them; see `docs/branding.md`. `FACEBOOK_*` keys are no longer used.
- Android builds need `android/app/google-services.json`.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
