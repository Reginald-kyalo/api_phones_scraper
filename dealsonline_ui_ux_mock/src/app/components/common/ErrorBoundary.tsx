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
        <div className="page-container py-16 text-center">
          <h1 className="page-title mb-3">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">
            This page didn’t load properly. Try again, or start from the homepage.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-teal-deep active:translate-y-px transition-colors"
            >
              Try again
            </button>
            <Link
              to="/"
              className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm font-medium text-foreground hover:bg-surface-alt active:translate-y-px transition-colors"
            >
              Go to the homepage
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
