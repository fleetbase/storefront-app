> v0.1.2 ~ "Order screen and QPay bank list fixes"

---
## Fixes
- **Order screen no longer crashes on Android.** The live map could receive its bottom padding before Google Maps had loaded, and `react-native-maps` then called into a map that didn't exist yet. A patch keeps the padding until the map is ready and applies it then.
- **Order screen scrolls on Android.** The sheet over the map lets touches through to the map on iOS; on Android that kept the sheet from scrolling at all. On Android the sheet now takes the drag, so the strip of map above it scrolls the sheet rather than panning the map.
- **Every bank in the QPay sheet can be reached.** The bank list grew past the sheet and was cut off at the bottom on iOS and Android. It is now the sheet's own scrolling list, with the QR code and title as its header.

---
## Upgrading
- Run `yarn install` after merging: a new patch for `react-native-maps` is applied on install.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
