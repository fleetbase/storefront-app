import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import socketClusterClient from 'socketcluster-client';
import { config, toBoolean } from '../utils';
import { SocketAuthManager, getCustomerToken } from '../utils/socket-auth';
import { useAuth } from './AuthContext';

const getClientTag = () => {
    try {
        return `storefront-app/${require('../../package.json').version}`;
    } catch (_) {
        return 'storefront-app';
    }
};

const SocketClusterContext = createContext(null);

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

        // Listen for socket events using async iterators
        (async () => {
            try {
                for await (let event of scSocket.listener('connect')) {
                    setIsConnected(true);
                    console.log('Socket connected.');
                }
            } catch (err) {
                console.error('Error in connect listener:', err);
            }
        })();

        (async () => {
            try {
                for await (let event of scSocket.listener('disconnect')) {
                    setIsConnected(false);
                    console.log('Socket disconnected.');
                }
            } catch (err) {
                console.error('Error in disconnect listener:', err);
            }
        })();

        (async () => {
            try {
                for await (let err of scSocket.listener('error')) {
                    setError(err);
                    console.error('Socket error:', err);
                }
            } catch (err) {
                console.error('Error in error listener:', err);
            }
        })();

        setSocket(scSocket);

        return () => {
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
     * Subscribes to a channel and listens for its events using async iterators.
     * Returns the channel if successful.
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

                // Listen for the subscription confirmation.
                (async () => {
                    try {
                        for await (let event of channel.listener('subscribe')) {
                            console.log(`Subscribed to channel "${channelName}".`);
                            // Break out after the first event if you prefer.
                            break;
                        }
                    } catch (err) {
                        console.error(`Error in channel "${channelName}" subscribe listener:`, err);
                    }
                })();

                // Optionally, listen for channel messages.
                (async () => {
                    try {
                        for await (let data of channel) {
                            console.log(`Channel "${channelName}" message:`, data);
                            // Process the data or dispatch an event here.
                        }
                    } catch (err) {
                        console.error(`Error in channel "${channelName}" listener:`, err);
                    }
                })();

                return channel;
            } catch (err) {
                console.error(`Failed to subscribe to channel "${channelName}":`, err);
                return null;
            }
        },
        [socket]
    );

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

export const useSocketCluster = () => useContext(SocketClusterContext);
export default SocketClusterProvider;
