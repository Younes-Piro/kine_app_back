import { z } from 'zod';

export const optionalEmail = z
  .string()
  .trim()
  .email('Invalid email format')
  .or(z.literal(''))
  .optional();

export const optionalDate = z.string().or(z.literal('')).optional();
