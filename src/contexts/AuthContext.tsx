import React, { createContext, useContext, useReducer, useMemo, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { Customer } from '@fleetbase/storefront';
import { later, isArray, storefrontConfig } from '../utils';
import useStorage, { storage } from '../hooks/use-storage';
import useStorefront, { adapter } from '../hooks/use-storefront';
import { useLanguage } from './LanguageContext';
import { useNotification } from './NotificationContext';
import { LoginManager as FacebookLoginManager } from 'react-native-fbsdk-next';

const AuthContext = createContext();

const authReducer = (state, action) => {
    switch (action.type) {
        case 'RESTORE_SESSION':
            return { ...state, customer: action.customer };
        case 'LOGIN':
            return { ...state, phone: action.phone, isSendingCode: action.isSendingCode ?? false };
        case 'CREATING_ACCOUNT':
            return { ...state, phone: action.phone, isSendingCode: action.isSendingCode ?? false };
        case 'VERIFY':
            return { ...state, customer: action.customer, isVerifyingCode: action.isVerifyingCode ?? false };
        case 'LOGOUT':
            return { ...state, customer: null, phone: null, isSigningOut: action.isSigningOut ?? false };
        default:
            return state;
    }
};

export const AuthProvider = ({ children }) => {
    const { storefront } = useStorefront();
    const { setLocale } = useLanguage();
    const { deviceToken } = useNotification();
    const [storedCustomer, setStoredCustomer] = useStorage('customer');
    const [authToken, setAuthToken] = useStorage('_customer_token');
    const [state, dispatch] = useReducer(authReducer, {
        isSendingCode: false,
        isVerifyingCode: false,
        isSigningOut: false,
        customer: storedCustomer ? new Customer(storedCustomer, adapter) : null,
        phone: null,
    });

    // Restore session on app load
    useEffect(() => {
        if (storedCustomer) {
            dispatch({ type: 'RESTORE_SESSION', customer: new Customer(storedCustomer, adapter) });
        } else {
            dispatch({ type: 'RESTORE_SESSION', customer: null });
        }
    }, [storedCustomer]);

    const setCustomer = useCallback(
        (newCustomer) => {
            if (!newCustomer) {
                setStoredCustomer(null);
                EventRegister.emit('customer.updated', null);
                return;
            }

            const customerInstance = newCustomer instanceof Customer ? newCustomer : new Customer(newCustomer, adapter);

            // Restore customer token if needed
            if (!customerInstance.token && authToken) {
                customerInstance.setAttribute('token', authToken);
            }

            setStoredCustomer(customerInstance.serialize());
            EventRegister.emit('customer.updated', customerInstance);
        },
        [storefront, setStoredCustomer, authToken]
    );

    // Set customer default location
    const setCustomerDefaultLocation = async (customer) => {
        const addresses = customer.getAttribute('addresses', []);
        const addressId = customer.getAttribute('address_id');
        if (isArray(addresses)) {
            const defaultLocation = addresses.find((address) => address.id === addressId);
            if (defaultLocation) {
                storage.setMap('_current_location', defaultLocation);
            }
        }
    };

    const getDefaultAddress = (customer) => {
        const addresses = customer.getAttribute('addresses', []);
        const addressId = customer.getAttribute('address_id');
        if (isArray(addresses)) {
            const defaultLocation = addresses.find((address) => address.id === addressId);
            return defaultLocation ?? addresses[0];
        }

        return null;
    };

    // Update customer default location
    const updateCustomerLocation = async (location) => {
        try {
            const customer = await state.customer.update({ place: location.id });
            setCustomer(customer);
        } catch (err) {
            throw err;
        }
    };

    // Update customer meta attributes
    const updateCustomerMeta = async (newMeta = {}) => {
        const meta = { ...state.customer.getAttribute('meta'), ...newMeta };
        try {
            const customer = await state.customer.update({ meta });
            setCustomer(customer);
        } catch (err) {
            throw err;
        }
    };

    // Update customer meta attributes
    const updateCustomer = async (data = {}) => {
        try {
            const customer = await state.customer.update({ ...data });
            setCustomer(customer);
        } catch (err) {
            throw err;
        }
    };

    // Register customer's device and platform
    const syncDevice = async (customer, token) => {
        try {
            await customer.syncDevice(token, Platform.OS);
        } catch (err) {
            throw err;
        }
    };

    // Register current state customer's device and platform
    const registerDevice = async (token) => {
        try {
            await state.customer.syncDevice(token, Platform.OS);
        } catch (err) {
            throw err;
        }
    };

    // Create Account: Send verification code
    const requestCreationCode = useCallback(
        async (phone, method = 'sms') => {
            dispatch({ type: 'CREATING_ACCOUNT', phone, isSendingCode: true });
            try {
                await storefront.customers.requestCreationCode(phone, method);
                dispatch({ type: 'CREATING_ACCOUNT', phone, isSendingCode: false });
            } catch (error) {
                console.error('[AuthContext] Account creation verification failed:', error);
                throw error;
            } finally {
                dispatch({ type: 'CREATING_ACCOUNT', phone, isSendingCode: false });
            }
        },
        [storefront]
    );

    // Create Account: Verify Code
    const verifyAccountCreation = useCallback(
        async (phone, code, attributes = {}) => {
            dispatch({ type: 'VERIFY', isVerifyingCode: true });
            try {
                const customer = await storefront.customers.create(phone, code, attributes);
                createCustomerSession(customer);
                dispatch({ type: 'VERIFY', customer });
            } catch (error) {
                console.error('[AuthContext] Account creation verification failed:', error);
                throw error;
            } finally {
                dispatch({ type: 'VERIFY', isVerifyingCode: false });
            }
        },
        [storefront]
    );

    // Login: Send verification code
    const login = useCallback(
        async (phone) => {
            dispatch({ type: 'LOGIN', phone, isSendingCode: true });
            try {
                await storefront.customers.login(phone);
                dispatch({ type: 'LOGIN', phone, isSendingCode: false });
            } catch (error) {
                console.error('[AuthContext] Login failed:', error);
                throw error;
            } finally {
                dispatch({ type: 'LOGIN', phone, isSendingCode: false });
            }
        },
        [storefront]
    );

    // Remove local session data
    const clearSessionData = () => {
        storage.removeItem('_current_location');
        storage.removeItem('_local_locations');
        storage.removeItem('_customer_token');

        // If logged in with facebook
        FacebookLoginManager.logOut();
    };

    // Verify code
    const verifyCode = useCallback(
        async (code) => {
            dispatch({ type: 'VERIFY', isVerifyingCode: true });
            try {
                const customer = await storefront.customers.verifyCode(state.phone, code);
                createCustomerSession(customer);
                dispatch({ type: 'VERIFY', customer });
            } catch (error) {
                console.error('[AuthContext] Code verification failed:', error);
                throw error;
            } finally {
                dispatch({ type: 'VERIFY', isVerifyingCode: false });
            }
        },
        [storefront, state.phone, setCustomer]
    );

    // Create a session from customer data/JSON
    const createCustomerSession = async (customer, callback = null) => {
        clearSessionData();
        setCustomerDefaultLocation(customer);
        setAuthToken(customer.token);
        setCustomer(customer);

        // run a callback with the customer instance
        const instance = new Customer(customer, adapter);
        if (typeof callback === 'function') {
            callback(instance);
        }

        // Sync the customer device
        if (deviceToken) {
            syncDevice(instance, deviceToken);
        }

        return instance;
    };

    // Logout: Clear session
    const logout = useCallback(() => {
        setCustomer(null);
        dispatch({ type: 'LOGOUT', isSigningOut: true });

        // Clear storage/ cache
        clearSessionData();

        // Reset locale
        setLocale(storefrontConfig('defaultLocale', 'en'));

        later(() => {
            dispatch({ type: 'LOGOUT', isSigningOut: false });
        });
    }, [setCustomer]);

    // Memoize useful props and methods
    const value = useMemo(
        () => ({
            customer: state.customer,
            phone: state.phone,
            isSendingCode: state.isSendingCode,
            isVerifyingCode: state.isVerifyingCode,
            isAuthenticated: !!state.customer,
            isNotAuthenticated: !state.customer,
            updateCustomerLocation,
            updateCustomerMeta,
            updateCustomer,
            clearSessionData,
            setCustomer,
            login,
            verifyCode,
            logout,
            requestCreationCode,
            verifyAccountCreation,
            getDefaultAddress,
            createCustomerSession,
            syncDevice,
            registerDevice,
        }),
        [state, verifyCode, logout, verifyCode, login, verifyAccountCreation, requestCreationCode, setCustomer]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const useIsAuthenticated = () => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated;
};

export const useIsNotAuthenticated = () => {
    const { isNotAuthenticated } = useAuth();
    return isNotAuthenticated;
};
