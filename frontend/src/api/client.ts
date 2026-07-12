import axios from 'axios';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  
  // If accessing via localhost, keep using same origin
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return window.location.origin;
  }
  
  // For network access (e.g., 192.168.1.236:4176), point to backend on port 3001
  const hostname = window.location.hostname;
  return `http://${hostname}:3001`;
};

export const apiClient = axios.create({
  baseURL: `${getBaseURL()}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach JWT from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('familyai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and redirect to login
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('familyai_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
