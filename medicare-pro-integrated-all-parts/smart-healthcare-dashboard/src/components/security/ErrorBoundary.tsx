import { Component, ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("Unhandled React error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          <div className="max-w-xl rounded-3xl border border-red-200 bg-white p-10 shadow-xl dark:border-red-900/40 dark:bg-slate-900">
            <h1 className="text-2xl font-semibold text-red-700 dark:text-red-300">Something went wrong</h1>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">An unexpected error occurred while rendering the application.</p>
            <pre className="mt-6 whitespace-pre-wrap rounded-2xl bg-slate-100 p-4 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-200">{String(this.state.error)}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
