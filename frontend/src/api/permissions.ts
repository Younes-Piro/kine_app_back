import { client } from '@/api/client';
import type { MyPermissionsResponse, Permission } from '@/types/api';

interface UserPermissionsResponse {
  user_id: number;
  role: 'admin' | 'staff';
  permissions: 'all' | Permission[];
}

export const permissionsApi = {
  async catalog() {
    const { data } = await client.get<Permission[]>('/api/permissions/');
    return data;
  },

  async me() {
    const { data } = await client.get<MyPermissionsResponse>('/api/permissions/me/');
    return data;
  },

  async getUserPermissions(userId: number) {
    const { data } = await client.get<UserPermissionsResponse>(`/api/permissions/users/${userId}/`);
    return data;
  },

  async assignUserPermissions(userId: number, permissionIds: number[]) {
    const { data } = await client.patch(`/api/permissions/users/${userId}/`, {
      permission_ids: permissionIds,
    });
    return data;
  },

  async clearUserPermissions(userId: number) {
    const { data } = await client.delete(`/api/permissions/users/${userId}/`);
    return data;
  },
};
