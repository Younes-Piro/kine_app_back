import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { settingsApi } from '@/api/settings';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, type TableColumn } from '@/components/ui/Table';
import { formatDate } from '@/lib/formatters';
import { getApiErrorMessage } from '@/lib/http';
import type { Holiday } from '@/types/api';

interface HolidaySectionProps {
  canUpdate: boolean;
  canDelete: boolean;
}

export function HolidaySection({ canUpdate, canDelete }: HolidaySectionProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const holidaysQuery = useQuery({
    queryKey: queryKeys.settings.holidays,
    queryFn: settingsApi.holidays,
  });

  const createMutation = useMutation({
    mutationFn: () => settingsApi.createHoliday({ name: name.trim(), date }),
    onSuccess: () => {
      toast.success('Holiday added');
      setName('');
      setDate('');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.holidays });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.dashboard });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to add holiday'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => settingsApi.deactivateHoliday(id),
    onSuccess: () => {
      toast.success('Holiday deactivated');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.holidays });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.dashboard });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to deactivate holiday'));
    },
  });

  const columns: Array<TableColumn<Holiday>> = [
    {
      header: 'Name',
      render: (holiday) => holiday.name,
    },
    {
      header: 'Date',
      render: (holiday) => formatDate(holiday.date, 'yyyy-MM-dd'),
    },
    {
      header: 'Source',
      render: (holiday) => (
        <Badge variant={holiday.source === 'seed' ? 'info' : 'neutral'}>{holiday.source}</Badge>
      ),
    },
    {
      header: 'Status',
      render: (holiday) => (
        <Badge variant={holiday.is_active ? 'success' : 'danger'}>
          {holiday.is_active ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (holiday) => (
        <div className="actions-inline">
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={!canDelete || !holiday.is_active}
            isLoading={deactivateMutation.isPending && deactivateMutation.variables === holiday.id}
            onClick={() => deactivateMutation.mutate(holiday.id)}
          >
            Deactivate
          </Button>
        </div>
      ),
    },
  ];

  const submitHoliday = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !date) {
      toast.error('Name and date are required');
      return;
    }

    createMutation.mutate();
  };

  return (
    <div className="stack">
      <h3>Holidays</h3>
      <p className="help-text">Configure holiday dates used by scheduling logic.</p>

      {canUpdate ? (
        <form className="settings-form-grid settings-form-compact" onSubmit={submitHoliday}>
          <Input
            label="Holiday Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Throne Day"
            disabled={createMutation.isPending}
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={createMutation.isPending}
          />
          <div className="actions-row settings-form-actions">
            <Button type="submit" isLoading={createMutation.isPending}>
              Add Holiday
            </Button>
          </div>
        </form>
      ) : (
        <p className="help-text">You do not have permission to add holidays.</p>
      )}

      {holidaysQuery.isLoading ? <p>Loading holidays...</p> : null}
      {holidaysQuery.isError ? <p>Failed to load holidays.</p> : null}

      {!holidaysQuery.isLoading && !holidaysQuery.isError ? (
        <Table
          columns={columns}
          data={holidaysQuery.data ?? []}
          getRowKey={(holiday) => holiday.id}
          emptyMessage="No holidays found."
        />
      ) : null}
    </div>
  );
}
