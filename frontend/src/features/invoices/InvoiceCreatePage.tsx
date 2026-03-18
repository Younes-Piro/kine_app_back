import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { clientsApi } from '@/api/clients';
import { invoicesApi } from '@/api/invoices';
import { queryKeys } from '@/api/queryKeys';
import { AppOptionSelect } from '@/components/shared/AppOptionSelect';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatMoney } from '@/lib/formatters';
import { showFormValidationToast } from '@/lib/formValidation';
import { getApiErrorMessage } from '@/lib/http';

const invoiceCreateSchema = z.object({
  client: z.number({ required_error: 'Client is required' }),
  invoice_type: z.number({ required_error: 'Invoice type is required' }),
  issue_date: z.string().optional(),
  diagnosis: z.string().optional(),
  type_and_site: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  number_of_sessions: z.number().int().min(1, 'Number of sessions must be greater than 0'),
  session_rhythm: z.number({ required_error: 'Session rhythm is required' }),
  unit_price: z
    .string()
    .min(1, 'Unit price is required')
    .refine((value) => Number(value) > 0, 'Unit price must be greater than 0'),
  notes: z.string().optional(),
});

type InvoiceCreateValues = z.infer<typeof invoiceCreateSchema>;

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function InvoiceCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const clientsQuery = useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: clientsApi.list,
  });

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceCreateValues>({
    resolver: zodResolver(invoiceCreateSchema),
    defaultValues: {
      issue_date: new Date().toISOString().slice(0, 10),
      diagnosis: '',
      type_and_site: '',
      start_date: '',
      number_of_sessions: 1,
      unit_price: '',
      notes: '',
    },
  });

  const numberOfSessions = watch('number_of_sessions');
  const unitPrice = watch('unit_price');
  const totalPreview = useMemo(() => {
    const sessions = Number(numberOfSessions ?? 0);
    const price = Number(unitPrice ?? 0);
    if (!Number.isFinite(sessions) || !Number.isFinite(price) || sessions <= 0 || price <= 0) {
      return 0;
    }
    return sessions * price;
  }, [numberOfSessions, unitPrice]);

  const createMutation = useMutation({
    mutationFn: (values: InvoiceCreateValues) =>
      invoicesApi.create({
        client: values.client,
        invoice_type: values.invoice_type,
        issue_date: optionalText(values.issue_date),
        diagnosis: optionalText(values.diagnosis),
        type_and_site: optionalText(values.type_and_site),
        start_date: values.start_date,
        number_of_sessions: values.number_of_sessions,
        session_rhythm: values.session_rhythm,
        unit_price: values.unit_price,
        notes: optionalText(values.notes),
      }),
    onSuccess: (createdInvoice) => {
      toast.success('Invoice created');
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.byClient(createdInvoice.client) });
      navigate(`/invoices/${createdInvoice.id}`, { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to create invoice'));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Invoice</CardTitle>
        <p>Fill invoice snapshot data and submit.</p>
      </CardHeader>

      <CardBody>
        <form
          className="stack"
          onSubmit={handleSubmit((values) => createMutation.mutate(values), showFormValidationToast)}
        >
          <div className="grid-2">
            <div className="field">
              <label>Client</label>
              <Controller
                control={control}
                name="client"
                render={({ field }) => (
                  <select
                    className="input"
                    value={field.value ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      field.onChange(raw ? Number(raw) : undefined);
                    }}
                  >
                    <option value="">
                      {clientsQuery.isLoading ? 'Loading clients...' : 'Select client'}
                    </option>
                    {(clientsQuery.data ?? []).map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.file_number} - {client.full_name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.client ? <p className="field-error">{errors.client.message}</p> : null}
            </div>

            <Controller
              control={control}
              name="invoice_type"
              render={({ field }) => (
                <AppOptionSelect
                  label="Invoice Type"
                  category="invoice_type"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  error={errors.invoice_type?.message}
                />
              )}
            />

            <Input
              label="Issue Date"
              type="date"
              {...register('issue_date')}
              error={errors.issue_date?.message}
            />

            <Input
              label="Start Date"
              type="date"
              {...register('start_date')}
              error={errors.start_date?.message}
            />

            <Input
              label="Number of Sessions"
              type="number"
              min={1}
              {...register('number_of_sessions', { valueAsNumber: true })}
              error={errors.number_of_sessions?.message}
            />

            <Controller
              control={control}
              name="session_rhythm"
              render={({ field }) => (
                <AppOptionSelect
                  label="Session Rhythm"
                  category="session_rhythm"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  error={errors.session_rhythm?.message}
                />
              )}
            />

            <Input
              label="Unit Price"
              type="number"
              min="0"
              step="0.01"
              {...register('unit_price')}
              error={errors.unit_price?.message}
            />

            <Input
              label="Diagnosis"
              {...register('diagnosis')}
              error={errors.diagnosis?.message}
            />

            <Input
              label="Type and Site"
              {...register('type_and_site')}
              error={errors.type_and_site?.message}
            />
          </div>

          <div className="field">
            <label>Notes</label>
            <textarea className="input textarea" rows={3} {...register('notes')} />
          </div>

          <div className="metric-card">
            <h4>Total Amount Preview</h4>
            <strong>{formatMoney(totalPreview)}</strong>
          </div>

          <div className="actions-row">
            <Button type="button" variant="ghost" onClick={() => navigate('/invoices')}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Invoice
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
