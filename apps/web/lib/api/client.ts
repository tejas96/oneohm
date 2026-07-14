import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

import { ROUTES } from '@/lib/config/routes';

/**
 * OneOhm EPC - API Client
 * Configured with JWT authentication interceptors
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085/api/v1';
const API_TIMEOUT_MS = 30000;

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
});

const refreshClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
});

// Token keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Get access token from cookies
 */
export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from cookies
 */
export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_TOKEN_KEY);
}

/**
 * Set tokens in cookies
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  // Access token - shorter expiry (matches backend JWT_EXPIRES_IN)
  Cookies.set(ACCESS_TOKEN_KEY, accessToken, {
    expires: 1 / 96, // 15 minutes
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  // Refresh token - longer expiry (matches backend JWT_REFRESH_EXPIRES_IN)
  Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
    expires: 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
}

/**
 * Clear all tokens
 */
export function clearTokens(): void {
  Cookies.remove(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
}

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await refreshClient.post('/auth/refresh', {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    setTokens(accessToken, newRefreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// Request interceptor - add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error: Error) => {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);

// Response interceptor - handle 401 errors and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

function normalizeRequestPath(requestUrl?: string): string | null {
  if (!requestUrl) return null;
  try {
    if (requestUrl.startsWith('http')) {
      return new URL(requestUrl).pathname;
    }
  } catch {
    // Fall through to normalize raw string below.
  }
  return requestUrl.startsWith('/') ? requestUrl : `/${requestUrl}`;
}

function shouldSkip401Recovery(requestUrl?: string): boolean {
  const normalizedPath = normalizeRequestPath(requestUrl);
  if (!normalizedPath) return false;

  const skipPaths = [
    '/auth/login',
    '/auth/refresh',
    '/auth/otp/request',
    '/auth/otp/verify',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];

  return skipPaths.some((path) => normalizedPath.startsWith(path) || normalizedPath.includes(path));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (
      process.env.NODE_ENV !== 'production' &&
      (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout'))
    ) {
      const timeout = error.config?.timeout ?? API_TIMEOUT_MS;
      console.warn(
        `[apiClient timeout] ${error.config?.method?.toUpperCase() ?? 'REQUEST'} ${error.config?.url ?? 'unknown'} exceeded ${timeout}ms`,
      );
    }

    const originalRequest = error.config;
    const requestUrl = originalRequest?.url;

    if (error.response?.status === 401 && shouldSkip401Recovery(requestUrl)) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't already tried to refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !(originalRequest as unknown as { _retry?: boolean })._retry
    ) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err: unknown) => {
            return Promise.reject(err instanceof Error ? err : new Error(String(err)));
          });
      }

      (originalRequest as unknown as { _retry?: boolean })._retry = true;
      isRefreshing = true;

      try {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
          processQueue(null);
          return apiClient(originalRequest);
        }
        processQueue(new Error('Token refresh failed'));
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = ROUTES.AUTH.LOGIN;
        }
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      } catch (refreshError) {
        const err = refreshError instanceof Error ? refreshError : new Error(String(refreshError));
        processQueue(err);
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = ROUTES.AUTH.LOGIN;
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
