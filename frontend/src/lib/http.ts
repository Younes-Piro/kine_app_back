import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const payload = error.response?.data as Record<string, unknown> | undefined;
  const detail = payload?.detail;
  if (typeof detail === 'string' && detail.length > 0) {
    return detail;
  }

  const nonFieldErrors = payload?.non_field_errors;
  if (Array.isArray(nonFieldErrors) && typeof nonFieldErrors[0] === 'string') {
    return nonFieldErrors[0];
  }

  if (payload && typeof payload === 'object') {
    const firstField = Object.keys(payload)[0];
    const firstValue = payload[firstField];
    if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
      return firstValue[0];
    }
    if (typeof firstValue === 'string') {
      return firstValue;
    }
  }

  if (typeof error.response?.data === 'string') {
    return error.response.data;
  }

  return fallback;
}
