// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  CHAT: `${API_BASE_URL}/api/chat`,
  UPLOAD: `${API_BASE_URL}/api/upload`,
  ADMIN: `${API_BASE_URL}/api/admin`,
  HEALTH: `${API_BASE_URL}/api/health`,
} as const;

export const getApiUrl = (endpoint: keyof typeof API_ENDPOINTS, path: string = '') => {
  return `${API_ENDPOINTS[endpoint]}${path}`;
};

export default API_ENDPOINTS;
