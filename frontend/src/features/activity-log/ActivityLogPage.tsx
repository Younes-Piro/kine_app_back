import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { activityLogApi } from '@/api/activityLog';
import { queryKeys } from '@/api/queryKeys';
import { usersApi } from '@/api/users';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table, type TableColumn } from '@/components/ui/Table';
import { formatDate } from '@/lib/formatters';
import type { ActivityLog } from '@/types/api';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'deactivate', label: 'Deactivate' },
  { value: 'other', label: 'Other' },
];

const ACTION_VARIANTS: Record<string, BadgeVariant> = {
  create: 'success',
  update: 'info',
  deactivate: 'danger',
  other: 'warning',
};

function toActionLabel(action: string) {
  if (!action) {
    return 'Unknown';
  }

  return action.replace('_', ' ');
}

export function ActivityLogPage() {
  const [userFilter, setUserFilter] = useState<number | undefined>();
  const [actionFilter, setActionFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [search, setSearch] = useState('');

  const logsQuery = useQuery({
    queryKey: queryKeys.activityLog.list({
      user: userFilter,
      action: actionFilter || undefined,
      model_name: modelFilter || undefined,
      search: search.trim() || undefined,
    }),
    queryFn: () =>
      activityLogApi.list({
        userId: userFilter,
        action: actionFilter || undefined,
        modelName: modelFilter || undefined,
        search: search.trim() || undefined,
      }),
  });

  const allLogsQuery = useQuery({
    queryKey: queryKeys.activityLog.all,
    queryFn: () => activityLogApi.list(),
    staleTime: 60_000,
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: usersApi.list,
    staleTime: 60_000,
  });

  const modelOptions = useMemo(() => {
    const source = allLogsQuery.data ?? logsQuery.data ?? [];
    return Array.from(new Set(source.map((log) => log.model_name)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [allLogsQuery.data, logsQuery.data]);

  const columns: Array<TableColumn<ActivityLog>> = [
    {
      header: 'Date & Time',
      render: (log) => formatDate(log.created_at, 'yyyy-MM-dd HH:mm'),
    },
    {
      header: 'User',
      render: (log) => log.username,
    },
    {
      header: 'Action',
      render: (log) => (
        <Badge variant={ACTION_VARIANTS[log.action] ?? 'neutral'}>
          {toActionLabel(log.action)}
        </Badge>
      ),
    },
    {
      header: 'Module',
      render: (log) => log.model_name,
    },
    {
      header: 'Object ID',
      render: (log) => log.object_id ?? 'N/A',
    },
    {
      header: 'Description',
      render: (log) => log.description,
    },
  ];

  return (
    <Card>
      <CardHeader className="card-header-between">
        <div>
          <CardTitle>Activity Log</CardTitle>
          <p>Track create, update, deactivate, and custom actions across modules.</p>
        </div>
      </CardHeader>

      <CardBody>
        <div className="filters-grid">
          <div className="field">
            <label>Filter by User</label>
            <select
              className="input"
              value={userFilter ?? ''}
              onChange={(event) => {
                const raw = event.target.value;
                setUserFilter(raw ? Number(raw) : undefined);
              }}
            >
              <option value="">{usersQuery.isLoading ? 'Loading users...' : 'All users'}</option>
              {(usersQuery.data ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Filter by Action</label>
            <select
              className="input"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value || 'all-actions'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Filter by Module</label>
            <select
              className="input"
              value={modelFilter}
              onChange={(event) => setModelFilter(event.target.value)}
            >
              <option value="">{allLogsQuery.isLoading ? 'Loading modules...' : 'All modules'}</option>
              {modelOptions.map((modelName) => (
                <option key={modelName} value={modelName}>
                  {modelName}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Search"
            placeholder="Search description, user, or module"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="actions-row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setUserFilter(undefined);
              setActionFilter('');
              setModelFilter('');
              setSearch('');
            }}
          >
            Reset Filters
          </Button>
        </div>

        {logsQuery.isLoading ? <p>Loading activity logs...</p> : null}
        {logsQuery.isError ? <p>Failed to load activity logs.</p> : null}

        {!logsQuery.isLoading && !logsQuery.isError ? (
          <Table
            columns={columns}
            data={logsQuery.data ?? []}
            getRowKey={(log) => log.id}
            emptyMessage="No activity found for the selected filters."
          />
        ) : null}
      </CardBody>
    </Card>
  );
}
