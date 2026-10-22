> v0.1.1 ~ "One phone check at sign-up; phone and address before the first order"

---
## Fixes
- **Sign-up asks for the phone once.** Signing up with a phone number and texted code now saves that number to the new account, so the Profile no longer asks to verify it a second time. With Storefront v0.4.29 or later the server also marks it verified and saves it for any client.
- **Phone and address before ordering.** Checkout needs a phone number on the customer's profile for every order, and a saved delivery address for deliveries (pickup needs only the phone). Customers who signed in with Apple or Google, or who are on their device's location, add or save them right in checkout; both stay on the profile for later orders and can be changed from the account.
- **Apple and Google sign-in from checkout** return to checkout, like the texted code.
- **QPay pickup** no longer waits for a delivery quote, so it works without an address.
- **Mongolian sign-in terms line** reads as a full sentence: "Үргэлжлүүлснээр та {name}-ийн Үйлчилгээний нөхцөл болон Нууцлалын бодлогыг зөвшөөрсөнд тооцогдоно." A new `Auth.agreeEnd` key ends the sentence after the links in any language.

---
## Upgrading
- Storefront v0.4.29 or later on the server is recommended. On earlier versions phone sign-up still works with this app, but the number isn't marked verified.
- Client builds with their own `Auth.*` translations can set `Auth.agreeEnd` (it is `.` in English and Ukrainian).
- Edit profile's phone sheet is now `src/components/account/PhoneVerifySheet.tsx`, shared with checkout.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
