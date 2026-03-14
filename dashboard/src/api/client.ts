import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  withCredentials: true,
});

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const register = (email: string, password: string) =>
  api.post('/auth/register', { email, password });

export const logout = () => api.post('/auth/logout');

export const getMe = () => api.get('/auth/me');

// Domains
export const getDomains = () => api.get('/api/domains');

export const createDomain = (subdomain: string) =>
  api.post('/api/domains', { subdomain });

export const deleteDomain = (subdomain: string) =>
  api.delete(`/api/domains/${subdomain}`);

export const regenerateToken = (subdomain: string) =>
  api.post(`/api/domains/${subdomain}/regenerate-token`);

export const getDomainHistory = (subdomain: string) =>
  api.get(`/api/domains/${subdomain}/history`);

// Profile
export const getProfile = () => api.get('/auth/profile');

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post('/auth/change-password', { currentPassword, newPassword });

export const getApiToken = () => api.get('/auth/api-token');

export const regenerateApiToken = () => api.post('/auth/api-token/regenerate');

export const deleteAccount = () => api.delete('/auth/account');

// Admin
export const checkAdmin = () => api.get('/api/admin/check');
export const getAdminStats = () => api.get('/api/admin/stats');
export const getAdminUsers = (search?: string) =>
  api.get('/api/admin/users', { params: search ? { search } : {} });
export const getAdminActivity = () => api.get('/api/admin/activity');
export const blockUser = (userId: string) => api.post(`/api/admin/users/${userId}/block`);
export const unblockUser = (userId: string) => api.post(`/api/admin/users/${userId}/unblock`);
export const getAdminSettings = () => api.get('/api/admin/settings');
export const updateAdminSettings = (settings: {
  rateLimitPerToken?: number;
  rateLimitPerAccount?: number;
  rateLimitWindowSeconds?: number;
}) => api.post('/api/admin/settings', settings);

export default api;