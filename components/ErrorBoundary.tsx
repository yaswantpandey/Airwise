'use client';

import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-16 max-w-lg rounded-xl border border-rose-200 bg-white p-6 text-slate-900 shadow-xs dark:border-rose-900/60 dark:bg-[#131C26] dark:text-slate-100">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            AirWise encountered a recoverable display error. You can reload to restore your cached AQI dashboard.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-4 min-h-[44px] rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
