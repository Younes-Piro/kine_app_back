import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { authApi } from '@/api/auth';
import { permissionsApi } from '@/api/permissions';
import { queryKeys } from '@/api/queryKeys';
import { getApiErrorMessage } from '@/lib/http';
import { useAuthStore } from '@/store/authStore';
import { usePermissionsStore } from '@/store/permissionsStore';
import type { LoginRequest, LoginResponse } from '@/types/api';

export function useLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const setPermissions = usePermissionsStore((state) => state.setFromResponse);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: async (data: LoginResponse) => {
      login(data);

      try {
        const permissions = await permissionsApi.me();
        setPermissions(permissions);
        queryClient.setQueryData(queryKeys.permissions.me, permissions);
      } catch {
        // Keep auth data even if permission bootstrap fails.
      }

      navigate('/', { replace: true });
      toast.success('Logged in successfully');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Invalid username or password'));
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logoutLocal = useAuthStore((state) => state.logoutLocal);
  const clearPermissions = usePermissionsStore((state) => state.clear);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    },
    onSettled: () => {
      logoutLocal();
      clearPermissions();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}

export function useMe() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useAuthBootstrap() {
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const logoutLocal = useAuthStore((state) => state.logoutLocal);
  const setPermissions = usePermissionsStore((state) => state.setFromResponse);
  const clearPermissions = usePermissionsStore((state) => state.clear);
  const hasBootstrapped = useRef(false);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(refreshToken));

  useEffect(() => {
    if (!refreshToken || hasBootstrapped.current) {
      setIsBootstrapping(false);
      return;
    }

    hasBootstrapped.current = true;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        if (!accessToken) {
          const refreshed = await authApi.refresh(refreshToken);
          setTokens(refreshed.access, refreshed.refresh ?? refreshToken);
        }

        const [me, permissions] = await Promise.all([authApi.me(), permissionsApi.me()]);

        if (cancelled) {
          return;
        }

        setUser({
          id: me.id,
          username: me.username,
          email: me.email,
        });
        setPermissions(permissions);
      } catch {
        if (!cancelled) {
          logoutLocal();
          clearPermissions();
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [accessToken, clearPermissions, logoutLocal, refreshToken, setPermissions, setTokens, setUser]);

  return { isBootstrapping };
}
