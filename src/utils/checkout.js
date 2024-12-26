import { DeliveryServiceQuote } from '@fleetbase/storefront';
import { adapter as storefrontAdatper } from '../hooks/use-storefront';
import StorefrontConfig from '../../storefront.config';

export async function getServiceQuote(storeLocation, customerLocation, cart) {
    const quote = new DeliveryServiceQuote(storefrontAdatper);

    try {
        const serviceQuote = await quote.fetchServiceQuotesFromCart(storeLocation, customerLocation, cart);
        return serviceQuote;
    } catch (error) {
        console.error('Error fetching service quote:', error);
        throw error;
    }
}

export async function loadPaymentGateways(store) {
    try {
        const gateways = await store.getPaymentGateways();
        return gateways;
    } catch (error) {
        console.error('Error loading payment gateways:', error);
        throw error;
    }
}

export async function getPaymentGateway(store, code = null) {
    code = code || StorefrontConfig.paymentGateway;

    try {
        const gateways = await loadPaymentGateways(store);
        const paymentGateway = gateways.find((gateway) => gateway.getAttribute('code') === code);
        return paymentGateway;
    } catch (error) {
        console.error('Error loading and finding payment gateway:', error);
        throw error;
    }
}
