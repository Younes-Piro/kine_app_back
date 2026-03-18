import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { sessionsApi } from '@/api/sessions';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { usePermissions } from '@/hooks/usePermissions';
import { getApiErrorMessage } from '@/lib/http';
import type { Session } from '@/types/api';

import { SessionDetailModal } from './SessionDetailModal';

function normalizeStatus(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function isSessionLocked(session: Session) {
  const status = normalizeStatus(session.status_label);
  return status === 'completed' || status === 'cancelled';
}

function getSessionColor(session: Session) {
  const status = normalizeStatus(session.status_label);

  if (status === 'completed') {
    return 'var(--color-success)';
  }

  if (status === 'cancelled') {
    return 'var(--color-danger)';
  }

  return 'var(--color-info)';
}

function flattenErrorText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(flattenErrorText).join(' ');
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(flattenErrorText)
      .join(' ');
  }

  return '';
}

function getCalendarRestrictionReason(error: unknown): string | null {
  let rawText = '';

  if (axios.isAxiosError(error)) {
    rawText = flattenErrorText(error.response?.data);
    if (!rawText && typeof error.message === 'string') {
      rawText = error.message;
    }
  } else if (error instanceof Error) {
    rawText = error.message;
  } else {
    rawText = flattenErrorText(error);
  }

  const normalized = rawText.toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('clinic closed day')) {
    return 'Cannot move session: the selected day is a clinic closed day.';
  }
  if (normalized.includes('holiday')) {
    return 'Cannot move session: the selected day is a holiday.';
  }
  if (normalized.includes('closure range')) {
    return 'Cannot move session: the selected day is inside a clinic closure period.';
  }
  if (normalized.includes('inactive treatment')) {
    return 'Cannot move session: this treatment is inactive.';
  }

  return null;
}

export function SessionCalendarPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('session:update');

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: () => sessionsApi.list(),
  });

  const sessions = sessionsQuery.data ?? [];

  const sessionsById = useMemo(() => {
    return new Map(sessions.map((session) => [session.id, session]));
  }, [sessions]);

  const calendarEvents = useMemo<EventInput[]>(() => {
    return sessions.map((session) => {
      const title = `${session.client_full_name} — ${session.treatment_title ?? session.treatment_type_and_site}`;
      const locked = isSessionLocked(session);

      return {
        id: String(session.id),
        title,
        start: session.session_date,
        allDay: true,
        editable: canUpdate && !locked,
        backgroundColor: getSessionColor(session),
        textColor: '#ffffff',
      };
    });
  }, [canUpdate, sessions]);

  const invalidateSessionRelatedQueries = async (session: Session) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byTreatment(session.treatment) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.detail(session.treatment) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.balance(session.treatment) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.byClient(session.client) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.treatments.all }),
    ]);
  };

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, sessionDate }: { id: number; sessionDate: string }) =>
      sessionsApi.update(id, { session_date: sessionDate }),
  });

  const handleEventDrop = async (info: EventDropArg) => {
    const sessionId = Number(info.event.id);
    const session = sessionsById.get(sessionId);

    if (!session || !canUpdate || isSessionLocked(session)) {
      info.revert();
      return;
    }

    if (!info.event.start) {
      info.revert();
      toast.error('Could not read the selected date.');
      return;
    }

    const nextDate = format(info.event.start, 'yyyy-MM-dd');
    if (nextDate === session.session_date) {
      return;
    }

    try {
      await rescheduleMutation.mutateAsync({
        id: sessionId,
        sessionDate: nextDate,
      });

      toast.success('Session rescheduled');
      await invalidateSessionRelatedQueries(session);
    } catch (error) {
      info.revert();
      const restrictionReason = getCalendarRestrictionReason(error);
      toast.error(
        restrictionReason ??
          getApiErrorMessage(
            error,
            'Cannot move session to this day. The selected date is restricted.',
          ),
      );
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    const sessionId = Number(info.event.id);
    const session = sessionsById.get(sessionId);

    if (!session) {
      return;
    }

    setSelectedSession(session);
    setModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="card-header-between">
          <div>
            <CardTitle>Sessions Calendar</CardTitle>
            <p>Drag scheduled sessions to reschedule. Completed and cancelled sessions are locked.</p>
          </div>
        </CardHeader>

        <CardBody>
          <div className="calendar-page-legend">
            <span><i className="legend-dot dot-info" /> scheduled</span>
            <span><i className="legend-dot dot-success" /> completed</span>
            <span><i className="legend-dot dot-danger" /> cancelled</span>
          </div>

          {sessionsQuery.isLoading ? <p>Loading sessions calendar...</p> : null}
          {sessionsQuery.isError ? <p>Failed to load sessions calendar.</p> : null}

          {!sessionsQuery.isLoading && !sessionsQuery.isError ? (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={calendarEvents}
              editable={canUpdate}
              eventStartEditable={canUpdate}
              eventDurationEditable={false}
              eventDrop={handleEventDrop}
              eventClick={handleEventClick}
              height="auto"
            />
          ) : null}
        </CardBody>
      </Card>

      <SessionDetailModal
        open={modalOpen}
        mode="edit"
        session={selectedSession}
        treatments={[]}
        onClose={() => {
          setModalOpen(false);
          setSelectedSession(null);
        }}
        onSaved={async (savedSession) => {
          await invalidateSessionRelatedQueries(savedSession);
        }}
      />
    </>
  );
}
