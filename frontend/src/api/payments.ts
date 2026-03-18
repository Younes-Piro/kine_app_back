import { client } from '@/api/client';
import type { Payment, PaymentCreateRequest } from '@/types/api';

export const paymentsApi = {
  async list(treatmentId?: number) {
    const { data } = await client.get<Payment[]>('/api/payments/', {
      params: treatmentId ? { treatment: treatmentId } : undefined,
    });
    return data;
  },

  async create(payload: PaymentCreateRequest) {
    const { data } = await client.post<Payment>('/api/payments/', payload);
    return data;
  },

  async update(id: number, payload: Partial<PaymentCreateRequest>) {
    const { data } = await client.patch<Payment>(`/api/payments/${id}/`, payload);
    return data;
  },

  async deactivate(id: number) {
    const { data } = await client.patch(`/api/payments/${id}/deactivate/`, {});
    return data;
  },
};
