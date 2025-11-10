import { useCallback } from 'react';
import { useSocketCluster } from '../contexts/SocketClusterContext';
import { consumeAsyncIterator, isAsyncIterable } from '../utils';

/**
 * Custom hook to manage SocketCluster subscriptions and listeners.
 * Provides functionalities to subscribe, listen, and manage channels.
 */
const useSocketClusterClient = () => {
    const { socket, isConnected, error, subscribeChannel, closeChannel, killChannel, closeAllChannels, killAllChannels } = useSocketCluster();

    /**
     * Listens to a channel for all incoming events/data.
     * @param {string} channelName - The name of the channel to subscribe to.
     * @param {Function} callback - The callback to execute when the event is received.
     * @returns {Object|null} An object containing stop and kill functions or null if subscription fails.
     */
    const listen = useCallback(
        async (channelName, callback) => {
            if (!channelName || typeof callback !== 'function') {
                console.warn('Invalid parameters for subscribe.');
                return null;
            }

            const channel = await subscribeChannel(channelName);
            if (!channel) {
                console.warn(`Unable to subscribe to socket channel ${channelName}`);
                return null;
            }

            // Define handlers
            const handleEvent = (data) => {
                if (typeof callback === 'function') {
                    callback(data);
                }
            };

            const handleError = (err) => {
                console.error(`Error consuming data on channel "${channelName}":`, err);
            };

            // Start consuming the AsyncIterator
            const cancel = consumeAsyncIterator(channel, handleEvent, handleError);

            /**
             * Stop function to terminate the iteration and close the channel.
             */
            const stopListening = async () => {
                await closeChannel(channelName);
                console.log(`Stopped listening for data on channel "${channelName}".`);
            };

            /**
             * Kill function to forcefully terminate the iteration and kill the channel.
             */
            const killListening = async () => {
                await killChannel(channelName);
                console.log(`Killed listening for data on channel "${channelName}".`);
            };

            return { stop: stopListening, kill: killListening };
        },
        [subscribeChannel, closeChannel, killChannel]
    );

    return {
        socket,
        isConnected,
        error,
        listen,
        closeAllChannels,
        killAllChannels,
    };
};

export default useSocketClusterClient;
