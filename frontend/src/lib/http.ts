import axios from 'axios';

function sanitizeErrorMessage(message: string, fallback: string) {
  const normalized = message.trim();
  if (!normalized) {
    return fallback;
  }

  const lower = normalized.toLowerCase();
  const looksLikeHtml =
    lower.includes('<!doctype html') ||
    lower.includes('<html') ||
    lower.includes('<body') ||
    lower.includes('</html>');

  if (looksLikeHtml) {
    return fallback;
  }

  if (normalized.length > 220) {
    return fallback;
  }

  return normalized;
}

function getMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const detail = data.detail;
  if (typeof detail === 'string' && detail.length > 0) {
    return detail;
  }

  const nonFieldErrors = data.non_field_errors;
  if (Array.isArray(nonFieldErrors) && typeof nonFieldErrors[0] === 'string') {
    return nonFieldErrors[0];
  }

  const firstField = Object.keys(data)[0];
  if (!firstField) {
    return null;
  }

  const firstValue = data[firstField];
  if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
    return firstValue[0];
  }
  if (typeof firstValue === 'string') {
    return firstValue;
  }

  return null;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const payloadMessage = getMessageFromPayload(error.response?.data);
  if (payloadMessage) {
    return sanitizeErrorMessage(payloadMessage, fallback);
  }

  const rawResponseData = error.response?.data;
  if (typeof rawResponseData === 'string') {
    try {
      const parsed = JSON.parse(rawResponseData);
      const parsedMessage = getMessageFromPayload(parsed);
      if (parsedMessage) {
        return sanitizeErrorMessage(parsedMessage, fallback);
      }
    } catch {
      // Ignore parse failure and sanitize the raw string below.
    }

    return sanitizeErrorMessage(rawResponseData, fallback);
  }

  return fallback;
}
