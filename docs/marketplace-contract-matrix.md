# Marketplace contract matrix

This inventory records the source-backed contract that the refactored Storefront App must use for `network_...` keys. The legacy app is treated as a behavioral reference, not as an implementation source. Paths under `storefront-server` refer to `/Users/ron/Development/fleetbase/oss/fleetbase-dev/packages/storefront/server`; paths under `storefront-js` refer to `/Users/ron/Development/fleetbase/storefront-js`.

The matrix below preserves the initial audit and its required-work findings for reviewer traceability. The **Implemented outcome** section records the resolved state in this change set; release verification remains mandatory.

## Authentication and resource identity

- The Storefront SDK sends the configured Storefront key as the adapter public key. The API middleware reads it as a bearer token and creates a request-scoped Storefront session.
- `store_...` keys populate `storefront_store`, `storefront_store_public_id`, `storefront_currency`, and `company`.
- `network_...` keys populate `storefront_network`, `storefront_network_public_id`, `storefront_currency`, and `company`.
- An optional `Customer-Token` header resolves the authenticated customer independently of the Storefront owner.
- External Storefront resources use public IDs as `id`. Internal UUIDs and keys must not be exposed by public responses.
- Storefront App runtime state must discriminate store metadata from network metadata. A network resource must never be hydrated as a `Store`.

## API and SDK matrix

