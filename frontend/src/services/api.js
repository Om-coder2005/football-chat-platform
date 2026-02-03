import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const communityAPI = {
  getAll: () => api.get('/communities'),
  getMy: () => api.get('/communities/my'),
  create: (data) => api.post('/communities', data),
  join: (id) => api.post(`/communities/${id}/join`),
  leave: (id) => api.post(`/communities/${id}/leave`),
};

export const messageAPI = {
  send: (communityId, content) => 
    api.post(`/communities/${communityId}/messages`, { content }),
  getHistory: (communityId, limit = 50, offset = 0) => 
    api.get(`/communities/${communityId}/messages`, { params: { limit, offset } }),
  delete: (messageId) => api.delete(`/messages/${messageId}`),
};

export default api;
