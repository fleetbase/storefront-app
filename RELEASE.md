> v0.1.3 ~ "Hosted preview starts at the store"

---
## Fixes
- **A hosted preview no longer stops at "Allow location".** A store app asked for the customer's location before showing the store. Inside another site's frame the browser can't share a location, and a preview build has no maps key to search addresses with, so the preview could go no further. A hosted preview now starts at the store's own address and opens the store. Other builds are unchanged.

---
## Upgrading
- No changes needed.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
