import { useAuth } from '@clerk/nextjs';

export const useAuthToken = () => {
  const { getToken } = useAuth();

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const token = await getToken();
      return token;
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  };

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const token = await getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  return {
    getAuthToken,
    getAuthHeaders,
  };
};
