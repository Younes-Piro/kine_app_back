import { client } from '@/api/client';
import type { SessionItem } from '@/types/api';

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

  async markCompleted(id: number) {
    const { data } = await client.patch<SessionItem>(`/api/sessions/${id}/mark_completed/`, {});
    return data;
  },
};
