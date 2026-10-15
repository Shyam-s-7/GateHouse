import axios from 'axios';

const api = axios.create({
  baseURL: '', // Uses Vite proxy config to localhost:5050
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gatehouse_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && !error.config.url.includes('/api/auth/login')) {
      // Clear token if expired or invalid
      // localStorage.removeItem('gatehouse_token');
    }
    return Promise.reject(error);
  }
);

export default api;
