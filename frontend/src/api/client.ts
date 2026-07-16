import axios from 'axios';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  
  // In production (deployed to render.com, etc), backend serves frontend
  // Use relative URL so API calls go to same origin
  const hostname = window.location.hostname;
  if (hostname.includes('render.com') || hostname.includes('vercel.app')) {
    return ''; // Relative URL - same origin
  }
  
  // Local development: backend on port 3001, frontend on 5173
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
