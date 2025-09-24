'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error)
      console.error('Error info:', errorInfo)
    }
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // This would integrate with services like Sentry, LogRocket, etc.
      // reportError(error, errorInfo)
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} retry={this.retry} />
      }

      // Default error UI
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Something went wrong</p>
                <p className="text-sm text-muted-foreground">
                  An unexpected error occurred. This has been logged and we'll investigate the issue.
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">Error Details (Development)</summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {this.state.error.message}
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button onClick={this.retry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="secondary">
              Back to Dashboard
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to handle async errors
export function useErrorHandler() {
  return (error: Error) => {
    // Re-throw the error to be caught by the nearest error boundary
    throw error
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Specific error boundary for API failures
export function APIErrorBoundary({ children }: { children: React.ReactNode }) {
  const handleAPIError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log API-specific errors
    console.error('API Error:', error)
    
    // Could send to API monitoring service
    // reportAPIError(error, errorInfo)
  }

  const APIErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
    <Alert className="m-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-semibold">Connection Error</p>
          <p className="text-sm">
            Unable to connect to the server. Please check your internet connection and try again.
          </p>
          {error.message.includes('401') && (
            <p className="text-sm text-orange-600">
              Your session may have expired. Please refresh the page to log in again.
            </p>
          )}
          {error.message.includes('429') && (
            <p className="text-sm text-orange-600">
              Too many requests. Please wait a moment before trying again.
            </p>
          )}
        </div>
      </AlertDescription>
      <div className="flex gap-2 mt-4">
        <Button onClick={retry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </Alert>
  )

  return (
    <ErrorBoundary fallback={APIErrorFallback} onError={handleAPIError}>
      {children}
    </ErrorBoundary>
  )
}