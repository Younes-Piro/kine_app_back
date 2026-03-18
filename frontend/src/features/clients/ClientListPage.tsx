import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { clientsApi } from '@/api/clients';
import { queryKeys } from '@/api/queryKeys';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table, type TableColumn } from '@/components/ui/Table';
import { usePermissions } from '@/hooks/usePermissions';
import { formatMoney } from '@/lib/formatters';
import { getApiErrorMessage } from '@/lib/http';
import type { Client } from '@/types/api';

export function ClientListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState('');
  const [deactivateClient, setDeactivateClient] = useState<Client | null>(null);

  const canCreate = hasPermission('client:create');
  const canDeactivate = hasPermission('client:delete');

  const clientsQuery = useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: clientsApi.list,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => clientsApi.deactivate(id),
    onSuccess: () => {
      toast.success('Client deactivated');
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      setDeactivateClient(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to deactivate client'));
    },
  });

  const filteredClients = useMemo(() => {
    const items = clientsQuery.data ?? [];
    if (!search.trim()) {
      return items;
    }

    const normalized = search.toLowerCase();
    return items.filter((client) => {
      return (
        client.full_name.toLowerCase().includes(normalized) ||
        client.file_number.toLowerCase().includes(normalized) ||
        client.phone_number?.toLowerCase().includes(normalized) ||
        client.email?.toLowerCase().includes(normalized)
      );
    });
  }, [clientsQuery.data, search]);

  const columns: Array<TableColumn<Client>> = [
    {
      header: 'File #',
      render: (client) => client.file_number,
    },
    {
      header: 'Full Name',
      render: (client) => client.full_name,
    },
    {
      header: 'Phone',
      render: (client) => client.phone_number ?? 'N/A',
    },
    {
      header: 'Email',
      render: (client) => client.email ?? 'N/A',
    },
    {
      header: 'Dossier Type',
      render: (client) => client.dossier_type_label ?? 'N/A',
    },
    {
      header: 'Balance',
      render: (client) => formatMoney(client.balance),
    },
    {
      header: 'Status',
      render: (client) => (
        <Badge variant={client.is_active ? 'success' : 'danger'}>
          {client.is_active ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (client) => (
        <div className="actions-inline" onClick={(event) => event.stopPropagation()}>
          {canDeactivate ? (
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() => setDeactivateClient(client)}
              disabled={!client.is_active}
            >
              Deactivate
            </Button>
          ) : (
            <span className="help-text">No action</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="card-header-between">
          <CardTitle>Clients</CardTitle>
          {canCreate ? (
            <Button type="button" onClick={() => navigate('/clients/new')}>
              New Client
            </Button>
          ) : null}
        </CardHeader>
        <CardBody>
          <div className="toolbar">
            <Input
              placeholder="Search by name, file number, email, phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {clientsQuery.isLoading ? <p>Loading clients...</p> : null}
          {clientsQuery.isError ? <p>Failed to load clients.</p> : null}

          {!clientsQuery.isLoading && !clientsQuery.isError ? (
            <Table
              columns={columns}
              data={filteredClients}
              getRowKey={(client) => client.id}
              emptyMessage="No clients found."
              onRowClick={(client) => navigate(`/clients/${client.id}`)}
            />
          ) : null}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={Boolean(deactivateClient)}
        title="Deactivate client"
        message={`Deactivate ${deactivateClient?.full_name}? This will cascade to treatments, sessions and payments.`}
        confirmText="Deactivate"
        isLoading={deactivateMutation.isPending}
        onCancel={() => setDeactivateClient(null)}
        onConfirm={() => {
          if (deactivateClient) {
            deactivateMutation.mutate(deactivateClient.id);
          }
        }}
      />
    </>
  );
}
