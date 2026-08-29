// lib/axios.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

// Public API endpoints – no Authorization header and no refresh on 401
const publicApiEndpoints = [
  '/api/token/',
  '/api/token/refresh/',
  '/api/auth/register/',
  '/api/auth/activate/',
  '/api/auth/resend-activation-email/',
  '/api/auth/forgot-password/',
  '/api/auth/reset-password/',
  '/api/auth/update-pending-user/',
];

const isPublicApiEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return publicApiEndpoints.some(endpoint => url.includes(endpoint));
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
});

// Request interceptor – attach token only for non-public endpoints
api.interceptors.request.use((config) => {
  if (accessToken && !isPublicApiEndpoint(config.url)) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor – refresh only for non-public endpoints
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If it's a public endpoint or already retried, just reject
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isPublicApiEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken();
      }
      const newAccessToken = await refreshPromise;
      refreshPromise = null;
      setAccessToken(newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      refreshPromise = null;
      setAccessToken(null);
      localStorage.removeItem('refresh_token');
      window.location.href = '/';
      return Promise.reject(refreshError);
    }
  }
);

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  const response = await axios.post(`${API_URL}/api/token/refresh/`, {
    refresh: refreshToken,
  });
  return response.data.access;
}

export default api;