import axios from 'axios';
import { AUTH_STORAGE_KEY } from '../features/auth/authSlice';

// Swap this once the Flask API has a real host (e.g. via .env: VITE_API_BASE_URL).
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

function readStoredToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.token ?? null;
  } catch {
    return null;
  }
}

// Attach the JWT to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = readStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401 the token is dead (expired/invalid) — clear it and bounce to
// /login. We do a hard redirect here (not useNavigate) because this file
// isn't a React component and has no router context; a hard redirect also
// guarantees a clean Redux state on next load.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        // ignore storage errors (e.g. Safari private mode)
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
