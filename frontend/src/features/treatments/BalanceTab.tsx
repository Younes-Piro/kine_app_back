import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { treatmentsApi } from '@/api/treatments';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatMoney } from '@/lib/formatters';

interface BalanceTabProps {
  treatmentId: number;
}

export function BalanceTab({ treatmentId }: BalanceTabProps) {
  const balanceQuery = useQuery({
    queryKey: queryKeys.treatments.balance(treatmentId),
    queryFn: () => treatmentsApi.balance(treatmentId),
  });

  if (balanceQuery.isLoading) {
    return <p>Loading balance...</p>;
  }

  if (balanceQuery.isError || !balanceQuery.data) {
    return <p>Failed to load balance breakdown.</p>;
  }

  const balance = balanceQuery.data;
  const total = Number(balance.total_price) || 0;
  const paid = Number(balance.total_paid) || 0;
  const progress = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;

  return (
    <div className="stack">
      <div className="metrics-grid">
        <div className="metric-card">
          <h4>Total Price</h4>
          <strong>{formatMoney(balance.total_price)}</strong>
        </div>
        <div className="metric-card">
          <h4>Total Paid</h4>
          <strong>{formatMoney(balance.total_paid)}</strong>
        </div>
        <div className="metric-card">
          <h4>Remaining</h4>
          <strong>{formatMoney(balance.total_remaining_amount)}</strong>
        </div>
        <div className="metric-card">
          <h4>Balance Carry</h4>
          <strong>{formatMoney(balance.balance)}</strong>
        </div>
      </div>

      <div className="stack">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p>{progress.toFixed(1)}% paid</p>
      </div>

      <div className="stack">
        <h4>Per-session payment status</h4>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Session Status</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {balance.sessions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="table-empty">
                    No sessions.
                  </td>
                </tr>
              ) : (
                balance.sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{formatDate(session.session_date, 'yyyy-MM-dd')}</td>
                    <td>
                      <StatusBadge status={session.status?.toLowerCase()} />
                    </td>
                    <td>
                      <StatusBadge status={session.payment_status?.toLowerCase()} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
