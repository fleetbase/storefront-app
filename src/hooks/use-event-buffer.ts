import { useEffect, useRef } from 'react';

/**
 * Custom Hook: useEventBuffer
 * Buffers incoming events and processes them at defined intervals.
 *
 * @param {Function} eventHandler - Function to handle each processed event.
 * @param {number} waitTime - Interval time in milliseconds to process events.
 * @returns {Object} - Provides methods to add and clear events.
 */
const useEventBuffer = (eventHandler, waitTime = 3000) => {
    const eventsRef = useRef([]);
    const isProcessingRef = useRef(false);
    const intervalIdRef = useRef(null);

    /**
     * Adds a new event to the buffer.
     *
     * @param {Object} event - The event to add.
     */
    const addEvent = (event) => {
        eventsRef.current.push(event);
    };

    /**
     * Clears all buffered events.
     */
    const clearEvents = () => {
        eventsRef.current = [];
    };

    /**
     * Delays execution for a specified time.
     *
     * @param {number} ms - Milliseconds to delay.
     * @returns {Promise}
     */
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * Processes buffered events sequentially.
     */
    const processEvents = async () => {
        if (isProcessingRef.current || eventsRef.current.length === 0) return;

        isProcessingRef.current = true;

        // Sort events by created_at
        eventsRef.current.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // Process each event
        for (const event of eventsRef.current) {
            const { event: eventName, data } = event;

            // Log incoming event
            console.log(`EventBuffer: ${eventName} - #${data.additionalData.index} (${event.created_at}) [ ${data.location.coordinates.join(' ')} ]`);

            // Execute the event handler
            if (typeof eventHandler === 'function') {
                eventHandler(data);
            }

            // Wait before processing the next event
            await delay(1000);
        }

        // Clear the buffer after processing
        clearEvents();
        isProcessingRef.current = false;
    };

    /**
     * Starts the event processing interval.
     */
    const start = () => {
        if (intervalIdRef.current) return; // Prevent multiple intervals

        intervalIdRef.current = setInterval(() => {
            processEvents();
        }, waitTime);
    };

    /**
     * Stops the event processing interval.
     */
    const stop = () => {
        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }
    };

    useEffect(() => {
        start();

        // Clean up on unmount
        return () => {
            stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waitTime]); // Restart if waitTime changes

    return { addEvent, clearEvents };
};

export default useEventBuffer;
