import { client } from '@/api/client';
import type { AppOption } from '@/types/api';

export const settingsApi = {
  async options(category?: string) {
    const { data } = await client.get<AppOption[]>('/api/settings/options/', {
      params: category ? { category } : undefined,
    });
    return data;
  },
};
