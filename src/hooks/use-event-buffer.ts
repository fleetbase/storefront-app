import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom Hook: useEventBuffer
 * Buffers incoming events and processes them in a continuous, self-restarting loop.
 * This pattern is more robust than setInterval for asynchronous tasks.
 *
 * @param {Function} eventHandler - Function to handle each processed event.
 * @param {number} waitTime - Interval time in milliseconds to wait between processing cycles.
 * @returns {Object} - Provides methods to add and clear events.
 */
const useEventBuffer = (eventHandler, waitTime = 3000) => {
    const eventsRef = useRef([]);
    const isRunningRef = useRef(false);
    const shouldStopRef = useRef(false);

    /**
     * Adds a new event to the buffer.
     *
     * @param {Object} event - The event to add.
     */
    const addEvent = useCallback((event) => {
        eventsRef.current.push(event);
    }, []);

    /**
     * Clears all buffered events.
     */
    const clearEvents = useCallback(() => {
        eventsRef.current = [];
    }, []);

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
    const processEvents = useCallback(async () => {
        // Take a snapshot of events to process and clear buffer immediately
        // This prevents losing events that arrive during processing
        const eventsToProcess = [...eventsRef.current];
        clearEvents(); // Clear immediately to accept new events

        if (eventsToProcess.length === 0) {
            return;
        }

        // Sort events by created_at
        eventsToProcess.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // Process each event
        for (const event of eventsToProcess) {
            const { event: eventName, data } = event;

            // Log incoming event
            console.log(`EventBuffer: ${eventName} - #${data.additionalData?.index} (${event.created_at}) [ ${data.location?.coordinates?.join(' ')} ]`);

            // Execute the event handler
            if (typeof eventHandler === 'function') {
                eventHandler(data);
            }
        }
    }, [eventHandler, clearEvents]);

    /**
     * The main continuous processing loop.
     */
    const runLoop = useCallback(async () => {
        if (isRunningRef.current) return;

        isRunningRef.current = true;
        shouldStopRef.current = false;

        while (!shouldStopRef.current) {
            try {
                await processEvents();
            } catch (error) {
                console.error('Error during event buffer processing:', error);
            }

            // Wait for the defined interval before checking for new events
            await delay(waitTime);
        }

        isRunningRef.current = false;
    }, [processEvents, waitTime]);

    /**
     * Starts the event processing loop.
     */
    const start = useCallback(() => {
        if (!isRunningRef.current) {
            runLoop();
        }
    }, [runLoop]);

    /**
     * Stops the event processing loop.
     */
    const stop = useCallback(() => {
        shouldStopRef.current = true;
    }, []);

    useEffect(() => {
        start();

        // Clean up on unmount
        return () => {
            stop();
        };
    }, [start, stop]);

    return { addEvent, clearEvents };
};

export default useEventBuffer;
