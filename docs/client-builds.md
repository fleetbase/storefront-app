# Client builds

A branded storefront app for a client is a fork of this repository with one extra folder, `brand/`, that holds everything the client owns. The fork never edits files outside `brand/`, so taking a new release is a merge with no conflicts.

## Layout

```
brand/
  storefront.brand.ts         branding: colors, typography, appearance, components, navigation
  storefront.extensions.ts    screen overrides, extra screens (routes) and tabs
  screens/                    the client's screens and components
  translations/<locale>.json  copy merged over the app's strings (and keys for the client's screens)
  fonts/<PostScriptName>.ttf  font files named by their PostScript name
  assets/                     images the client's screens use
```

Every file is optional. Without `brand/`, the app uses the empty templates at the repository root (`storefront.brand.ts`, `storefront.extensions.ts`) and builds the stock storefront.

Files in `brand/` import the app through relative paths, for example:

```ts
// brand/storefront.extensions.ts
import { defineStorefrontExtensions } from '../src/extensions';

// brand/screens/RewardsScreen.tsx
import { UIText, Button, Card } from '../../src/ui';
import useCart from '../../src/hooks/use-cart';
```

## How the app finds brand files

`scripts/link-brand.js` writes small modules to `src/generated/` (git-ignored) that import `brand/storefront.brand.ts`, `brand/storefront.extensions.ts`, `brand/translations/*.json` and `brand/fonts/*` when they exist, and the root templates otherwise. It runs:

- from `babel.config.js`, so Metro, webpack, Jest and the Tamagui compiler always see the current files;
- after `yarn install` (`postinstall`) and before `yarn typecheck:strict`;
- on demand with `yarn brand:link`.

After adding or removing a file in `brand/` (not after editing one), restart Metro or the web dev server so the lookup runs again.

## What a client build can change

| Need                                                     | Where                                                              | Docs                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Colors, light and dark                                   | `brand/storefront.brand.ts` → `colors`                             | [Branding](branding.md)                               |
| Fonts and type scale                                     | `typography` and `brand/fonts`                                     | [Branding](branding.md#fonts)                         |
| Card styles, store header, category display              | `components`                                                       | [Branding](branding.md)                               |
| Tabs shown, their order, the first tab, food trucks home | `navigation`                                                       | [Branding](branding.md)                               |
| Replace a screen                                         | `brand/storefront.extensions.ts` → `screens`                       | [Extending](extensibility.md)                         |
| Add screens and tabs                                     | `routes`, `tabs`                                                   | [Extending](extensibility.md#adding-screens-and-tabs) |
| Change or add copy                                       | `brand/translations/<locale>.json`                                 | [Extending](extensibility.md#copy)                    |
| Keys, API host, feature flags                            | the build's `.env` (kept out of git, e.g. in the release pipeline) | README                                                |

Native identity (bundle id, app name, icons, splash screen, `Info.plist` and Gradle values, Firebase files) belongs in the build pipeline rather than in commits, because those files exist in this repository and editing them causes conflicts on every upgrade.

## Supported API for client code

Client screens may rely on:

- `src/extensions` (types, `defineStorefrontExtensions`, screen ids and params)
- `src/ui` (primitives, tokens, display helpers)
- `src/branding` (`defineBranding`, `useBranding`)
- the hooks `use-cart`, `use-cart-summary`, `use-storefront`, `use-current-location`, `use-food-trucks`, `use-store-locations`, `use-customer-coordinates`, and `useStorefrontRuntime`, `useLanguage`, `useAuth`

Breaking changes to these, to screen ids and their params, and to branding options are listed in the release notes. Anything else under `src/` may change between releases. Overrides are typed (`StorefrontScreen<'store.home'>`), so a type check after merging a release points at what needs updating.

## Upgrading a client build

```bash
git remote add upstream https://github.com/fleetbase/storefront-app.git
git fetch upstream
git merge upstream/<release branch or tag>
yarn install
yarn typecheck:strict
```

Then build and check the client's screens against the release notes.

## Switching storefronts in development

`.env` values are compiled into native builds, so changing `STOREFRONT_KEY` normally needs a rebuild. In debug builds, values in a git-ignored `env.dev.json` at the repository root replace the `.env` values:

```json
{ "STOREFRONT_KEY": "store_…", "FLEETBASE_KEY": "flb_…" }
```

Create, edit or delete it, then restart Metro with `--reset-cache` and reload. Release builds ignore it. Native-only values (such as the Google Maps key) still come from the build.
