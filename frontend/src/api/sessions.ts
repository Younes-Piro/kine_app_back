import { client } from '@/api/client';
import type {
  Session,
  SessionCreateRequest,
  SessionItem,
  SessionUpdateRequest,
} from '@/types/api';

interface SessionListParams {
  clientId?: number;
  treatmentId?: number;
}

export const sessionsApi = {
  async list(params?: SessionListParams) {
    const { data } = await client.get<SessionItem[]>('/api/sessions/', {
      params: {
        ...(params?.clientId ? { client_id: params.clientId } : {}),
        ...(params?.treatmentId ? { treatment_id: params.treatmentId } : {}),
      },
    });
    return data;
  },

  async detail(id: number) {
    const { data } = await client.get<Session>(`/api/sessions/${id}/`);
    return data;
  },

  async create(payload: SessionCreateRequest) {
    const { data } = await client.post<Session>('/api/sessions/', payload);
    return data;
  },

  async update(id: number, payload: SessionUpdateRequest) {
    const { data } = await client.patch<Session>(`/api/sessions/${id}/`, payload);
    return data;
  },

  async markCompleted(id: number) {
    const { data } = await client.patch<SessionItem>(
      `/api/sessions/${id}/mark_completed/`,
      {},
    );
    return data;
  },
};
