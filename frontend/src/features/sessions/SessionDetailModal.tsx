import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { sessionsApi } from '@/api/sessions';
import { AppOptionSelect } from '@/components/shared/AppOptionSelect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/http';
import type { Session, TreatmentListItem } from '@/types/api';

type SessionModalMode = 'create' | 'edit';

interface SessionDetailModalProps {
  open: boolean;
  mode: SessionModalMode;
  session?: Session | null;
  defaultTreatmentId?: number;
  treatments: TreatmentListItem[];
  onClose: () => void;
  onSaved: (session: Session) => void;
}

const sessionFormSchema = z.object({
  treatment: z.number().optional(),
  session_date: z.string().min(1, 'Session date is required'),
  status: z.number().optional(),
  notes: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function SessionDetailModal({
  open,
  mode,
  session,
  defaultTreatmentId,
  treatments,
  onClose,
  onSaved,
}: SessionDetailModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      treatment: defaultTreatmentId,
      session_date: '',
      status: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'edit' && session) {
      reset({
        treatment: session.treatment,
        session_date: session.session_date,
        status: session.status ?? undefined,
        notes: session.notes ?? '',
      });
      return;
    }

    reset({
      treatment: defaultTreatmentId,
      session_date: '',
      status: undefined,
      notes: '',
    });
  }, [defaultTreatmentId, mode, open, reset, session]);

  const saveMutation = useMutation({
    mutationFn: async (values: SessionFormValues) => {
      if (mode === 'edit' && session) {
        return sessionsApi.update(session.id, {
          session_date: values.session_date,
          status: values.status,
          notes: optionalText(values.notes),
        });
      }

      const treatmentId = values.treatment ?? defaultTreatmentId;
      if (!treatmentId) {
        setError('treatment', { type: 'manual', message: 'Treatment is required' });
        throw new Error('Treatment is required');
      }

      return sessionsApi.create({
        treatment: treatmentId,
        session_date: values.session_date,
        status: values.status,
        notes: optionalText(values.notes),
      });
    },
    onSuccess: (savedSession) => {
      toast.success(mode === 'edit' ? 'Session updated' : 'Session created');
      onSaved(savedSession);
      onClose();
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.message === 'Treatment is required') {
        return;
      }

      toast.error(getApiErrorMessage(error, 'Failed to save session'));
    },
  });

  const title = mode === 'edit' ? 'Session Detail' : 'Create Session';

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="session-form" isLoading={saveMutation.isPending}>
            {mode === 'edit' ? 'Save Changes' : 'Create Session'}
          </Button>
        </>
      }
    >
      <form id="session-form" className="stack" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
        {mode === 'create' ? (
          <div className="field">
            <label>Treatment</label>
            {treatments.length > 0 ? (
              <Controller
                control={control}
                name="treatment"
                render={({ field }) => (
                  <select
                    className="input"
                    value={field.value ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      field.onChange(raw ? Number(raw) : undefined);
                    }}
                  >
                    <option value="">Select treatment</option>
                    {treatments.map((treatment) => (
                      <option key={treatment.id} value={treatment.id}>
                        {treatment.client_full_name} - {treatment.title ?? treatment.type_and_site}
                      </option>
                    ))}
                  </select>
                )}
              />
            ) : (
              <Input
                type="number"
                placeholder="Treatment ID"
                {...register('treatment', { valueAsNumber: true })}
              />
            )}
            {errors.treatment ? <p className="field-error">{errors.treatment.message}</p> : null}
          </div>
        ) : (
          <div className="field">
            <label>Treatment</label>
            <p>
              {session?.treatment_title ?? session?.treatment_type_and_site} (ID: {session?.treatment})
            </p>
          </div>
        )}

        <Input
          label="Session Date"
          type="date"
          {...register('session_date')}
          error={errors.session_date?.message}
        />

        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <AppOptionSelect
              label="Status"
              category="session_status"
              value={field.value}
              onChange={(value) => field.onChange(value)}
              error={errors.status?.message}
            />
          )}
        />

        {mode === 'edit' ? (
          <div className="field">
            <label>Payment Status</label>
            <p>{session?.payment_status_label ?? 'N/A'} (read-only)</p>
          </div>
        ) : null}

        <div className="field">
          <label>Notes</label>
          <textarea className="input textarea" rows={3} {...register('notes')} />
          {errors.notes ? <p className="field-error">{errors.notes.message}</p> : null}
        </div>
      </form>
    </Modal>
  );
}
