'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { signOut } = useAuth();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Chat page error:', error);
  }, [error]);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
      // Force reload if sign out fails
      window.location.href = '/';
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-white rounded-2xl shadow-xl">
      <div className="text-center max-w-md">
        <div className="text-red-500 mb-4">
          <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong!</h2>
        <p className="text-gray-600 mb-4">
          There was an error loading the chat. This might be due to an authentication issue.
        </p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Try again
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
