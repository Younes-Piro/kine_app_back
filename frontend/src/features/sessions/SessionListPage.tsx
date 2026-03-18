import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { sessionsApi } from '@/api/sessions';
import { treatmentsApi } from '@/api/treatments';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { usePermissions } from '@/hooks/usePermissions';
import { getApiErrorMessage } from '@/lib/http';
import type { Session } from '@/types/api';

import { SessionDetailModal } from './SessionDetailModal';
import { SessionTable } from './SessionTable';

type ModalMode = 'create' | 'edit';

export function SessionListPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission('session:create');
  const canUpdate = hasPermission('session:update');

  const [clientFilter, setClientFilter] = useState<number | undefined>();
  const [treatmentFilter, setTreatmentFilter] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ['sessions', { client_id: clientFilter, treatment_id: treatmentFilter }],
    queryFn: () =>
      sessionsApi.list({
        clientId: clientFilter,
        treatmentId: treatmentFilter,
      }),
  });

  const treatmentsQuery = useQuery({
    queryKey: queryKeys.treatments.all,
    queryFn: () => treatmentsApi.list(),
    enabled: modalOpen && modalMode === 'create',
  });

  const markCompletedMutation = useMutation({
    mutationFn: (sessionId: number) => sessionsApi.markCompleted(sessionId),
    onSuccess: (updatedSession) => {
      toast.success('Session marked as completed');
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.detail(updatedSession.treatment) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.balance(updatedSession.treatment) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.byClient(updatedSession.client) });
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.all });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to mark session completed'));
    },
  });

  const sessions = sessionsQuery.data ?? [];

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (dateFrom && session.session_date < dateFrom) {
        return false;
      }
      if (dateTo && session.session_date > dateTo) {
        return false;
      }
      return true;
    });
  }, [dateFrom, dateTo, sessions]);

  const clientOptions = useMemo(() => {
    const map = new Map<number, string>();
    sessions.forEach((session) => {
      if (!map.has(session.client)) {
        map.set(session.client, session.client_full_name);
      }
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sessions]);

  const treatmentOptions = useMemo(() => {
    const map = new Map<number, string>();
    sessions.forEach((session) => {
      const label = session.treatment_title ?? session.treatment_type_and_site;
      if (!map.has(session.treatment)) {
        map.set(session.treatment, label || `Treatment #${session.treatment}`);
      }
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sessions]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedSession(null);
    setModalOpen(true);
  };

  const openEditModal = (session: Session) => {
    setModalMode('edit');
    setSelectedSession(session);
    setModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="card-header-between">
          <div>
            <CardTitle>Sessions</CardTitle>
            <p>Manage sessions in table view.</p>
          </div>

          <div className="actions-inline">
            {canCreate ? (
              <Button type="button" onClick={openCreateModal}>
                New Session
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardBody>
          <div className="filters-grid">
            <div className="field">
              <label>Filter by Client</label>
              <select
                className="input"
                value={clientFilter ?? ''}
                onChange={(event) => {
                  const raw = event.target.value;
                  setClientFilter(raw ? Number(raw) : undefined);
                }}
              >
                <option value="">All clients</option>
                {clientOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Filter by Treatment</label>
              <select
                className="input"
                value={treatmentFilter ?? ''}
                onChange={(event) => {
                  const raw = event.target.value;
                  setTreatmentFilter(raw ? Number(raw) : undefined);
                }}
              >
                <option value="">All treatments</option>
                {treatmentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Date From"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <Input
              label="Date To"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>

          {sessionsQuery.isLoading ? <p>Loading sessions...</p> : null}
          {sessionsQuery.isError ? <p>Failed to load sessions.</p> : null}

          {!sessionsQuery.isLoading && !sessionsQuery.isError ? (
            <SessionTable
              sessions={filteredSessions}
              canUpdate={canUpdate}
              isMarking={markCompletedMutation.isPending}
              markSessionId={markCompletedMutation.variables}
              onEdit={openEditModal}
              onMarkCompleted={(session) => markCompletedMutation.mutate(session.id)}
            />
          ) : null}
        </CardBody>
      </Card>

      <SessionDetailModal
        open={modalOpen}
        mode={modalMode}
        session={selectedSession}
        defaultTreatmentId={treatmentFilter}
        treatments={treatmentsQuery.data ?? []}
        onClose={() => setModalOpen(false)}
        onSaved={(savedSession) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.treatments.detail(savedSession.treatment) });
          queryClient.invalidateQueries({ queryKey: queryKeys.treatments.balance(savedSession.treatment) });
          queryClient.invalidateQueries({ queryKey: queryKeys.treatments.byClient(savedSession.client) });
          queryClient.invalidateQueries({ queryKey: queryKeys.treatments.all });
        }}
      />
    </>
  );
}
