import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
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

export default api;