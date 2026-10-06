import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import socketClusterClient from 'socketcluster-client';
import DeviceInfo from 'react-native-device-info';
import { config, toBoolean, consumeAsyncIterator } from '../utils';
import { SocketAuthManager, getCustomerToken } from '../utils/socket-auth';
import { useAuth } from './AuthContext';

const getClientTag = () => {
    try {
        return `storefront-app/${DeviceInfo.getVersion()}`;
    } catch (_) {
        return 'storefront-app';
    }
};

const SocketClusterContext = createContext(null);

/**
 * SocketClusterProvider component that initializes the socket connection
 * and provides socket-related functionalities to its children.
 */
export const SocketClusterProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const { customer } = useAuth();
    const customerRef = useRef(customer);
    customerRef.current = customer;
    const authRef = useRef<SocketAuthManager | null>(null);
    const customerId = customer?.id ?? null;
    const previousCustomerId = useRef(customerId);

    useEffect(() => {
        // Initialize the socket connection
        const options = {
            hostname: config('SOCKETCLUSTER_HOST', 'socket.fleetbase.io'),
            port: parseInt(config('SOCKETCLUSTER_PORT', '8000')),
            path: config('SOCKETCLUSTER_PATH', '/socketcluster/'),
            secure: toBoolean(config('SOCKETCLUSTER_SECURE', true)),
        };

        // Socket auth: the token lives in memory only and is delivered in the
        // handshake by this authEngine (never storage, never the URL query).
        const auth = new SocketAuthManager({ getCustomerToken: () => getCustomerToken(customerRef.current) });
        authRef.current = auth;

        const scSocket = socketClusterClient.create({
            ...options,
            authEngine: auth.authEngine,
            query: { client: getClientTag() },
        });
        auth.attach(scSocket);

        // Define handlers for socket events
        const handleConnect = () => {
            setIsConnected(true);
            console.log('Socket connected.');
        };

        const handleDisconnect = () => {
            setIsConnected(false);
            console.log('Socket disconnected.');
        };

        const handleError = (err) => {
            setError(err);
            console.error('Socket encountered error:', err);
        };

        // Attach event listeners using AsyncIterator
        const connectListener = scSocket.listener('connect');
        const disconnectListener = scSocket.listener('disconnect');
        const errorListener = scSocket.listener('error');

        // Start consuming the AsyncIterators
        const stopConnect = consumeAsyncIterator(connectListener, handleConnect, handleError);
        const stopDisconnect = consumeAsyncIterator(disconnectListener, handleDisconnect, handleError);
        const stopError = consumeAsyncIterator(errorListener, handleError, handleError);

        setSocket(scSocket);

        // Cleanup on unmount
        return () => {
            // Stop all iterations
            stopConnect();
            stopDisconnect();
            stopError();

            auth.destroy();
            authRef.current = null;
            scSocket.disconnect();
            console.log('Socket connection closed.');
        };
    }, []);

    // Re-authenticate the socket when the customer logs in, out or switches account.
    useEffect(() => {
        if (previousCustomerId.current === customerId) return;
        previousCustomerId.current = customerId;
        const auth = authRef.current;
        if (!auth) return;
        if (customerId) {
            auth.onLogin().catch((err) => console.warn('Socket re-authentication failed:', err));
        } else {
            auth.onLogout();
        }
    }, [customerId]);

    /**
     * Authenticate the socket with a checkout-scoped token (guest checkout).
     * No-op when a customer is logged in: their own token covers their checkouts.
     */
    const authenticateWithCheckoutToken = useCallback(async (socketToken) => {
        if (!authRef.current) return;
        try {
            await authRef.current.applyCheckoutToken(socketToken);
        } catch (err) {
            console.warn('Unable to authenticate socket with checkout token:', err);
        }
    }, []);

    /**
     * Subscribes to a specific channel.
     * @param {string} channelName - The name of the channel to subscribe to.
     * @returns {Channel|null} The subscribed channel instance or null if subscription fails.
     */
    const subscribeChannel = useCallback(
        async (channelName) => {
            if (!socket) {
                console.warn('Socket not initialized.');
                return null;
            }

            try {
                const channel = socket.subscribe(channelName);
                authRef.current?.track(channelName);
                if (channel.isSubscribed()) {
                    console.log(`Already subscribed to channel "${channelName}".`);
                    return channel;
                }

                await channel.listener('subscribe').once();
                console.log(`Subscribed to channel "${channelName}".`);
                return channel;
            } catch (err) {
                console.error(`Failed to subscribe to channel "${channelName}":`, err);
                return null;
            }
        },
        [socket]
    );

    /**
     * Closes a specific channel gracefully.
     * @param {string} channelName - The name of the channel to close.
     */
    const closeChannel = useCallback(
        async (channelName) => {
            if (!socket) {
                console.warn('Socket not initialized.');
                return;
            }

            try {
                authRef.current?.untrack(channelName);
                await socket.closeChannel(channelName);
                console.log(`Gracefully closed channel "${channelName}".`);
            } catch (err) {
                console.error(`Error while closing channel "${channelName}":`, err);
            }
        },
        [socket]
    );

    /**
     * Forcefully kills a specific channel immediately.
     * @param {string} channelName - The name of the channel to kill.
     */
    const killChannel = useCallback(
        async (channelName) => {
            if (!socket) {
                console.warn('Socket not initialized.');
                return;
            }

            try {
                authRef.current?.untrack(channelName);
                await socket.killChannel(channelName);
                console.log(`Forcefully killed channel "${channelName}".`);
            } catch (err) {
                console.error(`Error while killing channel "${channelName}":`, err);
            }
        },
        [socket]
    );

    /**
     * Closes all channels gracefully.
     */
    const closeAllChannels = useCallback(async () => {
        if (!socket) {
            console.warn('Socket not initialized.');
            return;
        }

        try {
            authRef.current?.untrackAll();
            await socket.closeAllChannels();
            console.log('Gracefully closed all channels.');
        } catch (err) {
            console.error('Error while closing all channels:', err);
        }
    }, [socket]);

    /**
     * Forcefully kills all channels immediately.
     */
    const killAllChannels = useCallback(async () => {
        if (!socket) {
            console.warn('Socket not initialized.');
            return;
        }

        try {
            authRef.current?.untrackAll();
            await socket.killAllChannels();
            console.log('Forcefully killed all channels.');
        } catch (err) {
            console.error('Error while killing all channels:', err);
        }
    }, [socket]);

    return (
        <SocketClusterContext.Provider
            value={{
                socket,
                isConnected,
                error,
                subscribeChannel,
                closeChannel,
                killChannel,
                closeAllChannels,
                killAllChannels,
                authenticateWithCheckoutToken,
            }}
        >
            {children}
        </SocketClusterContext.Provider>
    );
};

/**
 * Custom hook to access the SocketClusterContext.
 * @returns {Object} The socket context value.
 */
export const useSocketCluster = () => {
    return useContext(SocketClusterContext);
};
