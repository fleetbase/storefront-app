# Branding

A storefront build's look is described by a typed, versioned **branding config**. The same config drives the Tamagui themes, the app configuration read by screens, and declarative screen variant selection.

## Sources and priority

Branding is resolved from these sources, lowest priority first:

1. **Defaults** (`src/branding/defaults.ts`): the historical storefront look.
2. **Legacy environment keys**: `APP_THEME`, `CUSTOM_COLORS*`, `STORE_HEADER_*`, `PRODUCT_CARD_STYLE`, `STORE_CATEGORIES_DISPLAY`, `STORE_NAVIGATOR_TABS`/`_DEFAULT_TAB`/`_TAB_BAR_BG`, `LOGIN_BG_IMAGE`, `BOOTSCREEN_BG_IMAGE` and `BOOTSCREEN_BACKGROUND_COLOR`. Existing `.env` profiles keep working unchanged.
3. **`storefront.brand.ts`** at the repository root.
4. **Local preview** (development builds only, see below).

Remote, published configuration will be layered on top in a later release.

## Example

```ts
import { defineBranding } from './src/branding';

export default defineBranding({
    schemaVersion: 1,
    colors: {
        preset: 'indigo',
        light: { primary: '#0f766e', primaryBorder: '#115e59', primaryText: '#ffffff' },
        extra: { all: { brandAccent: '#f59e0b' } },
    },
    appearance: { defaultScheme: 'light', allowUserToggle: false },
    components: {
        productCard: { variant: 'outlined' },
        storeCategories: { display: 'pills' },
        storeHeader: { showGradient: false, logoHeight: 120, logoWidth: 120 },
    },
    assets: { loginBackground: { url: 'https://cdn.example.com/login.jpg' } },
    boot: { background: ['#0f766e', '#115e59'] },
    navigation: { store: { tabs: ['StoreHomeTab', 'StoreSearchTab', 'StoreCartTab', 'StoreProfileTab'], tabBar: { background: 'blur' } } },
    screens: { 'store.home': { variant: 'editorial' } },
});
```

## Options

| Section | Field | Values |
|---|---|---|
| `colors` | `preset` | `blue`, `red`, `green`, `indigo`, `orange`, `truevegan` |
| | `light`, `dark` | Overrides for semantic keys: `background`, `surface`, `color`, `textPrimary`, `textSecondary`, `textPlaceholder`, `primary`, `primaryBorder`, `primaryText`, `secondary`, `secondaryBorder`, `borderColor`, `borderColorWithShadow`, `shadowColor`, `borderActive`, and `success`/`error`/`warning`/`info` with `…Border` and `…Text` variants |
| | `extra.all`, `extra.light`, `extra.dark` | Additional theme keys, e.g. `custom`, `customBorder` and `customText` for a custom tab bar |
| `appearance` | `defaultScheme` | `system` (default), `light`, `dark` |
| | `allowUserToggle` | `true` (default) shows the appearance option in Account |
| `components` | `productCard.variant` | `bordered` (default), `outlined`, `visio` |
| | `storeCategories.display` | `grid` (default), `pills` |
| | `storeHeader` | `showGradient`, `showLocationPicker`, `showTitle`, `showDescription`, `showLogo`, `logoHeight`, `logoWidth`, `direction`, `alignItems`, `justifyContent`, `spacing`, `paddingTop`/`Bottom`/`Left`/`Right` |
| `assets` | `loginBackground`, `bootBackground` | `{ bundled: 'storefront_photo_1' }`, `{ url: 'https://…' }` or `null` |
| `boot` | `background` | 1–4 colors or `$tokens`; more than one renders a gradient |
| `navigation.store` | `tabs`, `defaultTab` | `StoreHomeTab`, `StoreSearchTab`, `StoreMapTab`, `StoreCartTab`, `StoreProfileTab`, `StoreFoodTruckTab` |
| | `tabBar.background` | `blur` or a theme key (with matching `…Border` and `…Text` keys) |
| `screens` | `<screen id>.variant` | Selects a compiled-in variant registered in `storefront.extensions.ts` |

Colors accept hex (`#rgb`, `#rrggbb`, `#rrggbbaa`), `rgb()`/`rgba()`, `white`, `black` and `transparent`. Images must be bundled keys or `https` URLs.

## Validation and fallbacks

- Every source is validated against the schema. An invalid value is dropped on its own, and the next lower source's value (ultimately the default) is used. One bad color does not discard the rest of the config.
- A source with an unsupported `schemaVersion` is ignored.
- Text/background pairs are checked against WCAG AA (4.5:1 for body text, 3:1 for secondary text). Build-time failures are reported as development warnings. Sources that enforce contrast (local preview, and later remote configuration) have failing overrides reverted to the preset colors.
- Issues are logged once in development builds. `__tests__/branding/bundled-brand.test.ts` fails CI if `storefront.brand.ts` has issues.

## How themes are built

`tamagui.config.ts` compiles one light/dark theme pair per preset (`lightBlue`, `darkBlue`, …). The active preset's pair includes the build's color overrides. Each theme contains:

- the semantic keys,
- the shared palette keys (`$gray-500`, …),
- derived interaction keys that Tamagui components use (`backgroundHover`, `backgroundPress`, `borderColorFocus`, `placeholderColor`, `color1`…`color12`).

If colors resolved at runtime differ from the compiled theme (local preview now, remote configuration later), an equivalent theme (for example `lightBlueBrand`) is registered with Tamagui's `addTheme`. It works on native and injects CSS variables on web.

## Color scheme

`BrandingProvider` owns the color scheme. Users choose `system`, `light` or `dark` in Account, stored under `storefront:appearance`. An existing light/dark choice is migrated from the previous storage key. With `system`, the app follows the device setting as it changes.

## Previewing a theme (development builds)

Store a branding config as JSON under `storefront:branding-preview` and restart. On web:

```js
localStorage.setItem('storefront:branding-preview', JSON.stringify({ schemaVersion: 1, colors: { light: { primary: '#be185d' } } }));
location.reload();
```

Remove the key to return to the build branding. Previews are ignored in production builds.

## Using branding in code

- Components read the resolved values through `useBranding()` (or the compatibility `useAppTheme()`).
- Screens should not branch on branding to restyle themselves. They use theme tokens (`$primary`, `$textSecondary`) and shared components, whose variants read branding.
- `storefrontConfig('productCardStyle')` and the other presentation keys in `config/default.js` now come from the resolved branding.
