import { client } from '@/api/client';
import type {
  AppOption,
  AppOptionCreateRequest,
  AppOptionUpdateRequest,
  ClinicClosedDay,
  ClinicClosedDayCreateRequest,
  ClinicClosedDayUpdateRequest,
  ClinicClosureRange,
  ClinicClosureRangeCreateRequest,
  Holiday,
  HolidayCreateRequest,
  SettingsDashboard,
} from '@/types/api';

export const settingsApi = {
  async dashboard() {
    const { data } = await client.get<SettingsDashboard>('/api/settings/');
    return data;
  },

  async options(category?: string) {
    const { data } = await client.get<AppOption[]>('/api/settings/options/', {
      params: category ? { category } : undefined,
    });
    return data;
  },

  async createOption(payload: AppOptionCreateRequest) {
    const { data } = await client.post<AppOption>('/api/settings/options/', payload);
    return data;
  },

  async updateOption(id: number, payload: AppOptionUpdateRequest) {
    const { data } = await client.patch<AppOption>(`/api/settings/options/${id}/`, payload);
    return data;
  },

  async deactivateOption(id: number) {
    const { data } = await client.patch<{ detail: string }>(`/api/settings/options/${id}/deactivate/`, {});
    return data;
  },

  async holidays() {
    const { data } = await client.get<Holiday[]>('/api/settings/holidays/');
    return data;
  },

  async createHoliday(payload: HolidayCreateRequest) {
    const { data } = await client.post<Holiday>('/api/settings/holidays/', payload);
    return data;
  },

  async deactivateHoliday(id: number) {
    const { data } = await client.patch<{ detail: string }>(`/api/settings/holidays/${id}/deactivate/`, {});
    return data;
  },

  async closedDays() {
    const { data } = await client.get<ClinicClosedDay[]>('/api/settings/closed-days/');
    return data;
  },

  async createClosedDay(payload: ClinicClosedDayCreateRequest) {
    const { data } = await client.post<ClinicClosedDay>('/api/settings/closed-days/', payload);
    return data;
  },

  async updateClosedDay(id: number, payload: ClinicClosedDayUpdateRequest) {
    const { data } = await client.patch<ClinicClosedDay>(`/api/settings/closed-days/${id}/`, payload);
    return data;
  },

  async deactivateClosedDay(id: number) {
    const { data } = await client.patch<{ detail: string }>(
      `/api/settings/closed-days/${id}/deactivate/`,
      {},
    );
    return data;
  },

  async closureRanges() {
    const { data } = await client.get<ClinicClosureRange[]>('/api/settings/closure-ranges/');
    return data;
  },

  async createClosureRange(payload: ClinicClosureRangeCreateRequest) {
    const { data } = await client.post<ClinicClosureRange>('/api/settings/closure-ranges/', payload);
    return data;
  },

  async deactivateClosureRange(id: number) {
    const { data } = await client.patch<{ detail: string }>(
      `/api/settings/closure-ranges/${id}/deactivate/`,
      {},
    );
    return data;
  },
};
