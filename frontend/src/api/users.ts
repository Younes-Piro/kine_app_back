import { client } from '@/api/client';
import type { User, UserCreateRequest, UserUpdateRequest } from '@/types/api';

export const usersApi = {
  async list() {
    const { data } = await client.get<User[]>('/api/users/');
    return data;
  },

  async create(payload: UserCreateRequest) {
    const { data } = await client.post<User>('/api/users/', payload);
    return data;
  },

  async detail(id: number) {
    const { data } = await client.get<User>(`/api/users/${id}/`);
    return data;
  },

  async update(id: number, payload: UserUpdateRequest) {
    const { data } = await client.patch<User>(`/api/users/${id}/`, payload);
    return data;
  },

  async deactivate(id: number) {
    const { data } = await client.patch(`/api/users/${id}/deactivate/`, {});
    return data;
  },
};
