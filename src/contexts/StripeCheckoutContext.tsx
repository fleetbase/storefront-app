import React, { createContext, useContext } from 'react';
import useStripeCheckout from '../hooks/use-stripe-checkout'; // adjust path as necessary

const StripeCheckoutContext = createContext(null);

export const StripeCheckoutProvider = ({ children }) => {
    const stripeCheckout = useStripeCheckout({});

    return <StripeCheckoutContext.Provider value={stripeCheckout}>{children}</StripeCheckoutContext.Provider>;
};

export const useStripeCheckoutContext = () => {
    const context = useContext(StripeCheckoutContext);
    if (!context) {
        throw new Error('useStripeCheckoutContext must be used within a StripeCheckoutProvider');
    }
    return context;
};
