> v0.1.5 ~ "Booking screenshots"

---
## New
- **Booking in the screenshot flows.** The network flow opens a bookable service, picks a day and a time, and captures `storefront-app-service-details-network` and `storefront-app-booking-create-network`. It searches for `SERVICE_QUERY` (pass `-e SERVICE_QUERY=massage`), so the Network needs a bookable service that matches.
- **Test ids for Maestro.** Search results carry `search-result-service` or `search-result-product`; the booking picker's open days carry `booking-day` and its bookable times `booking-time`. Nothing changes on screen.

---
## Upgrading
- No changes needed.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
