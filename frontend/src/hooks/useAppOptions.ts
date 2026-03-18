import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { settingsApi } from '@/api/settings';

export function useAppOptions(category: string) {
  return useQuery({
    queryKey: queryKeys.settings.options(category),
    queryFn: () => settingsApi.options(category),
    staleTime: 5 * 60_000,
  });
}
