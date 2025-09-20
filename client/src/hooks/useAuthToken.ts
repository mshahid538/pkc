import { useAuth } from '@clerk/nextjs';
import { useCallback, useRef } from 'react';

export const useAuthToken = () => {
  const { getToken } = useAuth();
  const tokenCache = useRef<{ token: string | null; timestamp: number }>({ 
    token: null, 
    timestamp: 0 
  });
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const getCachedToken = useCallback(async (): Promise<string | null> => {
    const now = Date.now();
    
    // Return cached token if it's still valid
    if (tokenCache.current.token && 
        (now - tokenCache.current.timestamp) < CACHE_DURATION) {
      return tokenCache.current.token;
    }

    try {
      // Get fresh token
      const token = await getToken();
      tokenCache.current = {
        token,
        timestamp: now
      };
      return token;
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      // Clear cache on error
      tokenCache.current = { token: null, timestamp: 0 };
      return null;
    }
  }, [getToken, CACHE_DURATION]);

  const clearTokenCache = useCallback(() => {
    tokenCache.current = { token: null, timestamp: 0 };
  }, []);

  return {
    getCachedToken,
    clearTokenCache
  };
};
