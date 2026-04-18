import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error) {
    console.error("UI error boundary", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen grid place-items-center p-8">
          <div className="card w-full max-w-xl bg-base-200 shadow-aurora border border-error/40">
            <div className="card-body">
              <h1 className="card-title text-error">Something went wrong</h1>
              <p className="text-sm opacity-80">
                {this.state.message || "Unexpected app error"}
              </p>
              <button
                className="btn btn-primary mt-4"
                onClick={() => window.location.reload()}
              >
                Reload app
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
