import React from 'react';

type Props = {
    fallback: (error: unknown) => React.ReactNode;
    onError?: (error: unknown) => void;
    children: React.ReactNode;
};

type State = { error: unknown; hasError: boolean };

/** Catches render and load failures of a screen and renders a fallback instead. */
export default class ScreenErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null, hasError: false };

    static getDerivedStateFromError(error: unknown): State {
        return { error, hasError: true };
    }

    componentDidCatch(error: unknown) {
        this.props.onError?.(error);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback(this.state.error);
        }
        return this.props.children;
    }
}
