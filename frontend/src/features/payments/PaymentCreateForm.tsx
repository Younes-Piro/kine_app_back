import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { paymentsApi } from '@/api/payments';
import { AppOptionSelect } from '@/components/shared/AppOptionSelect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatMoney } from '@/lib/formatters';
import { showFormValidationToast } from '@/lib/formValidation';
import { getApiErrorMessage } from '@/lib/http';
import type { Payment } from '@/types/api';

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

interface PaymentCreateFormProps {
  treatmentId: number;
  maxRemainingAmount: string;
  balanceAmount: string;
  onCreated: (payment: Payment) => void;
}

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function PaymentCreateForm({
  treatmentId,
  maxRemainingAmount,
  balanceAmount,
  onCreated,
}: PaymentCreateFormProps) {
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
      payment_method: undefined,
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
    onSuccess: (createdPayment) => {
      toast.success('Payment created');
      onCreated(createdPayment);
      reset({ amount: '', payment_date: '', payment_method: undefined, notes: '' });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to create payment'));
    },
  });

  return (
    <form
      className="stack"
      onSubmit={handleSubmit((values) => createPaymentMutation.mutate(values), showFormValidationToast)}
    >
      <p className="help-text">
        Remaining amount: {formatMoney(maxRemainingAmount)}
        {' · '}
        Balance: {formatMoney(balanceAmount)}
        {' · '}
        Backend ceiling rule applies.
      </p>

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
  );
}
