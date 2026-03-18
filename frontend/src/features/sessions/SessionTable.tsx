import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Table, type TableColumn } from '@/components/ui/Table';
import { formatDate } from '@/lib/formatters';
import type { Session } from '@/types/api';

interface SessionTableProps {
  sessions: Session[];
  canUpdate: boolean;
  isMarking: boolean;
  markSessionId?: number;
  onEdit: (session: Session) => void;
  onMarkCompleted: (session: Session) => void;
}

export function SessionTable({
  sessions,
  canUpdate,
  isMarking,
  markSessionId,
  onEdit,
  onMarkCompleted,
}: SessionTableProps) {
  const columns: Array<TableColumn<Session>> = [
    {
      header: 'Session Date',
      render: (session) => formatDate(session.session_date, 'yyyy-MM-dd'),
    },
    {
      header: 'Client',
      render: (session) => session.client_full_name,
    },
    {
      header: 'Treatment',
      render: (session) => session.treatment_title ?? session.treatment_type_and_site,
    },
    {
      header: 'Status',
      render: (session) => <StatusBadge status={session.status_label?.toLowerCase()} />,
    },
    {
      header: 'Payment Status',
      render: (session) => <StatusBadge status={session.payment_status_label?.toLowerCase()} />,
    },
    {
      header: 'Notes',
      render: (session) => session.notes ?? 'N/A',
    },
    {
      header: 'Actions',
      render: (session) => {
        if (!canUpdate) {
          return <span className="help-text">No action</span>;
        }

        const isCompleted = session.status_label?.toLowerCase() === 'completed';

        return (
          <div className="actions-inline" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(session)}>
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={isCompleted}
              isLoading={isMarking && markSessionId === session.id}
              onClick={() => onMarkCompleted(session)}
            >
              {isCompleted ? 'Completed' : 'Mark Completed'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={sessions}
      getRowKey={(session) => session.id}
      emptyMessage="No sessions found."
    />
  );
}
