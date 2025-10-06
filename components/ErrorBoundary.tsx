import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('APEX GUARDIAN: Error boundary caught error:', error)
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('APEX GUARDIAN: Error boundary componentDidCatch:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold text-red-900 mb-4">
              🛡️ APEX GUARDIAN Error Boundary
            </h2>
            <p className="text-red-600 mb-4">
              A React error was caught and contained:
            </p>
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-left">
              <p className="font-mono text-sm text-red-800">
                {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-red-700">Stack Trace</summary>
                  <pre className="mt-2 text-xs text-red-600 overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
