import { DefaultConfig } from './config/default';

const StorefrontConfig = {
    ...DefaultConfig,
    paymentGateway: 'stripe',
    incrementTipBy: 500,
};

export default StorefrontConfig;
