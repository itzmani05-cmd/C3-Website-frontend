import axios from 'axios';
import { BACKEND_URL } from './config';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Most endpoints require a logged-in user; attach the stored token to every
// request so callers don't each need their own Authorization header config.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
