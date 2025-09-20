// Network utility functions
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  // First check if browser thinks we're online
  if (!navigator.onLine) {
    return false;
  }


  return true;

};

export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorName = error.name?.toLowerCase() || '';
  
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('internet') ||
    errorMessage.includes('disconnected') ||
    errorMessage.includes('fetch') ||
    errorName.includes('network') ||
    errorName.includes('typeerror')
  );
};

export const getNetworkErrorMessage = (error: any): string => {
  if (isNetworkError(error)) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }
  return 'An unexpected error occurred. Please try again.';
};
