import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import { storefrontConfig, config } from '../utils';
import Config from '../../storefront.config';
import Env from 'react-native-config';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
    return <ConfigContext.Provider value={{ ...Config, ...Env, storefrontConfig, config }}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
    return useContext(ConfigProvider);
};

export const useDefaultTabIsStoreHome = () => {
    return storefrontConfig('storeNavigator.defaultTab', 'StoreHomeTab') === 'StoreHomeTab';
};

export const useDefaultTabIsFoodTruck = () => {
    return storefrontConfig('storeNavigator.defaultTab', 'StoreHomeTab') === 'StoreFoodTruckTab';
};
