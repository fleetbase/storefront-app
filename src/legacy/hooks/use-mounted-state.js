import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * returns a function that when called will
 * return `true` if the component is mounted
 * @source https://www.benmvp.com/blog/handling-async-react-component-effects-after-unmount/
 */
const useMountedState = () => {
    const mountedRef = useRef(false);
    const isMounted = useCallback(() => mountedRef.current, []);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    return isMounted;
};

export default useMountedState;
