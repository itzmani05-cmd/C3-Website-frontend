import axios from 'axios';
import { BACKEND_URL } from './config';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const SESSION_EXPIRED_FLAG = 'c3_session_expired';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = String(error.config?.url || '').includes('/api/auth/login');
    if (error.response?.status === 401 && !isLoginRequest && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
