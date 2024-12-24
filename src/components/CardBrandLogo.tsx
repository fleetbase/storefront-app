import React from 'react';
import { Image } from 'tamagui';

// Map Stripe's brand strings to your local PNG assets.
const brandLogos = {
    Visa: require('../../assets/images/payment-logos/visa.png'),
    'Visa Electron': require('../../assets/images/payment-logos/visa-electron.png'),
    Mastercard: require('../../assets/images/payment-logos/mastercard.png'),
    'American Express': require('../../assets/images/payment-logos/american-express.png'),
    Discover: require('../../assets/images/payment-logos/discover.png'),
    JCB: require('../../assets/images/payment-logos/jcb.png'),
    Maestro: require('../../assets/images/payment-logos/maestro.png'),
    // 'Diners Club': require('../../assets/images/payment-logos/diners-club.png'),
    // 'UnionPay': require('../../assets/images/payment-logos/unionpay.png'),
};

// Fallback logo if no brand matches:
const defaultLogo = require('../../assets/images/payment-logos/default-card.png');

const CardBrandLogo = ({ brand, width = 55, height = 35 }) => {
    const logoSource = brandLogos[brand] || defaultLogo;
    return <Image source={logoSource} borderRadius='$3' style={{ width, height, resizeMode: 'contain' }} />;
};

export default CardBrandLogo;
