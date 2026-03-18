import { create } from 'zustand';

import type { AuthUser, LoginResponse } from '@/types/api';

const REFRESH_STORAGE_KEY = 'kine.refresh_token';

function readRefreshToken() {
  try {
    return window.localStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRefreshToken(token: string | null) {
  try {
    if (token) {
      window.localStorage.setItem(REFRESH_STORAGE_KEY, token);
      return;
    }

    window.localStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  logoutLocal: () => void;
  setTokens: (access: string, refresh?: string) => void;
  setUser: (user: AuthUser | null) => void;
}

const initialRefreshToken = typeof window === 'undefined' ? null : readRefreshToken();

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: initialRefreshToken,
  user: null,
  isAuthenticated: false,
  login: (data) => {
    writeRefreshToken(data.refresh);
    set({
      accessToken: data.access,
      refreshToken: data.refresh,
      user: data.user,
      isAuthenticated: true,
    });
  },
  logoutLocal: () => {
    writeRefreshToken(null);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },
  setTokens: (access, refresh) => {
    const refreshToken = refresh ?? get().refreshToken;
    if (refreshToken) {
      writeRefreshToken(refreshToken);
    }

    set({
      accessToken: access,
      refreshToken: refreshToken ?? null,
      isAuthenticated: true,
    });
  },
  setUser: (user) => {
    set({ user });
  },
}));
