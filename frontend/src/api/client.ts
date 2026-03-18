import axios from 'axios';

import type { RefreshResponse } from '@/types/api';
import { useAuthStore } from '@/store/authStore';
import { usePermissionsStore } from '@/store/permissionsStore';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const client = axios.create({
  baseURL: API_BASE_URL,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
});

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  pendingQueue.forEach((resolve) => resolve(token));
  pendingQueue = [];
}

function redirectToLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

client.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;

  if (accessToken) {
    const headers = (config.headers ?? {}) as Record<string, string>;
    headers.Authorization = `Bearer ${accessToken}`;
    config.headers = headers;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as {
      _retry?: boolean;
      url?: string;
      headers?: Record<string, string>;
    };

    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? '';

    const isAuthEndpoint =
      requestUrl.includes('/api/auth/login/') ||
      requestUrl.includes('/api/auth/refresh/') ||
      requestUrl.includes('/api/auth/logout/');

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    const authStore = useAuthStore.getState();
    const clearPermissions = usePermissionsStore.getState().clear;

    if (!authStore.refreshToken) {
      authStore.logoutLocal();
      clearPermissions();
      redirectToLogin();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }

          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(client(originalRequest as any));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await refreshClient.post<RefreshResponse>('/api/auth/refresh/', {
        refresh: authStore.refreshToken,
      });

      const nextRefresh = data.refresh ?? authStore.refreshToken;
      authStore.setTokens(data.access, nextRefresh);
      flushQueue(data.access);

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${data.access}`;
      return client(originalRequest as any);
    } catch (refreshError) {
      flushQueue(null);
      authStore.logoutLocal();
      clearPermissions();
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
