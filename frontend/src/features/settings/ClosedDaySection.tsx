import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { settingsApi } from '@/api/settings';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, type TableColumn } from '@/components/ui/Table';
import { getApiErrorMessage } from '@/lib/http';
import type { ClinicClosedDay } from '@/types/api';

import { WEEKDAY_OPTIONS } from './constants';

interface ClosedDaySectionProps {
  canUpdate: boolean;
  canDelete: boolean;
}

export function ClosedDaySection({ canUpdate, canDelete }: ClosedDaySectionProps) {
  const queryClient = useQueryClient();

  const closedDaysQuery = useQuery({
    queryKey: queryKeys.settings.closedDays,
    queryFn: settingsApi.closedDays,
  });

  const createMutation = useMutation({
    mutationFn: (weekday: number) => settingsApi.createClosedDay({ weekday }),
    onSuccess: () => {
      toast.success('Closed day added');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.closedDays });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.dashboard });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to add closed day'));
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => settingsApi.updateClosedDay(id, { is_active: true }),
    onSuccess: () => {
      toast.success('Closed day activated');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.closedDays });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.dashboard });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to activate closed day'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => settingsApi.deactivateClosedDay(id),
    onSuccess: () => {
      toast.success('Closed day deactivated');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.closedDays });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.dashboard });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to deactivate closed day'));
    },
  });

  const closedDayByWeekday = useMemo(() => {
    const map = new Map<number, ClinicClosedDay>();
    for (const closedDay of closedDaysQuery.data ?? []) {
      map.set(closedDay.weekday, closedDay);
    }
    return map;
  }, [closedDaysQuery.data]);

  const isBusy = createMutation.isPending || activateMutation.isPending || deactivateMutation.isPending;

  const toggleWeekday = (weekday: number, shouldBeActive: boolean) => {
    const record = closedDayByWeekday.get(weekday);

    if (shouldBeActive) {
      if (!canUpdate) {
        return;
      }

      if (record) {
        if (record.is_active) {
          return;
        }
        activateMutation.mutate(record.id);
        return;
      }

      createMutation.mutate(weekday);
      return;
    }

    if (!canDelete || !record || !record.is_active) {
      return;
    }

    deactivateMutation.mutate(record.id);
  };

  const columns: Array<TableColumn<ClinicClosedDay>> = [
    {
      header: 'Weekday',
      render: (closedDay) => closedDay.weekday_label,
    },
    {
      header: 'Status',
      render: (closedDay) => (
        <Badge variant={closedDay.is_active ? 'warning' : 'neutral'}>
          {closedDay.is_active ? 'closed' : 'inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (closedDay) =>
        closedDay.is_active ? (
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={!canDelete}
            isLoading={deactivateMutation.isPending && deactivateMutation.variables === closedDay.id}
            onClick={() => deactivateMutation.mutate(closedDay.id)}
          >
            Deactivate
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canUpdate}
            isLoading={activateMutation.isPending && activateMutation.variables === closedDay.id}
            onClick={() => activateMutation.mutate(closedDay.id)}
          >
            Activate
          </Button>
        ),
    },
  ];

  return (
    <div className="stack">
      <h3>Closed Days</h3>
      <p className="help-text">Toggle weekdays when the clinic is closed.</p>

      <div className="weekday-toggle-grid">
        {WEEKDAY_OPTIONS.map((weekdayOption) => {
          const record = closedDayByWeekday.get(weekdayOption.value);
          const isActive = Boolean(record?.is_active);
          const canToggle = isActive ? canDelete : canUpdate;

          return (
            <label key={weekdayOption.value} className={isActive ? 'weekday-toggle active' : 'weekday-toggle'}>
              <input
                type="checkbox"
                checked={isActive}
                disabled={isBusy || !canToggle}
                onChange={(event) => toggleWeekday(weekdayOption.value, event.target.checked)}
              />
              <span>{weekdayOption.label}</span>
            </label>
          );
        })}
      </div>

      {closedDaysQuery.isLoading ? <p>Loading closed days...</p> : null}
      {closedDaysQuery.isError ? <p>Failed to load closed days.</p> : null}

      {!closedDaysQuery.isLoading && !closedDaysQuery.isError ? (
        <Table
          columns={columns}
          data={closedDaysQuery.data ?? []}
          getRowKey={(closedDay) => closedDay.id}
          emptyMessage="No closed weekdays configured."
        />
      ) : null}
    </div>
  );
}
