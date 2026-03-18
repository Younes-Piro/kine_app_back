import { z } from 'zod';

import type { ClientCreateRequest } from '@/types/api';

export const clientFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  gender: z.number().optional(),
  cin: z.string().optional(),
  birth_date: z.string().optional(),
  email: z
    .string()
    .trim()
    .email('Invalid email format')
    .or(z.literal(''))
    .optional(),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  marital_status: z.number().optional(),
  social_security: z.number().optional(),
  dossier_type: z.number().optional(),
  balance: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(value)), 'Balance must be numeric'),
  profile_photo: z.custom<File | undefined>(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

function optionalString(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function toClientPayload(values: ClientFormValues): ClientCreateRequest {
  return {
    full_name: values.full_name,
    gender: values.gender,
    cin: optionalString(values.cin),
    birth_date: optionalString(values.birth_date),
    email: optionalString(values.email),
    phone_number: optionalString(values.phone_number),
    address: optionalString(values.address),
    marital_status: values.marital_status,
    social_security: values.social_security,
    dossier_type: values.dossier_type,
    balance: optionalString(values.balance),
    profile_photo: values.profile_photo,
  };
}
