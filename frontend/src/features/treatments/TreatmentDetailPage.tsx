import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { paymentsApi } from '@/api/payments';
import { queryKeys } from '@/api/queryKeys';
import { sessionsApi } from '@/api/sessions';
import { treatmentsApi } from '@/api/treatments';
import { AppOptionSelect } from '@/components/shared/AppOptionSelect';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table, type TableColumn } from '@/components/ui/Table';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatMoney } from '@/lib/formatters';
import { getApiErrorMessage } from '@/lib/http';
import type { Payment, TreatmentSession } from '@/types/api';

import { BalanceTab } from './BalanceTab';
import { TreatmentEditDialog } from './TreatmentEditDialog';

type DetailTab = 'sessions' | 'payments' | 'balance';

const paymentCreateSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((value) => Number(value) > 0, 'Amount must be greater than 0'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.number().optional(),
  notes: z.string().optional(),
});

type PaymentCreateValues = z.infer<typeof paymentCreateSchema>;

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function TreatmentDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const treatmentId = Number(params.id);

  const [activeTab, setActiveTab] = useState<DetailTab>('sessions');
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const canUpdateTreatment = hasPermission('treatment:update');
  const canDeleteTreatment = hasPermission('treatment:delete');
  const canUpdateSession = hasPermission('session:update');
  const canViewPayments = hasPermission('payment:view');
  const canCreatePayments = hasPermission('payment:create');

  const treatmentQuery = useQuery({
    queryKey: queryKeys.treatments.detail(treatmentId),
    queryFn: () => treatmentsApi.detail(treatmentId),
    enabled: Number.isFinite(treatmentId),
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.payments.byTreatment(treatmentId),
    queryFn: () => paymentsApi.list(treatmentId),
    enabled: Number.isFinite(treatmentId) && activeTab === 'payments' && canViewPayments,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PaymentCreateValues>({
    resolver: zodResolver(paymentCreateSchema),
    defaultValues: {
      amount: '',
      payment_date: '',
      notes: '',
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => treatmentsApi.deactivate(treatmentId),
    onSuccess: () => {
      toast.success('Treatment deactivated');
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.all });
      const clientId = treatmentQuery.data?.client;
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.treatments.byClient(clientId) });
      }
      navigate('/treatments', { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to deactivate treatment'));
    },
  });

  const markCompletedMutation = useMutation({
    mutationFn: (sessionId: number) => sessionsApi.markCompleted(sessionId),
    onSuccess: () => {
      toast.success('Session marked as completed');
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.detail(treatmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.balance(treatmentId) });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to mark session as completed'));
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (values: PaymentCreateValues) =>
      paymentsApi.create({
        treatment: treatmentId,
        amount: values.amount,
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        notes: optionalText(values.notes),
      }),
    onSuccess: () => {
      toast.success('Payment created');
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byTreatment(treatmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.detail(treatmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.balance(treatmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.all });
      const clientId = treatmentQuery.data?.client;
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.treatments.byClient(clientId) });
      }
      reset({ amount: '', payment_date: '', payment_method: undefined, notes: '' });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to create payment'));
    },
  });

  const sessionColumns: Array<TableColumn<TreatmentSession>> = useMemo(
    () => [
      {
        header: 'Date',
        render: (session) => formatDate(session.session_date, 'yyyy-MM-dd'),
      },
      {
        header: 'Session Status',
        render: (session) => <StatusBadge status={session.status_label?.toLowerCase()} />,
      },
      {
        header: 'Payment Status',
        render: (session) => <StatusBadge status={session.payment_status_label?.toLowerCase()} />,
      },
      {
        header: 'Notes',
        render: (session) => session.notes ?? 'N/A',
      },
      {
        header: 'Actions',
        render: (session) => {
          const isCompleted = session.status_label?.toLowerCase() === 'completed';

          if (!canUpdateSession) {
            return <span className="help-text">No action</span>;
          }

          return (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isCompleted}
              isLoading={
                markCompletedMutation.isPending && markCompletedMutation.variables === session.id
              }
              onClick={() => markCompletedMutation.mutate(session.id)}
            >
              {isCompleted ? 'Completed' : 'Mark completed'}
            </Button>
          );
        },
      },
    ],
    [canUpdateSession, markCompletedMutation],
  );

  const paymentColumns: Array<TableColumn<Payment>> = useMemo(
    () => [
      {
        header: 'Payment Date',
        render: (payment) => formatDate(payment.payment_date, 'yyyy-MM-dd'),
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
        render: (payment) => <StatusBadge status={payment.is_active ? 'completed' : 'cancelled'} />,
      },
      {
        header: 'Notes',
        render: (payment) => payment.notes ?? 'N/A',
      },
    ],
    [],
  );

  if (!Number.isFinite(treatmentId)) {
    return <p>Invalid treatment id.</p>;
  }

  if (treatmentQuery.isLoading) {
    return <p>Loading treatment details...</p>;
  }

  if (treatmentQuery.isError || !treatmentQuery.data) {
    return <p>Treatment not found.</p>;
  }

  const treatment = treatmentQuery.data;

  return (
    <>
      <Card>
        <CardHeader className="card-header-between">
          <div>
            <CardTitle>{treatment.title ?? treatment.type_and_site}</CardTitle>
            <p>{treatment.client_full_name}</p>
          </div>
          <div className="actions-inline">
            {canUpdateTreatment ? (
              <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            ) : null}
            {canDeleteTreatment ? (
              <Button
                type="button"
                variant="danger"
                disabled={!treatment.is_active}
                onClick={() => setDeactivateOpen(true)}
              >
                Deactivate
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardBody>
          <div className="detail-grid">
            <div className="metric-card">
              <h4>Status</h4>
              <StatusBadge status={treatment.status} />
            </div>
            <div className="metric-card">
              <h4>Sessions</h4>
              <p>
                {treatment.completed_sessions} / {treatment.prescribed_sessions} completed
              </p>
            </div>
            <div className="metric-card">
              <h4>Session Price</h4>
              <p>{formatMoney(treatment.session_price)}</p>
            </div>
            <div className="metric-card">
              <h4>Remaining</h4>
              <p>{formatMoney(treatment.total_remaining_amount)}</p>
            </div>
          </div>

          <div className="tabs-row">
            <button
              type="button"
              className={activeTab === 'sessions' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('sessions')}
            >
              Sessions
            </button>
            <button
              type="button"
              className={activeTab === 'payments' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('payments')}
            >
              Payments
            </button>
            <button
              type="button"
              className={activeTab === 'balance' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('balance')}
            >
              Balance
            </button>
          </div>

          {activeTab === 'sessions' ? (
            <Table
              columns={sessionColumns}
              data={treatment.sessions}
              getRowKey={(session) => session.id}
              emptyMessage="No sessions found."
            />
          ) : null}

          {activeTab === 'payments' ? (
            <div className="stack">
              {canViewPayments ? (
                <>
                  {canCreatePayments ? (
                    <form
                      className="stack"
                      onSubmit={handleSubmit((values) => createPaymentMutation.mutate(values))}
                    >
                      <div className="grid-2">
                        <Input
                          label="Amount"
                          type="number"
                          step="0.01"
                          min="0"
                          {...register('amount')}
                          error={errors.amount?.message}
                        />
                        <Input
                          label="Payment Date"
                          type="date"
                          {...register('payment_date')}
                          error={errors.payment_date?.message}
                        />

                        <Controller
                          control={control}
                          name="payment_method"
                          render={({ field }) => (
                            <AppOptionSelect
                              label="Payment Method"
                              category="payment_method"
                              value={field.value}
                              onChange={(value) => field.onChange(value)}
                              error={errors.payment_method?.message}
                            />
                          )}
                        />
                      </div>

                      <div className="field">
                        <label>Notes</label>
                        <textarea className="input textarea" rows={2} {...register('notes')} />
                      </div>

                      <div className="actions-row">
                        <Button type="submit" isLoading={createPaymentMutation.isPending}>
                          Add Payment
                        </Button>
                      </div>
                    </form>
                  ) : null}

                  {paymentsQuery.isLoading ? <p>Loading payments...</p> : null}
                  {paymentsQuery.isError ? <p>Failed to load payments.</p> : null}
                  {paymentsQuery.data ? (
                    <Table
                      columns={paymentColumns}
                      data={paymentsQuery.data}
                      getRowKey={(payment) => payment.id}
                      emptyMessage="No payments for this treatment."
                    />
                  ) : null}
                </>
              ) : (
                <p>You do not have permission to view payments.</p>
              )}
            </div>
          ) : null}

          {activeTab === 'balance' ? <BalanceTab treatmentId={treatment.id} /> : null}
        </CardBody>
      </Card>

      <TreatmentEditDialog open={editOpen} treatment={treatment} onClose={() => setEditOpen(false)} />

      <ConfirmDialog
        open={deactivateOpen}
        title="Deactivate treatment"
        message="This will deactivate scheduled sessions and linked payments. Continue?"
        confirmText="Deactivate"
        isLoading={deactivateMutation.isPending}
        onCancel={() => setDeactivateOpen(false)}
        onConfirm={() => deactivateMutation.mutate()}
      />
    </>
  );
}
