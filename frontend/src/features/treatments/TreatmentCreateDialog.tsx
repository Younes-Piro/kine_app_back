import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { clientsApi } from '@/api/clients';
import { queryKeys } from '@/api/queryKeys';
import { treatmentsApi } from '@/api/treatments';
import { AppOptionSelect } from '@/components/shared/AppOptionSelect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/http';

const treatmentCreateSchema = z.object({
  client: z.number().optional(),
  title: z.string().optional(),
  treating_doctor: z.string().optional(),
  diagnosis: z.string().optional(),
  type_and_site: z.string().trim().min(1, 'Type and site is required'),
  prescribed_sessions: z.number().int().min(1, 'Prescribed sessions must be at least 1'),
  session_rhythm: z.number({ required_error: 'Session rhythm is required' }),
  start_date: z.string().min(1, 'Start date is required'),
  session_price: z
    .string()
    .min(1, 'Session price is required')
    .refine((value) => Number(value) > 0, 'Session price must be greater than 0'),
  notes: z.string().optional(),
});

type TreatmentCreateValues = z.infer<typeof treatmentCreateSchema>;

interface TreatmentCreateDialogProps {
  open: boolean;
  clientId?: number;
  onClose: () => void;
}

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function TreatmentCreateDialog({ open, clientId, onClose }: TreatmentCreateDialogProps) {
  const queryClient = useQueryClient();

  const clientsQuery = useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: clientsApi.list,
    enabled: open && !clientId,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<TreatmentCreateValues>({
    resolver: zodResolver(treatmentCreateSchema),
    defaultValues: {
      client: clientId,
      title: '',
      treating_doctor: '',
      diagnosis: '',
      type_and_site: '',
      prescribed_sessions: 1,
      start_date: '',
      session_price: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      client: clientId,
      title: '',
      treating_doctor: '',
      diagnosis: '',
      type_and_site: '',
      prescribed_sessions: 1,
      start_date: '',
      session_price: '',
      notes: '',
    });
  }, [clientId, open, reset]);

  const createMutation = useMutation({
    mutationFn: (values: TreatmentCreateValues) => {
      const selectedClientId = clientId ?? values.client;
      if (!selectedClientId) {
        setError('client', { type: 'manual', message: 'Client is required' });
        return Promise.reject(new Error('Client is required'));
      }

      return treatmentsApi.create({
        client: selectedClientId,
        title: optionalText(values.title),
        treating_doctor: optionalText(values.treating_doctor),
        diagnosis: optionalText(values.diagnosis),
        type_and_site: values.type_and_site,
        prescribed_sessions: values.prescribed_sessions,
        session_rhythm: values.session_rhythm,
        start_date: values.start_date,
        session_price: values.session_price,
        notes: optionalText(values.notes),
      });
    },
    onSuccess: () => {
      toast.success('Treatment created successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.all });
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.treatments.byClient(clientId) });
      }
      onClose();
      reset();
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.message === 'Client is required') {
        return;
      }
      toast.error(getApiErrorMessage(error, 'Failed to create treatment'));
    },
  });

  return (
    <Modal
      open={open}
      title="Create Treatment"
      onClose={() => {
        onClose();
        reset();
      }}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onClose();
              reset();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="treatment-create-form" isLoading={createMutation.isPending}>
            Create Treatment
          </Button>
        </>
      }
    >
      <form id="treatment-create-form" className="stack" onSubmit={handleSubmit((values) => createMutation.mutate(values))}>
        {!clientId ? (
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
        ) : null}

        <div className="grid-2">
          <Input label="Title" {...register('title')} error={errors.title?.message} />
          <Input
            label="Treating Doctor"
            {...register('treating_doctor')}
            error={errors.treating_doctor?.message}
          />

          <Input
            label="Type and Site"
            {...register('type_and_site')}
            error={errors.type_and_site?.message}
          />
          <Input
            label="Prescribed Sessions"
            type="number"
            min={1}
            {...register('prescribed_sessions', { valueAsNumber: true })}
            error={errors.prescribed_sessions?.message}
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
            label="Start Date"
            type="date"
            {...register('start_date')}
            error={errors.start_date?.message}
          />

          <Input
            label="Session Price"
            type="number"
            min="0"
            step="0.01"
            {...register('session_price')}
            error={errors.session_price?.message}
          />
        </div>

        <div className="field">
          <label>Diagnosis</label>
          <textarea className="input textarea" rows={3} {...register('diagnosis')} />
          {errors.diagnosis ? <p className="field-error">{errors.diagnosis.message}</p> : null}
        </div>

        <div className="field">
          <label>Notes</label>
          <textarea className="input textarea" rows={3} {...register('notes')} />
          {errors.notes ? <p className="field-error">{errors.notes.message}</p> : null}
        </div>
      </form>
    </Modal>
  );
}
