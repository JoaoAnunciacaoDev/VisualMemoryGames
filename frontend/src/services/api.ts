import axios, { InternalAxiosRequestConfig } from 'axios';
import { getToken } from '@/services/auth';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;