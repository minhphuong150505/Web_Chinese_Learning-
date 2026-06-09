import axios from 'axios';
import { getToken, notifyUnauthorized } from './authStorage';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 90_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) notifyUnauthorized();
    const msg = err.response?.data?.message ?? err.message;
    return Promise.reject(new Error(msg));
  }
);
