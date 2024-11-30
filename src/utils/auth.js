import { get } from './storage';

export function isSignedIn() {
    const customer = get('customer');
    return customer !== null || customer !== undefined;
}
export function isSignedOut() {
    const customer = get('customer');
    return customer === null || customer === undefined;
}