| Capability | Request and SDK surface | Store-key behavior | Network-key behavior and public shape | Pagination/current failure behavior | Authorization and required work |
| --- | --- | --- | --- | --- | --- |
| About | `GET about`; `storefront.about()` | Public Store: `id`, branding/contact fields, tags, currency/country, options, rating, online, `is_store: true`, `is_network: false`, slug/timestamps | Public Network: `id`, branding/contact fields, tags, currency, options, rating, online, `is_network: true`, `is_store: false`, slug/timestamps | Single object; missing owner returns an API error | Existing mode detection is usable. App must hydrate the correct resource class and scope persistence by returned owner ID/key. |
| Lookup | `GET lookup/{id}`; `storefront.lookup(id)` | Looks up stores or networks within session company | Same implementation currently limits lookup by session company, not network membership | Single object; unknown ID is an API error rather than a stable 404 | A network key must only resolve the network itself or public member stores. Cross-company invited members require relation-based membership, not owner-company equality. Add negative tests. |
| Network stores | `GET stores`; `Network.getStores(params)`; params include `sort`, `limit`, `offset`, `ids`, `tagged`, `query`, `location`, `maximum_distance`, `exclude`, `category`, `without_category` | Rejected with `Stores cannot have stores!` | Collection of public Store resources; `with`/`with_locations` can expose public locations through the Store resource | Limit/offset only; no total/cursor. Empty collection is valid. `query` and `maximum_distance` are read but not currently applied. | Membership is relation-scoped but also incorrectly constrained to session company. Verify invited-store semantics. Fix search, sort fall-through, invalid categories, coordinate validation, online behavior, and only expose a radius filter if implemented. Preserve the collection envelope. |
| Network store locations | `GET store-locations`; `Network.getStoreLocations(params)`; `ids`, `exclude`, `offset`, `limit`, `location`, `tagged`, `query`, `with_store` | Endpoint does not explicitly reject store context | Public StoreLocation: `id`, `store` public ID, optional `store_data`, name, place, hours, timestamps | Default limit 30, offset, optional distance ordering. Invalid/missing coordinates should not crash. | Require network context and member-store relation. Keep `store_data` backward compatible; SDK/app may normalize it. Avoid hard-coded database connection/table qualification. |
| Network tags | `GET tags`; `Network.getTags()` | Not explicitly rejected | Unique flat array of tags from member stores that have locations | No pagination | Require network context. Normalize/filter blank values and keep deterministic order. |
| Categories | `GET categories`; `storefront.categories.query(params)` | Store-owned product categories; optional parents, parent, products | Without `store`: network store categories. With a member store public ID: that store's product categories. Supports `with_stores`, `with_products`, and subcategories through resource options. Public category shape includes `id`, name, description, icon URL, parent, tags, translations, optional products/subcategories, meta/order/slug/timestamps. | Existing cached query behavior; collection result | Member store lookup currently includes session company, which can exclude valid cross-company invitees. Unknown or foreign stores/categories must return an empty/404-safe result and never leak data. |
| Products query | `GET products`; `storefront.products.query(params)` | Products belonging to the current store | Products whose stores belong to the authenticated network; optional `category` is a product-category public ID | Existing query helper pagination semantics must be recorded by tests; public resource is a collection | Must enforce published, available, non-deleted visibility consistently and allow explicit member-store scoping for marketplace browsing. Public product shape currently lacks merchant identity; add an opt-in/backward-compatible merchant field or resolve via member-store context. |
| Product find | `GET products/{id}`; `storefront.products.findRecord(id)` | Currently uses a global record lookup | Same global lookup | Single Product or API error | Confirmed security boundary risk: authorize the product against current store or network membership before returning it. Return stable 404 for inaccessible IDs. |
| Search | `GET search?query=&store=&limit=`; `storefront.search(query, options)` | Searches available products in the current store and matching categories | Uses network product search and optional store public ID | Limit defaults to 14; no total | Ensure optional store belongs to the network, return merchant identity needed by global results, exclude unpublished/deleted/unavailable products, and return Product resources using the active adapter. Protect against stale results in the app. |
| Store locations | `GET locations` and `GET locations/{id}`; `Store.getLocations()`, `Store.getLocation(id)` | Defaults to current store | Requires explicit `store` parameter, but current collection lookup does not enforce network membership | Collection/single StoreLocation; unknown single location returns 404 after recent hardening | Enforce member-store relation (including valid cross-company invitees) for both collection and single record. |
| Gateways | `GET gateways`, `GET gateways/{id}`; Store/Network gateway helpers | Store owner gateways plus optional cash gateway | Network owner gateways plus optional cash gateway | Collection/single resource | Keep payment semantics unchanged. Validate owner scoping and do not expose provider secrets. Human review required for behavior changes. |
| Reviews | `GET reviews`, `GET reviews/count`; review SDK store actions | Current store reviews/counts | Reviews/counts for network member stores, with optional store filtering | Existing pagination/count shape | Verify member scoping, subject validation, and customer authorization for create/delete. Do not expose reviews for nonmembers. |
| Cart retrieve | `GET carts/{uniqueId?}`; `storefront.cart.retrieve(id)` | Retrieves/creates a company/cart identifier scoped by server model behavior | Same endpoint; cart line items carry `store_id` and `store_location_id` | Single Cart: public `id`, customer/currency/subtotal/counts/items/events/discount/expiry/timestamps | Verify identifiers cannot retrieve another Storefront/customer cart. Public cart resource currently performs one product query per item; prevent N+1 regressions while retaining product name/image enrichment. |
| Cart add | `POST carts/{cart}/{product}`; `Cart.add(product, quantity, data)`; data includes variants, addons, `store_location`, scheduled time | Product must belong to current store and location | Product must belong to a member store and location must belong to that product's store | Returns updated Cart or stable validation error | The controller delegates to a global product lookup; add explicit store/network membership, availability, currency, and location validation. Multi-cart policy remains driven by network options and app confirmation UX. |
| Cart update/remove/empty | `PUT/DELETE carts/...`; Cart resource methods | Mutates one cart line/cart | Same | Updated Cart or stable validation error | Verify cart ownership before every mutation. Updating a line must not allow store/location identity to drift. |
| Service quote | `GET service-quotes/from-cart`; `DeliveryServiceQuote.fetchServiceQuotesFromCart(origin, destination, cart, config, all)` | One origin/store location | Controller has a dedicated network path accepting multiple origins/store locations | Single quote or collection when `all` is requested | Verify every origin is a member location represented in the cart; reject missing/foreign origins. App must preserve all unique location IDs instead of taking the first. |
| Checkout initialize/status/capture | `GET checkouts/before`, `GET checkouts/status`, `POST checkouts/capture`; checkout SDK actions | Store-attributed checkout/order | Network UUID and per-item store IDs feed multi-store attribution/order creation | Single checkout/status/capture response; capture has existing duplicate-order protection | Audit idempotency, gateway/currency compatibility, multi-origin quote totals, and per-store order attribution. Do not change gateway semantics without human review. |
| Customer orders | `GET customers/orders`; customer SDK actions | Filters by Storefront store identity | Filters by Storefront network identity in order metadata | Existing collection pagination | Verify network orders remain isolated and all per-store orders created by a marketplace checkout are discoverable. |

