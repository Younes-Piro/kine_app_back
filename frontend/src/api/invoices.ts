import { client } from '@/api/client';
import type { InvoiceListItem } from '@/types/api';

export const invoicesApi = {
  async list(clientId?: number) {
    const { data } = await client.get<InvoiceListItem[]>('/api/invoices/', {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return data;
  },
};
