import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { permissionsApi } from '@/api/permissions';
import { queryKeys } from '@/api/queryKeys';
import { usePermissionsStore } from '@/store/permissionsStore';

export function usePermissions() {
  const role = usePermissionsStore((state) => state.role);
  const permissions = usePermissionsStore((state) => state.permissions);
  const hasPermission = usePermissionsStore((state) => state.hasPermission);

  return {
    role,
    permissions,
    isAdmin: role === 'admin',
    hasPermission,
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
