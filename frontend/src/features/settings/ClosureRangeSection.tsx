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
import type { ClinicClosureRange } from '@/types/api';

interface ClosureRangeSectionProps {
  canUpdate: boolean;
  canDelete: boolean;
}

export function ClosureRangeSection({ canUpdate, canDelete }: ClosureRangeSectionProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const closureRangesQuery = useQuery({
    queryKey: queryKeys.settings.closureRanges,
    queryFn: settingsApi.closureRanges,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      settingsApi.createClosureRange({
        reason: reason.trim(),
        start_date: startDate,
        end_date: endDate,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Closure range added');
      setReason('');
      setStartDate('');
      setEndDate('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.closureRanges });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.dashboard });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to add closure range'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => settingsApi.deactivateClosureRange(id),
    onSuccess: () => {
      toast.success('Closure range deactivated');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.closureRanges });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.dashboard });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to deactivate closure range'));
    },
  });

  const columns: Array<TableColumn<ClinicClosureRange>> = [
    {
      header: 'Reason',
      render: (range) => range.reason,
    },
    {
      header: 'Start Date',
      render: (range) => formatDate(range.start_date, 'yyyy-MM-dd'),
    },
    {
      header: 'End Date',
      render: (range) => formatDate(range.end_date, 'yyyy-MM-dd'),
    },
    {
      header: 'Notes',
      render: (range) => range.notes || 'N/A',
    },
    {
      header: 'Status',
      render: (range) => (
        <Badge variant={range.is_active ? 'warning' : 'neutral'}>
          {range.is_active ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (range) => (
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={!canDelete || !range.is_active}
          isLoading={deactivateMutation.isPending && deactivateMutation.variables === range.id}
          onClick={() => deactivateMutation.mutate(range.id)}
        >
          Deactivate
        </Button>
      ),
    },
  ];

  const submitClosureRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reason.trim() || !startDate || !endDate) {
      toast.error('Reason, start date, and end date are required');
      return;
    }

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      toast.error('End date must be greater than or equal to start date');
      return;
    }

    createMutation.mutate();
  };

  return (
    <div className="stack">
      <h3>Closure Ranges</h3>
      <p className="help-text">Manage temporary closure windows for the clinic.</p>

      {canUpdate ? (
        <form className="settings-form-grid" onSubmit={submitClosureRange}>
          <Input
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Summer maintenance"
            disabled={createMutation.isPending}
          />
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={createMutation.isPending}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            disabled={createMutation.isPending}
          />
          <div className="field">
            <label>Notes</label>
            <textarea
              className="textarea"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes"
              disabled={createMutation.isPending}
            />
          </div>
          <div className="actions-row settings-form-actions">
            <Button type="submit" isLoading={createMutation.isPending}>
              Add Range
            </Button>
          </div>
        </form>
      ) : (
        <p className="help-text">You do not have permission to add closure ranges.</p>
      )}

      {closureRangesQuery.isLoading ? <p>Loading closure ranges...</p> : null}
      {closureRangesQuery.isError ? <p>Failed to load closure ranges.</p> : null}

      {!closureRangesQuery.isLoading && !closureRangesQuery.isError ? (
        <Table
          columns={columns}
          data={closureRangesQuery.data ?? []}
          getRowKey={(range) => range.id}
          emptyMessage="No closure ranges found."
        />
      ) : null}
    </div>
  );
}
