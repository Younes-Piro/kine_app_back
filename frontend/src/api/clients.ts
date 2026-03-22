import { client } from '@/api/client';
import { isFile } from '@/lib/utils';
import type {
  Client,
  ClientCreateRequest,
  ClientUpdateRequest,
} from '@/types/api';

function appendFormValue(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  formData.append(key, String(value));
}

function toFormData(payload: ClientCreateRequest | ClientUpdateRequest) {
  const formData = new FormData();

  appendFormValue(formData, 'full_name', payload.full_name);
  appendFormValue(formData, 'gender', payload.gender);
  appendFormValue(formData, 'cin', payload.cin);
  appendFormValue(formData, 'birth_date', payload.birth_date);
  appendFormValue(formData, 'email', payload.email);
  appendFormValue(formData, 'phone_number', payload.phone_number);
  appendFormValue(formData, 'address', payload.address);
  appendFormValue(formData, 'marital_status', payload.marital_status);
  appendFormValue(formData, 'social_security', payload.social_security);
  appendFormValue(formData, 'dossier_type', payload.dossier_type);

  if (isFile(payload.profile_photo)) {
    formData.append('profile_photo', payload.profile_photo);
  }

  return formData;
}

function hasImageFile(payload: ClientCreateRequest | ClientUpdateRequest) {
  return isFile(payload.profile_photo);
}

export const clientsApi = {
  async list() {
    const { data } = await client.get<Client[]>('/api/clients/');
    return data;
  },

  async detail(id: number) {
    const { data } = await client.get<Client>(`/api/clients/${id}/`);
    return data;
  },

  async create(payload: ClientCreateRequest) {
    if (hasImageFile(payload)) {
      const { data } = await client.post<Client>('/api/clients/', toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }

    const { data } = await client.post<Client>('/api/clients/', payload);
    return data;
  },

  async update(id: number, payload: ClientUpdateRequest) {
    if (hasImageFile(payload)) {
      const { data } = await client.patch<Client>(`/api/clients/${id}/`, toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }

    const { data } = await client.patch<Client>(`/api/clients/${id}/`, payload);
    return data;
  },

  async deactivate(id: number) {
    const { data } = await client.patch(`/api/clients/${id}/deactivate/`, {});
    return data;
  },
};
