import { createStorefrontConfig } from './config/default';

export default createStorefrontConfig({
    backgroundImages: {
        LoginScreen: require('./assets/images/olimax-bg.jpg'),
    },
    loginScreen: {
        showGradient: false,
    },
});
