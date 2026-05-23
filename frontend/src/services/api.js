import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

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
  updateProfile: (data) => api.put('/auth/me', data),
  logout: () => api.post('/auth/logout'),
};

export const communityAPI = {
  getAll: () => api.get('/communities'),
  getMy: () => api.get('/communities/my'),
  getMembers: (id) => api.get(`/communities/${id}/members`),
  updateMemberRole: (communityId, memberUserId, role) =>
    api.put(`/communities/${communityId}/members/${memberUserId}/role`, { role }),
  removeMember: (communityId, memberUserId) =>
    api.delete(`/communities/${communityId}/members/${memberUserId}`),
  transferOwnership: (communityId, targetUserId) =>
    api.post(`/communities/${communityId}/transfer-ownership`, { target_user_id: targetUserId }),
  addMember: (communityId, identifier) =>
    api.post(`/communities/${communityId}/add-member`, { identifier }),
  create: (data) => api.post('/communities', data),
  join: (id) => api.post(`/communities/${id}/join`),
  leave: (id) => api.post(`/communities/${id}/leave`),
  getTacticalSummary: (id) => api.get(`/communities/${id}/tactical-summary`),
};

export const messageAPI = {
  send: (communityId, content) => 
    api.post(`/communities/${communityId}/messages`, { content }),
  getHistory: (communityId, limit = 50, offset = 0) => 
    api.get(`/communities/${communityId}/messages`, { params: { limit, offset } }),
  delete: (messageId) => api.delete(`/messages/${messageId}`),
  toggleHighlight: (messageId) => api.put(`/messages/${messageId}/highlight`),
  sendNotification: (communityId, content) => api.post(`/communities/${communityId}/notifications`, { content }),
};

export const newsAPI = {
  getClubNews: (clubName, limit = 10) => api.get(`/news/${clubName}`, { params: { limit } })
};

export const matchAPI = {
  getLiveMatches: () => api.get('/matches/live'),
  getTodaysMatchesGrouped: () => api.get('/matches/today'),
  getMatchesByDate: (dateFrom, dateTo) => 
    api.get('/matches', { params: { dateFrom, dateTo } }),
  getMatchDetails: (matchId) => api.get(`/matches/${matchId}`),
  getAvailableCompetitions: () => api.get('/competitions/available'),
  getCompetitionMatches: (competitionId, params = {}) => 
    api.get(`/competitions/${competitionId}/matches`, { params }),
  getCompetitionStandings: (competitionId) => 
    api.get(`/competitions/${competitionId}/standings`),
  getTeamMatches: (teamId, params = {}) => 
    api.get(`/teams/${teamId}/matches`, { params }),
  getTeamMatchesByName: (teamName) =>
    api.get('/matches/team', { params: { teamName } }),
};

export default api;
