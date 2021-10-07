import React, { useState } from 'react';
import { Cart } from '@fleetbase/storefront';
import tailwind from 'tailwind';

const useCartTabOptions = (cart) => {
    const [value, setValue] = useState({
        tabBarBadge: cart instanceof Cart ? cart.getAttribute('total_unique_items') : 0,
        tabBarBadgeStyle: tailwind('bg-blue-500 ml-1'),
    });
    
    const setCartTabOptions = (cart) => {
        setValue({ ...value, tabBarBadge: cart instanceof Cart ? cart.getAttribute('total_unique_items') : 0 });
    };

    return [value, setCartTabOptions];
};

export default useCartTabOptions;