## Implemented outcome

### Storefront App

- Boot hydrates the correct Store or Network owner and routes `network_...` keys to a five-tab marketplace navigator while preserving store-key navigation.
- Runtime state separates owner, selected merchant, per-store location, discovery state, and cart scope. Persisted state is namespaced by host, owner, mode, and merchant, with safe legacy migration.
- Discover implements pagination, deduplication, category/tag/online filters, supported sort modes, nearest/radius queries, empty/error/retry states, and stale-request suppression.
- Search concurrently returns hydrated products and merchants. Map/list discovery shares network-scoped locations and drops invalid coordinates without crashing.
- Merchant, category, and product screens remain inside the marketplace shell and pass explicit member-store scope to product/category requests.
- Cart state records merchant/location identity, prompts before single-store replacement, groups multi-store lines, rejects mixed currencies, and supplies all unique origins to quote/payment hooks.
- Location permission is contextual and user-initiated; denial preserves discovery/search/manual address flows and does not trigger a boot loop.
- English and Mongolian marketplace copy, accessibility labels, runtime behavior tests, focused lint/type-check gates, and a production web build are part of CI.

### Storefront JS

- Existing raw `about()` and `lookup()` behavior remains backward compatible; typed owner/resource hydration helpers are available for new consumers.
- Network exposes typed discovery, location, category, search, lookup, review, and gateway helpers using the active adapter.
- Search results, embedded merchants, StoreLocation store data, and Product merchants preserve adapter identity.
- `setAdapter()` rebuilds every resource store so future and already-reachable helpers use the replacement adapter consistently.
- Deterministic tests cover key validation, owner hydration, network parameters, adapter replacement, missing hours, embedded store normalization, and failure propagation.

### Storefront API

- Public store, category, product, review, lookup, and location queries use active `network_stores` membership as the marketplace authorization boundary, including valid cross-company members.
- Store discovery applies search, online/tag/category/ID filters, supported sorts, nearest calculation, maximum distance, and stable post-distance pagination without nullable-category failures.
- Products are restricted to published, available member inventory and expose a public merchant relationship; inaccessible identifiers return stable not-found responses.
- Cart add and checkout revalidate store membership, online state, product ownership/availability, location ownership, multi-cart policy, and currency consistency.
- Cart serialization bulk-loads products and stores to avoid per-line marketplace N+1 queries while retaining the existing envelope.
- Network service quotes derive explicit/default origins in bulk, preserve store association, and return `422` for missing, foreign, or mismatched locations.
- Customer review access is owner/member scoped, and authenticated checkout rejects customer-ID substitution with `403` before gateway interaction.
- Focused contracts cover successful and negative boundaries; fresh Clover is required to report 100% backend statements before publication.

## Compatibility decisions

1. Preserve existing HTTP envelopes and public fields; add fields or opt-in expansions rather than rename/remove fields.
2. Treat `network_stores` membership as the public marketplace authorization boundary. Owner company controls the network but must not exclude an accepted member store solely because that store belongs to another company.
3. Expose only the existing public Store resource for member stores; do not expose private customers, internal UUIDs, API keys, gateway credentials, or console-only data.
4. Keep the Storefront App compatible with the currently released `@fleetbase/storefront` while SDK improvements are reviewed. Do not commit an unpublished version dependency.
5. Marketplace browsing works without precise location. Nearest/radius/map behavior is progressively enabled when valid coordinates exist.
6. `multi_cart_enabled: false` enforces one merchant with an explicit replace-cart confirmation. `true` permits multiple member stores only when backend checkout, currency, location, and gateway validation succeeds.
7. The app uses all unique cart store-location IDs for marketplace service quotes and checkout; it never silently collapses them to the first ID.

## Release verification

Source and deterministic contract tests are authoritative for implementation. Before release, the manual acceptance matrix must additionally capture real decoded responses for a non-production store key and network key, plus web/iOS/Android checkout evidence. No credentials or captured secrets may be committed to this document. Production rollout should begin with an internal network, then a small pilot, with store-key rollback available by configuration only.
