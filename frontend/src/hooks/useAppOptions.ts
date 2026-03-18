import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { settingsApi } from '@/api/settings';

export function useAppOptions(category?: string) {
  return useQuery({
    queryKey: queryKeys.settings.options(category),
    queryFn: () => settingsApi.options(category),
    select: (options) =>
      options
        .filter((option) => option.is_active)
        .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
    staleTime: 5 * 60_000,
  });
}
