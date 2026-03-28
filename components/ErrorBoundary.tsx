'use client';

import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="h-screen flex flex-col items-center justify-center"
          style={{
            backgroundColor: 'var(--color-background)',
            paddingLeft: 'max(20px, env(safe-area-inset-left))',
            paddingRight: 'max(20px, env(safe-area-inset-right))',
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl text-center"
            style={{
              padding: '32px 24px',
              backgroundColor: 'var(--color-surface)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--color-error)', color: 'var(--color-on-error)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2
              className="text-base font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Something went wrong
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={this.handleRetry}
              className="font-medium transition-all active:scale-[0.98]"
              style={{
                width: '100%',
                minHeight: '44px',
                borderRadius: '12px',
                fontSize: '14px',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                border: 'none',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
