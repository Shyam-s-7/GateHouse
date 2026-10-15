import axios from 'axios';

/**
 * Resolve the API Gateway Backend Base URL with a clear priority order:
 *
 *  1. VITE_API_URL  — set in client/.env (local) or Vercel Project Settings (production)
 *  2. Hostname safety-net — if deployed on *.vercel.app with no env var, auto-target Render
 *  3. Local dev fallback — http://localhost:5050 (matches backend PORT in server/.env)
 *
 * NOTE: In local development the Vite dev proxy (vite.config.js) also forwards /api and
 * /gateway paths to localhost:5050, so requests work even with a relative baseURL.
 * The explicit baseURL below makes production deployments reliable without the proxy.
 */
const resolveBaseUrl = () => {
  // Priority 1: Explicit env variable (set on Vercel or in client/.env)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Priority 2: Deployed on Vercel without env var — fall back to live Render backend
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    console.warn(
      '[Gatehouse] VITE_API_URL is not set on Vercel. ' +
        'Falling back to https://gatehouse-backend.onrender.com. ' +
        'Set VITE_API_URL in your Vercel Project Settings to silence this warning.'
    );
    return 'https://gatehouse-backend.onrender.com';
  }

  // Priority 3: Local development default (must match backend PORT)
  return 'http://localhost:5050';
};

export const API_BASE_URL = resolveBaseUrl();

if (import.meta.env.DEV) {
  console.log(`[Gatehouse Client] Active Backend: ${API_BASE_URL}`);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach JWT token from localStorage ──────────────────
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

// ── Response interceptor: surface auth errors ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      error.config &&
      !error.config.url.includes('/api/auth/login')
    ) {
      // Token expired or invalid — clear stale credentials
      localStorage.removeItem('gatehouse_token');
    }
    return Promise.reject(error);
  }
);

export default api;
