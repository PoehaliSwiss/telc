import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode | ((error: Error) => ReactNode);
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                if (typeof this.props.fallback === 'function') {
                    return this.props.fallback(this.state.error!);
                }
                return this.props.fallback;
            }

            return (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                    <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
                    <pre className="text-sm overflow-auto p-2 bg-white/50 dark:bg-black/20 rounded">
                        {this.state.error?.message}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}
