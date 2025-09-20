// Global error handler for unhandled network and JavaScript errors
export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections (network errors, etc.)
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Check if it's a network error
    const error = event.reason;
    if (error && typeof error === 'object') {
      const message = error.message?.toLowerCase() || '';
      const name = error.name?.toLowerCase() || '';
      
      if (
        message.includes('network') ||
        message.includes('internet') ||
        message.includes('disconnected') ||
        message.includes('fetch') ||
        message.includes('connection') ||
        name.includes('network') ||
        name.includes('typeerror')
      ) {
        console.warn('Network error detected:', error);
        // Don't prevent default for network errors - let them be handled by components
        return;
      }
    }
    
    // For other errors, prevent the default browser error handling
    event.preventDefault();
  });

  // Handle general JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Check if it's a network-related error
    const error = event.error;
    if (error && typeof error === 'object') {
      const message = error.message?.toLowerCase() || '';
      const name = error.name?.toLowerCase() || '';
      
      if (
        message.includes('network') ||
        message.includes('internet') ||
        message.includes('disconnected') ||
        message.includes('fetch') ||
        message.includes('connection') ||
        name.includes('network') ||
        name.includes('typeerror')
      ) {
        console.warn('Network error detected:', error);
        return;
      }
    }
  });

  // Handle specific browser network errors
  window.addEventListener('offline', () => {
    console.warn('Browser went offline');
  });

  window.addEventListener('online', () => {
    console.log('Browser came back online');
  });
};

// Initialize error handlers
if (typeof window !== 'undefined') {
  setupGlobalErrorHandlers();
}
