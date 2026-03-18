import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { paymentsApi } from '@/api/payments';
import { queryKeys } from '@/api/queryKeys';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, type TableColumn } from '@/components/ui/Table';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatMoney } from '@/lib/formatters';
import { getApiErrorMessage } from '@/lib/http';
import type { Payment } from '@/types/api';

export function PaymentListPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const [treatmentFilter, setTreatmentFilter] = useState<number | undefined>();
  const [deactivatePayment, setDeactivatePayment] = useState<Payment | null>(null);

  const canDeactivatePayment = hasPermission('payment:delete');

  const paymentsQuery = useQuery({
    queryKey: treatmentFilter
      ? queryKeys.payments.byTreatment(treatmentFilter)
      : queryKeys.payments.all,
    queryFn: () => paymentsApi.list(treatmentFilter),
  });

  const allPaymentsQuery = useQuery({
    queryKey: queryKeys.payments.all,
    queryFn: () => paymentsApi.list(),
    enabled: Boolean(treatmentFilter),
    staleTime: 60_000,
  });

  const optionSource = treatmentFilter
    ? (allPaymentsQuery.data ?? paymentsQuery.data ?? [])
    : (paymentsQuery.data ?? []);

  const treatmentOptions = useMemo(() => {
    const map = new Map<number, string>();

    optionSource.forEach((payment) => {
      const treatmentLabel = payment.treatment_title ?? `Treatment #${payment.treatment}`;
      if (!map.has(payment.treatment)) {
        map.set(payment.treatment, `${payment.client_full_name} - ${treatmentLabel}`);
      }
    });

    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [optionSource]);

  const deactivateMutation = useMutation({
    mutationFn: (payment: Payment) => paymentsApi.deactivate(payment.id),
    onSuccess: (_response, payment) => {
      toast.success('Payment deactivated');
      setDeactivatePayment(null);

      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byTreatment(payment.treatment) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.detail(payment.treatment) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.balance(payment.treatment) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byTreatment(payment.treatment) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to deactivate payment'));
    },
  });

  const columns: Array<TableColumn<Payment>> = [
    {
      header: 'Payment Date',
      render: (payment) => formatDate(payment.payment_date, 'yyyy-MM-dd'),
    },
    {
      header: 'Client',
      render: (payment) => payment.client_full_name,
    },
    {
      header: 'Treatment',
      render: (payment) => payment.treatment_title ?? `Treatment #${payment.treatment}`,
    },
    {
      header: 'Amount',
      render: (payment) => formatMoney(payment.amount),
    },
    {
      header: 'Method',
      render: (payment) => payment.payment_method_label ?? 'N/A',
    },
    {
      header: 'Status',
      render: (payment) => (
        <StatusBadge status={payment.is_active ? 'completed' : 'cancelled'} />
      ),
    },
    {
      header: 'Actions',
      render: (payment) => {
        if (!canDeactivatePayment) {
          return <span className="help-text">No action</span>;
        }

        return (
          <div className="actions-inline" onClick={(event) => event.stopPropagation()}>
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={!payment.is_active}
              onClick={() => setDeactivatePayment(payment)}
            >
              Deactivate
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="card-header-between">
          <div>
            <CardTitle>Payments</CardTitle>
            <p>Manage and deactivate payments.</p>
          </div>

          <div className="field" style={{ minWidth: 300 }}>
            <label>Filter by Treatment</label>
            <select
              className="input"
              value={treatmentFilter ?? ''}
              onChange={(event) => {
                const raw = event.target.value;
                setTreatmentFilter(raw ? Number(raw) : undefined);
              }}
            >
              <option value="">All treatments</option>
              {treatmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardBody>
          {paymentsQuery.isLoading ? <p>Loading payments...</p> : null}
          {paymentsQuery.isError ? <p>Failed to load payments.</p> : null}

          {!paymentsQuery.isLoading && !paymentsQuery.isError ? (
            <Table
              columns={columns}
              data={paymentsQuery.data ?? []}
              getRowKey={(payment) => payment.id}
              emptyMessage="No payments found."
            />
          ) : null}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={Boolean(deactivatePayment)}
        title="Deactivate payment"
        message={`Deactivate this payment of ${formatMoney(deactivatePayment?.amount ?? 0)}?`}
        confirmText="Deactivate"
        isLoading={deactivateMutation.isPending}
        onCancel={() => setDeactivatePayment(null)}
        onConfirm={() => {
          if (deactivatePayment) {
            deactivateMutation.mutate(deactivatePayment);
          }
        }}
      />
    </>
  );
}
