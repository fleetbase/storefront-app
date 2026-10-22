/** What the customer still has to add before an order can be placed. */
export type CheckoutRequirements = { needsPhone: boolean; needsAddress: boolean };

const attr = (record: any, key: string) => (typeof record?.getAttribute === 'function' ? record.getAttribute(key) : record?.[key]);

/**
 * Every order needs a phone number on the customer's profile; a delivery also needs a saved
 * address, not just where the device is, so the store and the driver can reach the customer.
 * Both stay on the profile and are used for the next order.
 */
export function checkoutRequirements({ customer, location, isPickup }: { customer: any; location: any; isPickup: boolean }): CheckoutRequirements {
    const phone = attr(customer, 'phone');
    const needsPhone = typeof phone !== 'string' || phone.replace(/[^0-9]/g, '').length === 0;
    const needsAddress = !isPickup && !(location?.id ?? attr(location, 'id'));
    return { needsPhone, needsAddress };
}
