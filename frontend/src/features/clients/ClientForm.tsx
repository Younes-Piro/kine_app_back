import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { AppOptionSelect } from '@/components/shared/AppOptionSelect';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { resolveMediaUrl } from '@/lib/formatters';

import { clientFormSchema, type ClientFormValues } from './clientFormSchema';

interface ClientFormProps {
  title: string;
  submitLabel: string;
  defaultValues?: Partial<ClientFormValues>;
  existingPhoto?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: ClientFormValues) => void;
}

const DEFAULT_VALUES: ClientFormValues = {
  full_name: '',
  gender: undefined,
  cin: '',
  birth_date: '',
  email: '',
  phone_number: '',
  address: '',
  marital_status: undefined,
  social_security: undefined,
  dossier_type: undefined,
  balance: '',
  profile_photo: undefined,
};

export function ClientForm({
  title,
  submitLabel,
  defaultValues,
  existingPhoto,
  isSubmitting,
  onCancel,
  onSubmit,
}: ClientFormProps) {
  const mergedDefaults = useMemo(
    () => ({ ...DEFAULT_VALUES, ...defaultValues }),
    [defaultValues],
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: mergedDefaults,
  });

  const selectedFile = watch('profile_photo');
  const existingPhotoUrl = resolveMediaUrl(existingPhoto);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <form className="stack" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid-2">
            <Input label="Full Name" {...register('full_name')} error={errors.full_name?.message} />
            <Input label="CIN" {...register('cin')} error={errors.cin?.message} />

            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <AppOptionSelect
                  label="Gender"
                  category="gender"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  error={errors.gender?.message}
                />
              )}
            />

            <Input
              label="Birth Date"
              type="date"
              {...register('birth_date')}
              error={errors.birth_date?.message}
            />

            <Input label="Email" {...register('email')} error={errors.email?.message} />
            <Input
              label="Phone Number"
              {...register('phone_number')}
              error={errors.phone_number?.message}
            />

            <Controller
              control={control}
              name="marital_status"
              render={({ field }) => (
                <AppOptionSelect
                  label="Marital Status"
                  category="marital_status"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  error={errors.marital_status?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="social_security"
              render={({ field }) => (
                <AppOptionSelect
                  label="Social Security"
                  category="social_security"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  error={errors.social_security?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="dossier_type"
              render={({ field }) => (
                <AppOptionSelect
                  label="Dossier Type"
                  category="dossier_type"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  error={errors.dossier_type?.message}
                />
              )}
            />

            <Input label="Balance" {...register('balance')} error={errors.balance?.message} />
          </div>

          <div className="field">
            <label>Address</label>
            <textarea className="input textarea" rows={4} {...register('address')} />
            {errors.address ? <p className="field-error">{errors.address.message}</p> : null}
          </div>

          <div className="field">
            <label>Profile Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setValue('profile_photo', file);
              }}
            />
            {selectedFile ? <p className="help-text">Selected file: {selectedFile.name}</p> : null}
            {!selectedFile && existingPhotoUrl ? (
              <img className="client-photo-preview" src={existingPhotoUrl} alt="Client" />
            ) : null}
          </div>

          <div className="actions-row">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
