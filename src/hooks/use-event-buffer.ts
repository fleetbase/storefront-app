import { useRef, useCallback, useEffect } from 'react';

const useEventBuffer = (eventHandler) => {
    const queueRef = useRef([]);
    const processingRef = useRef(false);
    const destroyedRef = useRef(false);

    const processQueue = useCallback(async () => {
        if (processingRef.current || destroyedRef.current) return;
        processingRef.current = true;

        try {
            // Keep draining until queue is empty
            // Handles bursts without spawning multiple processors
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const batch = queueRef.current;
                if (!batch.length || destroyedRef.current) break;

                // Take current batch and reset queue
                queueRef.current = [];

                // Optionally: sort by created_at if present
                batch.sort((a, b) => {
                    const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return ad - bd;
                });

                for (const event of batch) {
                    if (destroyedRef.current) break;
                    const { data } = event;
                    try {
                        if (typeof eventHandler === 'function') {
                            eventHandler(data);
                        }
                    } catch (err) {
                        console.error('Error in eventHandler:', err);
                    }
                }
            }
        } finally {
            processingRef.current = false;
        }
    }, [eventHandler]);

    const addEvent = useCallback(
        (event) => {
            if (destroyedRef.current) return;

            queueRef.current.push(event);

            // Trigger processing immediately (next tick)
            // If already processing, this is a no-op due to processingRef guard
            processQueue();
        },
        [processQueue]
    );

    const clearEvents = useCallback(() => {
        queueRef.current = [];
    }, []);

    useEffect(() => {
        return () => {
            destroyedRef.current = true;
            queueRef.current = [];
        };
    }, []);

    return { addEvent, clearEvents };
};

export default useEventBuffer;
