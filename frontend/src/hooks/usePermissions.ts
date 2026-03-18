import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { permissionsApi } from '@/api/permissions';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/store/authStore';
import { usePermissionsStore } from '@/store/permissionsStore';

export function usePermissions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const role = usePermissionsStore((state) => state.role);
  const permissions = usePermissionsStore((state) => state.permissions);
  const hasPermission = usePermissionsStore((state) => state.hasPermission);
  const myPermissionsQuery = useMyPermissions(Boolean(accessToken || refreshToken));

  return {
    role,
    permissions,
    isAdmin: role === 'admin',
    hasPermission,
    isLoading: myPermissionsQuery.isLoading && !role,
  };
}

export function useMyPermissions(enabled: boolean) {
  const setFromResponse = usePermissionsStore((state) => state.setFromResponse);

  const query = useQuery({
    queryKey: queryKeys.permissions.me,
    queryFn: permissionsApi.me,
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) {
      setFromResponse(query.data);
    }
  }, [query.data, setFromResponse]);

  return query;
}
