import * as React from "react";
import { Component } from "react";

export interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches rendering errors in child components and shows a fallback UI
 * instead of blanking the entire page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  /** Re-render children after a captured failure (wired to the fallback retry button). */
  retry = (): void => {
    this.setState({ hasError: false });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <p className="text-destructive font-medium">Failed to render content.</p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-2 text-sm font-medium text-(--adw-dark-5) underline-offset-4 hover:underline dark:text-white/80"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
