import { client } from '@/api/client';
import type {
  AssignPermissionsRequest,
  MyPermissionsResponse,
  Permission,
  UserPermissionsResponse,
} from '@/types/api';

interface AssignPermissionsResponse {
  detail: string;
  user_id: number;
  permissions: Permission[];
}

interface ClearPermissionsResponse {
  detail: string;
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

  async assignUserPermissions(userId: number, payload: AssignPermissionsRequest) {
    const { data } = await client.patch<AssignPermissionsResponse>(
      `/api/permissions/users/${userId}/`,
      payload,
    );
    return data;
  },

  async clearUserPermissions(userId: number) {
    const { data } = await client.delete<ClearPermissionsResponse>(`/api/permissions/users/${userId}/`);
    return data;
  },
};
