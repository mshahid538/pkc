'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Don't show error boundary for network-related errors during page refresh
    if (error.message?.toLowerCase().includes('network') || 
        error.message?.toLowerCase().includes('fetch') ||
        error.name?.toLowerCase().includes('network')) {
      console.warn('Network error caught by ErrorBoundary, not showing error UI:', error);
      return { hasError: false, error: null, errorInfo: null };
    }
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  isNetworkError = (error: Error | null): boolean => {
    if (!error) return false;
    
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    return (
      message.includes('network') ||
      message.includes('internet') ||
      message.includes('disconnected') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      name.includes('network') ||
      name.includes('typeerror')
    );
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetwork = this.isNetworkError(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                {isNetwork ? (
                  <WifiOff className="h-6 w-6 text-red-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
              </div>
              
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {isNetwork ? 'Network Connection Issue' : 'Something went wrong'}
              </h2>
              
              <p className="text-sm text-gray-600 mb-4">
                {isNetwork 
                  ? 'There seems to be a network connectivity issue. Please check your internet connection and try again.'
                  : 'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.'
                }
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4 text-left">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded overflow-auto">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex space-x-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
