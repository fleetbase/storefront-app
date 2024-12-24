import { createStorefrontConfig } from './config/default';

export default createStorefrontConfig({
    paymentGateway: 'qpay',
    incrementTipBy: 500,
    showDriversOnMap: true,
    styles: {
        StoreHeader: {},
    },
});
