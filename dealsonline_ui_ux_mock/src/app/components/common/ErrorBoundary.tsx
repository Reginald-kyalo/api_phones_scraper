import { Component, type ReactNode } from 'react';
import { Link } from 'react-router';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-3">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">
            An unexpected error occurred. Please try again.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Try again
            </button>
            <Link
              to="/"
              className="inline-flex h-10 items-center rounded-lg border border-border px-5 text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
            >
              Go home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
