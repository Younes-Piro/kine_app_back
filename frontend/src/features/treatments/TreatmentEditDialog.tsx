import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { queryKeys } from '@/api/queryKeys';
import { treatmentsApi } from '@/api/treatments';
import { AppOptionSelect } from '@/components/shared/AppOptionSelect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { showFormValidationToast } from '@/lib/formValidation';
import { getApiErrorMessage } from '@/lib/http';
import type { TreatmentDetail } from '@/types/api';

const treatmentEditSchema = z.object({
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
  status: z.enum(['open', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

type TreatmentEditValues = z.infer<typeof treatmentEditSchema>;

interface TreatmentEditDialogProps {
  open: boolean;
  treatment: TreatmentDetail;
  onClose: () => void;
}

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function TreatmentEditDialog({ open, treatment, onClose }: TreatmentEditDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TreatmentEditValues>({
    resolver: zodResolver(treatmentEditSchema),
    defaultValues: {
      title: '',
      treating_doctor: '',
      diagnosis: '',
      type_and_site: '',
      prescribed_sessions: 1,
      session_rhythm: undefined,
      start_date: '',
      session_price: '',
      status: 'open',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      title: treatment.title ?? '',
      treating_doctor: treatment.treating_doctor ?? '',
      diagnosis: treatment.diagnosis ?? '',
      type_and_site: treatment.type_and_site,
      prescribed_sessions: treatment.prescribed_sessions,
      session_rhythm: treatment.session_rhythm ?? undefined,
      start_date: treatment.start_date,
      session_price: treatment.session_price,
      status: treatment.status,
      notes: treatment.notes ?? '',
    });
  }, [open, reset, treatment]);

  const updateMutation = useMutation({
    mutationFn: (values: TreatmentEditValues) =>
      treatmentsApi.update(treatment.id, {
        title: optionalText(values.title),
        treating_doctor: optionalText(values.treating_doctor),
        diagnosis: optionalText(values.diagnosis),
        type_and_site: values.type_and_site,
        prescribed_sessions: values.prescribed_sessions,
        session_rhythm: values.session_rhythm,
        start_date: values.start_date,
        session_price: values.session_price,
        status: values.status,
        notes: optionalText(values.notes),
      }),
    onSuccess: () => {
      toast.success('Treatment updated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.byClient(treatment.client) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.detail(treatment.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.balance(treatment.id) });
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to update treatment'));
    },
  });

  return (
    <Modal
      open={open}
      title="Edit Treatment"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="treatment-edit-form" isLoading={updateMutation.isPending}>
            Save Changes
          </Button>
        </>
      }
    >
      <form
        id="treatment-edit-form"
        className="stack"
        onSubmit={handleSubmit((values) => updateMutation.mutate(values), showFormValidationToast)}
      >
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

          <div className="field">
            <label>Status</label>
            <select className="input" {...register('status')}>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {errors.status ? <p className="field-error">{errors.status.message}</p> : null}
          </div>
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
