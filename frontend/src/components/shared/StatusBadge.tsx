import { Badge } from '@/components/ui/Badge';

const STATUS_VARIANT_MAP: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  scheduled: 'info',
  completed: 'success',
  cancelled: 'danger',
  open: 'warning',
  paid: 'success',
  unpaid: 'danger',
  partial: 'warning',
  active: 'success',
  inactive: 'danger',
};

interface StatusBadgeProps {
  status: string | null | undefined;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = String(status ?? 'unknown').toLowerCase();
  const variant = STATUS_VARIANT_MAP[normalized] ?? 'neutral';

  return <Badge variant={variant}>{normalized}</Badge>;
}
