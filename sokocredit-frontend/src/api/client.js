import axios from 'axios';
import { AUTH_STORAGE_KEY } from '../features/auth/authSlice';

// Swap this once the Flask API has a real host (e.g. via .env: VITE_API_BASE_URL).
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

// Honor the mock-auth flag so the client behaves politely in demo mode.
export const USE_MOCK_AUTH = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true';

export const apiClient = axios.create({
  baseURL,
  // Render's free instances can take longer than 15 seconds to wake after
  // inactivity.  Do not turn a cold start into a failed trader registration.
  timeout: 60000,
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
  // In mock mode avoid attaching a real Authorization header. Leaving a
  // mock token on requests can cause the backend to reject them and the
  // app to redirect back to /login. Components will fall back to demo
  // data when the API is unavailable or auth is mocked.
  if (token && !USE_MOCK_AUTH) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (USE_MOCK_AUTH) config.headers['X-Using-Mock-Auth'] = '1';
  return config;
});

// On a 401 the token is dead (expired/invalid) — clear it and bounce to
// /login. We do a hard redirect here (not useNavigate) because this file
// isn't a React component and has no router context; a hard redirect also
// guarantees a clean Redux state on next load.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Do not clear state or hard-redirect when running with mock auth;
    // that would bounce a developer using demo tokens back to the login
    // screen continuously. Only perform the redirect in real auth mode.
    const status = error.response?.status;
    if (!USE_MOCK_AUTH && status === 401) {
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
