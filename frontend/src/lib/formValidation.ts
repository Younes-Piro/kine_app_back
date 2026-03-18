import type { FieldError, FieldErrors } from 'react-hook-form';
import { toast } from 'sonner';

function isFieldError(value: unknown): value is FieldError {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'message' in value;
}

function findFirstErrorMessage(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = findFirstErrorMessage(item);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (isFieldError(value)) {
    const message = value.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  if (typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) {
      const message = findFirstErrorMessage(child);
      if (message) {
        return message;
      }
    }
  }

  return null;
}

export function getFormValidationMessage(
  errors: FieldErrors,
  fallback = 'Please check the required fields and try again.',
) {
  return findFirstErrorMessage(errors) ?? fallback;
}

export function showFormValidationToast(errors: FieldErrors, _event?: unknown) {
  toast.error(getFormValidationMessage(errors));
}
