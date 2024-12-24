import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import socketClusterClient from 'socketcluster-client';
import { config, toBoolean, consumeAsyncIterator } from '../utils';

const SocketClusterContext = createContext(null);

/**
 * SocketClusterProvider component that initializes the socket connection
 * and provides socket-related functionalities to its children.
 */
export const SocketClusterProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Initialize the socket connection
        const options = {
            hostname: config('SOCKETCLUSTER_HOST', 'socket.fleetbase.io'),
            port: parseInt(config('SOCKETCLUSTER_PORT', '8000'), 10),
            path: config('SOCKETCLUSTER_PATH', '/socketcluster/'),
            secure: toBoolean(config('SOCKETCLUSTER_SECURE'), true),
        };

        const scSocket = socketClusterClient.create(options);

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

            scSocket.disconnect();
            console.log('Socket connection closed.');
        };
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
