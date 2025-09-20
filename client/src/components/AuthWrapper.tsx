'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AuthWrapper({ children, fallback }: AuthWrapperProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setAuthError('Please sign in to access this page');
    } else if (isLoaded && isSignedIn) {
      setAuthError(null);
    }
  }, [isLoaded, isSignedIn]);

  // Handle auth errors gracefully
  useEffect(() => {
    const handleAuthError = (event: any) => {
      if (event.detail?.error?.message?.includes('session') || 
          event.detail?.error?.message?.includes('token')) {
        console.warn('Auth error detected, attempting recovery...');
        setRetryCount(prev => prev + 1);
        
        if (retryCount < 3) {
          // Try to recover by refreshing the page
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setAuthError('Authentication failed. Please sign in again.');
        }
      }
    };

    window.addEventListener('clerk-error', handleAuthError);
    return () => window.removeEventListener('clerk-error', handleAuthError);
  }, [retryCount]);

  if (!isLoaded) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-white rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn || authError) {
    return fallback || (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-white rounded-2xl shadow-xl">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{authError || 'Please sign in to access this page'}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => {
                setAuthError(null);
                setRetryCount(0);
                window.location.reload();
              }} 
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              Retry Authentication
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
