import axios from 'axios';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  
  // Always use port 3001 for backend, regardless of frontend port
  // Works for both localhost (127.0.0.1:3001) and network IPs (192.168.x.x:3001)
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
