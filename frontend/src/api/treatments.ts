import { client } from '@/api/client';
import type {
  TreatmentBalanceResponse,
  TreatmentCreateRequest,
  TreatmentDetail,
  TreatmentListItem,
  TreatmentUpdateRequest,
} from '@/types/api';

export const treatmentsApi = {
  async list(clientId?: number) {
    const { data } = await client.get<TreatmentListItem[]>('/api/treatments/', {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return data;
  },

  async detail(id: number) {
    const { data } = await client.get<TreatmentDetail>(`/api/treatments/${id}/`);
    return data;
  },

  async create(payload: TreatmentCreateRequest) {
    const { data } = await client.post<TreatmentDetail>('/api/treatments/', payload);
    return data;
  },

  async update(id: number, payload: TreatmentUpdateRequest) {
    const { data } = await client.patch<TreatmentDetail>(`/api/treatments/${id}/`, payload);
    return data;
  },

  async deactivate(id: number) {
    const { data } = await client.patch(`/api/treatments/${id}/deactivate/`, {});
    return data;
  },

  async balance(id: number) {
    const { data } = await client.get<TreatmentBalanceResponse>(`/api/treatments/${id}/balance/`);
    return data;
  },
};
