import { client } from '@/api/client';
import type { TreatmentListItem } from '@/types/api';

export const treatmentsApi = {
  async list(clientId?: number) {
    const { data } = await client.get<TreatmentListItem[]>('/api/treatments/', {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return data;
  },
};
