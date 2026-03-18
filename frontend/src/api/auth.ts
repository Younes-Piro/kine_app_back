import { client } from '@/api/client';
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  RefreshResponse,
} from '@/types/api';

export const authApi = {
  async login(payload: LoginRequest) {
    const { data } = await client.post<LoginResponse>('/api/auth/login/', payload);
    return data;
  },

  async refresh(refreshToken: string) {
    const { data } = await client.post<RefreshResponse>('/api/auth/refresh/', {
      refresh: refreshToken,
    });
    return data;
  },

  async logout(refreshToken: string) {
    await client.post('/api/auth/logout/', { refresh: refreshToken });
  },

  async me() {
    const { data } = await client.get<MeResponse>('/api/auth/me/');
    return data;
  },
};
