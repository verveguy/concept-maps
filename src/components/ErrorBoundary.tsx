/**
 * Error Boundary component for catching React errors.
 * Useful for isolating component failures and preventing app crashes.
 */

import React, { Component, type ReactNode } from 'react'

/**
 * Props for ErrorBoundary component.
 */
interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode
  /** Optional fallback UI to show when error occurs */
  fallback?: ReactNode
  /** Optional callback when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Optional name for this boundary (useful for debugging) */
  name?: string
}

/**
 * State for ErrorBoundary component.
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean
  /** The error that was caught */
  error: Error | null
  /** Error info from React */
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary component for catching React errors.
 * 
 * Wraps components to catch JavaScript errors anywhere in the child component tree,
 * log those errors, and display a fallback UI instead of crashing the whole app.
 * 
 * **Usage:**
 * ```tsx
 * <ErrorBoundary name="Canvas" onError={(error) => console.error(error)}>
 *   <ConceptMapCanvas />
 * </ErrorBoundary>
 * ```
 * 
 * @param props - Component props
 * @param props.children - Child components to wrap
 * @param props.fallback - Optional fallback UI (defaults to error message)
 * @param props.onError - Optional error callback
 * @param props.name - Optional name for debugging
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    const boundaryName = this.props.name || 'ErrorBoundary'
    console.error(`[${boundaryName}] Error caught:`, error)
    console.error(`[${boundaryName}] Error info:`, errorInfo)
    console.error(`[${boundaryName}] Component stack:`, errorInfo.componentStack)

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    })

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-8 bg-destructive/10 border border-destructive rounded-lg">
          <h2 className="text-xl font-semibold text-destructive mb-4">
            {this.props.name ? `${this.props.name} Error` : 'Something went wrong'}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          {import.meta.env.DEV && this.state.error && (
            <details className="w-full max-w-2xl mt-4">
              <summary className="cursor-pointer text-sm font-medium mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack && (
                  <>
                    {'\n\nComponent Stack:\n'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
              })
            }}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
