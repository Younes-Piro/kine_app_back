import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { clientsApi } from '@/api/clients';
import { invoicesApi } from '@/api/invoices';
import { queryKeys } from '@/api/queryKeys';
import { treatmentsApi } from '@/api/treatments';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, type TableColumn } from '@/components/ui/Table';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatMoney, resolveMediaUrl } from '@/lib/formatters';
import { getApiErrorMessage } from '@/lib/http';
import type { InvoiceListItem, TreatmentListItem } from '@/types/api';

import { TreatmentCreateDialog } from '../treatments/TreatmentCreateDialog';

type DetailTab = 'info' | 'treatments' | 'invoices';

export function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const clientId = Number(params.id);
  const [tab, setTab] = useState<DetailTab>('info');
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [createTreatmentOpen, setCreateTreatmentOpen] = useState(false);

  const canEdit = hasPermission('client:update');
  const canDeactivate = hasPermission('client:delete');
  const canCreateTreatment = hasPermission('treatment:create');
  const canViewTreatments = hasPermission('treatment:view');
  const canViewInvoices = hasPermission('invoice:view');

  const clientQuery = useQuery({
    queryKey: queryKeys.clients.detail(clientId),
    queryFn: () => clientsApi.detail(clientId),
    enabled: Number.isFinite(clientId),
  });

  const treatmentsQuery = useQuery({
    queryKey: queryKeys.treatments.byClient(clientId),
    queryFn: () => treatmentsApi.list(clientId),
    enabled: Number.isFinite(clientId) && tab === 'treatments' && canViewTreatments,
  });

  const invoicesQuery = useQuery({
    queryKey: queryKeys.invoices.byClient(clientId),
    queryFn: () => invoicesApi.list({ clientId }),
    enabled: Number.isFinite(clientId) && tab === 'invoices' && canViewInvoices,
  });

  const deactivateMutation = useMutation({
    mutationFn: () => clientsApi.deactivate(clientId),
    onSuccess: () => {
      toast.success('Client deactivated');
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      navigate('/clients', { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to deactivate client'));
    },
  });

  const treatmentColumns: Array<TableColumn<TreatmentListItem>> = useMemo(
    () => [
      { header: 'Title', render: (item) => item.title ?? item.type_and_site },
      { header: 'Type/Site', render: (item) => item.type_and_site },
      { header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
      {
        header: 'Sessions',
        render: (item) => `${item.completed_sessions}/${item.prescribed_sessions}`,
      },
      {
        header: 'Price',
        render: (item) => formatMoney(item.total_price),
      },
      {
        header: 'Remaining',
        render: (item) => formatMoney(item.total_remaining_amount),
      },
      {
        header: 'Start Date',
        render: (item) => formatDate(item.start_date, 'yyyy-MM-dd'),
      },
    ],
    [],
  );

  const invoiceColumns: Array<TableColumn<InvoiceListItem>> = useMemo(
    () => [
      { header: 'Invoice #', render: (item) => item.invoice_number },
      { header: 'Type', render: (item) => item.invoice_type_text },
      { header: 'Issue Date', render: (item) => formatDate(item.issue_date) },
      { header: 'Total', render: (item) => formatMoney(item.total_amount) },
    ],
    [],
  );

  if (!Number.isFinite(clientId)) {
    return <p>Invalid client id.</p>;
  }

  if (clientQuery.isLoading) {
    return <p>Loading client details...</p>;
  }

  if (clientQuery.isError || !clientQuery.data) {
    return <p>Client not found.</p>;
  }

  const client = clientQuery.data;
  const photoUrl = resolveMediaUrl(client.profile_photo);

  return (
    <>
      <Card>
        <CardHeader className="card-header-between">
          <div>
            <CardTitle>{client.full_name}</CardTitle>
            <p>{client.file_number}</p>
          </div>
          <div className="actions-inline">
            {canEdit ? (
              <Button type="button" variant="secondary" onClick={() => navigate(`/clients/${client.id}/edit`)}>
                Edit
              </Button>
            ) : null}
            {canDeactivate ? (
              <Button
                type="button"
                variant="danger"
                disabled={!client.is_active}
                onClick={() => setDeactivateOpen(true)}
              >
                Deactivate
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardBody>
          <div className="tabs-row">
            <button
              type="button"
              className={tab === 'info' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setTab('info')}
            >
              Info
            </button>
            {canViewTreatments ? (
              <button
                type="button"
                className={tab === 'treatments' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setTab('treatments')}
              >
                Treatments
              </button>
            ) : null}
            {canViewInvoices ? (
              <button
                type="button"
                className={tab === 'invoices' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setTab('invoices')}
              >
                Invoices
              </button>
            ) : null}
          </div>

          {tab === 'info' ? (
            <div className="client-info-grid">
              <div>
                <h4>Contact</h4>
                <p>Email: {client.email ?? 'N/A'}</p>
                <p>Phone: {client.phone_number ?? 'N/A'}</p>
                <p>Address: {client.address ?? 'N/A'}</p>
              </div>
              <div>
                <h4>Administrative</h4>
                <p>Gender: {client.gender_label ?? 'N/A'}</p>
                <p>Marital: {client.marital_status_label ?? 'N/A'}</p>
                <p>Social Security: {client.social_security_label ?? 'N/A'}</p>
                <p>Dossier Type: {client.dossier_type_label ?? 'N/A'}</p>
              </div>
              <div>
                <h4>Finance</h4>
                <p>Balance: {formatMoney(client.balance)}</p>
                <p>Status: <StatusBadge status={client.is_active ? 'completed' : 'cancelled'} /></p>
                <p>Created: {formatDate(client.created_at)}</p>
                <p>Updated: {formatDate(client.updated_at)}</p>
              </div>
              <div>
                <h4>Profile Photo</h4>
                {photoUrl ? (
                  <img className="client-photo-preview" src={photoUrl} alt={client.full_name} />
                ) : (
                  <p>No photo</p>
                )}
              </div>
            </div>
          ) : null}

          {tab === 'treatments' ? (
            <>
              {canViewTreatments ? (
                <>
                  <div className="actions-row">
                    {canCreateTreatment ? (
                      <Button type="button" onClick={() => setCreateTreatmentOpen(true)}>
                        Add Treatment
                      </Button>
                    ) : null}
                  </div>
                  {treatmentsQuery.isLoading ? <p>Loading treatments...</p> : null}
                  {treatmentsQuery.isError ? <p>Failed to load treatments.</p> : null}
                  {treatmentsQuery.data ? (
                    <Table
                      columns={treatmentColumns}
                      data={treatmentsQuery.data}
                      getRowKey={(item) => item.id}
                      emptyMessage="No treatments for this client."
                      onRowClick={(item) => navigate(`/treatments/${item.id}`)}
                    />
                  ) : null}
                </>
              ) : (
                <p>You do not have permission to view treatments.</p>
              )}
            </>
          ) : null}

          {tab === 'invoices' ? (
            <>
              {canViewInvoices ? (
                <>
                  {invoicesQuery.isLoading ? <p>Loading invoices...</p> : null}
                  {invoicesQuery.isError ? <p>Failed to load invoices.</p> : null}
                  {invoicesQuery.data ? (
                    <Table
                      columns={invoiceColumns}
                      data={invoicesQuery.data}
                      getRowKey={(item) => item.id}
                      emptyMessage="No invoices for this client."
                    />
                  ) : null}
                </>
              ) : (
                <p>You do not have permission to view invoices.</p>
              )}
            </>
          ) : null}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={deactivateOpen}
        title="Deactivate client"
        message="This will deactivate related treatments, sessions, and payments. Continue?"
        confirmText="Deactivate"
        isLoading={deactivateMutation.isPending}
        onCancel={() => setDeactivateOpen(false)}
        onConfirm={() => deactivateMutation.mutate()}
      />

      <TreatmentCreateDialog
        open={createTreatmentOpen}
        clientId={client.id}
        onClose={() => setCreateTreatmentOpen(false)}
      />
    </>
  );
}
