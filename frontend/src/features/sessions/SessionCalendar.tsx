import { useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';

import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import type { Session } from '@/types/api';

import 'react-day-picker/style.css';

interface SessionCalendarProps {
  sessions: Session[];
  canUpdate: boolean;
  isMarking: boolean;
  markSessionId?: number;
  onEdit: (session: Session) => void;
  onMarkCompleted: (session: Session) => void;
}

function normalizeStatus(value?: string | null) {
  return value?.trim().toLowerCase();
}

export function SessionCalendar({
  sessions,
  canUpdate,
  isMarking,
  markSessionId,
  onEdit,
  onMarkCompleted,
}: SessionCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

  const daySessions = useMemo(() => {
    if (!selectedDay) {
      return [] as Session[];
    }

    return sessions.filter((session) => isSameDay(parseISO(session.session_date), selectedDay));
  }, [selectedDay, sessions]);

  const statusDates = useMemo(() => {
    const scheduled: Date[] = [];
    const completed: Date[] = [];
    const cancelled: Date[] = [];

    sessions.forEach((session) => {
      const dateValue = parseISO(session.session_date);
      const status = normalizeStatus(session.status_label);
      if (status === 'completed') {
        completed.push(dateValue);
        return;
      }
      if (status === 'cancelled') {
        cancelled.push(dateValue);
        return;
      }
      scheduled.push(dateValue);
    });

    return { scheduled, completed, cancelled };
  }, [sessions]);

  return (
    <div className="session-calendar-layout">
      <div className="session-calendar-wrap">
        <DayPicker
          mode="single"
          selected={selectedDay}
          onSelect={setSelectedDay}
          modifiers={{
            scheduled: statusDates.scheduled,
            completed: statusDates.completed,
            cancelled: statusDates.cancelled,
          }}
          modifiersClassNames={{
            scheduled: 'calendar-dot-scheduled',
            completed: 'calendar-dot-completed',
            cancelled: 'calendar-dot-cancelled',
          }}
        />

        <div className="calendar-legend">
          <span><i className="legend-dot dot-info" /> scheduled</span>
          <span><i className="legend-dot dot-success" /> completed</span>
          <span><i className="legend-dot dot-danger" /> cancelled</span>
        </div>
      </div>

      <div className="stack">
        <h4>
          {selectedDay ? `Sessions on ${format(selectedDay, 'yyyy-MM-dd')}` : 'Select a day'}
        </h4>

        {daySessions.length === 0 ? (
          <p>No sessions on this day.</p>
        ) : (
          daySessions.map((session) => {
            const isCompleted = normalizeStatus(session.status_label) === 'completed';
            return (
              <div key={session.id} className="calendar-session-card">
                <div className="calendar-session-meta">
                  <strong>{session.client_full_name}</strong>
                  <span>{session.treatment_title ?? session.treatment_type_and_site}</span>
                </div>
                <div className="actions-inline">
                  <StatusBadge status={session.status_label?.toLowerCase()} />
                  <StatusBadge status={session.payment_status_label?.toLowerCase()} />
                  {canUpdate ? (
                    <>
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
                    </>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
