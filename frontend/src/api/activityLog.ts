import { client } from '@/api/client';
import type { ActivityLog } from '@/types/api';

interface ActivityLogListParams {
  userId?: number;
  action?: string;
  modelName?: string;
  search?: string;
}

export const activityLogApi = {
  async list(params?: ActivityLogListParams) {
    const { data } = await client.get<ActivityLog[]>('/api/activity-log/', {
      params: {
        ...(params?.userId ? { user: params.userId } : {}),
        ...(params?.action ? { action: params.action } : {}),
        ...(params?.modelName ? { model_name: params.modelName } : {}),
        ...(params?.search ? { search: params.search } : {}),
      },
    });
    return data;
  },
};
