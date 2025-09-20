import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';


export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});


export const setAuthToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};


export const removeAuthToken = () => {
  delete api.defaults.headers.common['Authorization'];
};


export const authAPI = {
  status: () => api.get('/auth/status'),
  sync: () => api.post('/auth/sync'),
  profile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
};

export const chatAPI = {
  getThreads: () => api.get('/chat/threads'),
  createThread: (data: { title: string }) => api.post('/chat/threads', data),
  getMessages: (threadId: string) => api.get(`/chat/threads/${threadId}/messages`),
  sendMessage: (threadId: string, data: { content: string; files?: string[] }) =>
    api.post(`/chat/threads/${threadId}/messages`, data),
};

export const uploadAPI = {
  getFiles: () => api.get('/upload/files'),
  uploadFile: (formData: FormData) => api.post('/upload/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteFile: (fileId: string) => api.delete(`/upload/files/${fileId}`),
};
