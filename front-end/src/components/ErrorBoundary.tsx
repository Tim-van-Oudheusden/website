import * as React from "react";
import { Component } from "react";

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
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

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <p className="text-destructive font-medium">Failed to render content.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
