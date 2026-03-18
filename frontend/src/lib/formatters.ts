import { format } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export function formatDate(dateValue?: string | null, pattern = 'PPP') {
  if (!dateValue) {
    return 'N/A';
  }

  try {
    return format(new Date(dateValue), pattern);
  } catch {
    return dateValue;
  }
}

export function formatMoney(value?: string | number | null) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) {
    return '0.00 MAD';
  }

  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(numeric);
}

export function resolveMediaUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//.test(url)) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}
