import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { queryKeys } from '@/api/queryKeys';
import { treatmentsApi } from '@/api/treatments';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table, type TableColumn } from '@/components/ui/Table';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/formatters';
import type { TreatmentListItem } from '@/types/api';

import { TreatmentCreateDialog } from './TreatmentCreateDialog';

export function TreatmentListPage() {
  const navigate = useNavigate();
  const [clientFilter, setClientFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { hasPermission } = usePermissions();

  const canCreateTreatment = hasPermission('treatment:create');

  const treatmentsQuery = useQuery({
    queryKey: queryKeys.treatments.all,
    queryFn: () => treatmentsApi.list(),
  });

  const filteredTreatments = useMemo(() => {
    const items = treatmentsQuery.data ?? [];
    if (!clientFilter.trim()) {
      return items;
    }

    const normalized = clientFilter.toLowerCase();
    return items.filter((item) => item.client_full_name.toLowerCase().includes(normalized));
  }, [clientFilter, treatmentsQuery.data]);

  const columns: Array<TableColumn<TreatmentListItem>> = [
    {
      header: 'ID',
      render: (item) => item.id,
    },
    {
      header: 'Client',
      render: (item) => item.client_full_name,
    },
    {
      header: 'Title',
      render: (item) => item.title ?? 'N/A',
    },
    {
      header: 'Type/Site',
      render: (item) => item.type_and_site,
    },
    {
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Prescribed',
      render: (item) => item.prescribed_sessions,
    },
    {
      header: 'Completed',
      render: (item) => item.completed_sessions,
    },
    {
      header: 'Paid',
      render: (item) => (
        <Badge variant={item.is_paid ? 'success' : 'warning'}>{item.is_paid ? 'paid' : 'unpaid'}</Badge>
      ),
    },
    {
      header: 'Start Date',
      render: (item) => formatDate(item.start_date, 'yyyy-MM-dd'),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="card-header-between">
          <div>
            <CardTitle>Treatments</CardTitle>
            <p>Create from here or from the client detail page.</p>
          </div>
          {canCreateTreatment ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create Treatment
            </Button>
          ) : null}
        </CardHeader>
        <CardBody>
          <div className="toolbar">
            <Input
              label="Filter by client"
              placeholder="Client name"
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
            />
          </div>

          {treatmentsQuery.isLoading ? <p>Loading treatments...</p> : null}
          {treatmentsQuery.isError ? <p>Failed to load treatments.</p> : null}

          {!treatmentsQuery.isLoading && !treatmentsQuery.isError ? (
            <Table
              columns={columns}
              data={filteredTreatments}
              getRowKey={(item) => item.id}
              emptyMessage="No treatments found."
              onRowClick={(item) => navigate(`/treatments/${item.id}`)}
            />
          ) : null}
        </CardBody>
      </Card>

      <TreatmentCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
