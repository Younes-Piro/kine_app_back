import { client } from '@/api/client';
import type {
  InvoiceCreateRequest,
  InvoiceDetail,
  InvoiceListItem,
} from '@/types/api';

interface InvoiceListParams {
  clientId?: number;
  invoiceTypeId?: number;
}

export const invoicesApi = {
  async list(params?: InvoiceListParams) {
    const { data } = await client.get<InvoiceListItem[]>('/api/invoices/', {
      params: {
        ...(params?.clientId ? { client_id: params.clientId } : {}),
        ...(params?.invoiceTypeId ? { invoice_type: params.invoiceTypeId } : {}),
      },
    });
    return data;
  },

  async detail(id: number) {
    const { data } = await client.get<InvoiceDetail>(`/api/invoices/${id}/`);
    return data;
  },

  async create(payload: InvoiceCreateRequest) {
    const { data } = await client.post<InvoiceDetail>('/api/invoices/', payload);
    return data;
  },

  async update(id: number, payload: Partial<InvoiceCreateRequest>) {
    const { data } = await client.patch<InvoiceDetail>(`/api/invoices/${id}/`, payload);
    return data;
  },
};
