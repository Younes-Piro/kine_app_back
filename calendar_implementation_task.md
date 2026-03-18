# 📅 Sessions Calendar — Implementation Task

## Overview

A dedicated `/sessions_calendar` page with a full **month/week/day** calendar powered by **FullCalendar**. Non-completed sessions can be **drag-and-dropped** to reschedule them. The existing calendar toggle inside `/sessions` is removed — that page becomes table-only.

**Depends on:** Foundation, Auth, Sessions API, Permissions

---

## New Dependencies

```bash
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

| Package                       | Purpose                              |
|-------------------------------|--------------------------------------|
| `@fullcalendar/react`         | React wrapper component              |
| `@fullcalendar/daygrid`       | Month view + all-day grid            |
| `@fullcalendar/timegrid`      | Week/day views with time slots       |
| `@fullcalendar/interaction`   | Drag-and-drop + event click          |

---

## API Used (existing, no backend changes)

| Method | Endpoint                           | Purpose                       |
|--------|------------------------------------|-------------------------------|
| GET    | `/api/sessions/`                   | Fetch all sessions            |
| PATCH  | `/api/sessions/{id}/`              | Update `session_date` on drop |
| PATCH  | `/api/sessions/{id}/mark_completed/` | Mark completed from modal   |

---

## TypeScript Types (existing)

Uses the existing `Session`, `SessionUpdateRequest` types from `types/api.ts`. No new types needed.

---

## Pages & Routes

| Route                | Component              | Permission      |
|----------------------|------------------------|-----------------|
| `/sessions_calendar` | `SessionCalendarPage`  | `session:view`  |

---

## Files to Create

### [NEW] `frontend/src/features/sessions/SessionCalendarPage.tsx`

Main page component:

```
FullCalendar
  ├── Header toolbar: prev / next / today | month / week / day
  ├── Events: one per session, mapped from sessionsApi.list()
  │     title  = "client_full_name — treatment_title"
  │     date   = session_date
  │     color  = status-based (info / success / danger)
  │     editable = true only if status ≠ "completed"
  ├── eventDrop → PATCH session_date → toast + invalidate queries
  ├── eventClick → open SessionDetailModal (reuse existing)
  └── Legend bar: scheduled (blue) / completed (green) / cancelled (red)
```

**Event color mapping:**
| Status      | Color                     | Draggable |
|-------------|---------------------------|-----------|
| `scheduled` | `var(--color-info)` 🔵    | ✅ Yes    |
| `completed` | `var(--color-success)` 🟢 | ❌ No     |
| `cancelled` | `var(--color-danger)` 🔴  | ❌ No     |

**Drag-and-drop flow:**
1. User drags a scheduled session to another date
2. `eventDrop` fires → call `sessionsApi.update(id, { session_date: newDate })`
3. On success → toast "Session rescheduled" → invalidate sessions + treatment queries
4. On error (closed day / holiday / closure range) → `info.revert()` + toast error message

**Event click flow:**
1. Click event → open `SessionDetailModal` in edit mode
2. On save/mark-completed → invalidate queries → calendar re-renders

---

## Files to Modify

### [MODIFY] `frontend/src/features/sessions/SessionListPage.tsx`

Remove the calendar view — make it **table-only**:
- Remove `viewMode` state (`'table' | 'calendar'`)
- Remove the Table View / Calendar View toggle buttons
- Remove the `<SessionCalendar>` import and conditional rendering
- Keep everything else: filters, `<SessionTable>`, create/edit modal, mark-completed

### [DELETE] `frontend/src/features/sessions/SessionCalendar.tsx`

No longer needed — fully replaced by `SessionCalendarPage`.

### [MODIFY] `frontend/src/components/layout/Sidebar.tsx`

Add nav item after "Sessions":
```typescript
import { CalendarRange } from 'lucide-react';

// In navItems array:
{ label: 'Calendar', to: '/sessions_calendar', icon: CalendarRange, permission: 'session:view' },
```

### [MODIFY] `frontend/src/router/index.tsx`

Add route inside the protected layout:
```tsx
import { SessionCalendarPage } from '@/features/sessions/SessionCalendarPage';

<Route
  path="sessions_calendar"
  element={
    <ProtectedRoute permission="session:view">
      <SessionCalendarPage />
    </ProtectedRoute>
  }
/>
```

### [MODIFY] `frontend/src/styles.css`

Add FullCalendar theme overrides:
```css
/* FullCalendar overrides */
.fc {
  --fc-border-color: var(--color-neutral-200);
  --fc-today-bg-color: rgba(20, 184, 166, 0.06);
  --fc-event-border-color: transparent;
  font-family: var(--font-sans);
}
.fc .fc-toolbar-title {
  font-family: var(--font-display);
  font-size: 1.2rem;
}
.fc .fc-button-primary {
  background: var(--color-primary-600);
  border-color: var(--color-primary-700);
}
.fc .fc-button-primary:hover {
  background: var(--color-primary-700);
}
.fc .fc-button-primary.fc-button-active {
  background: var(--color-primary-700);
}
.fc .fc-event {
  border-radius: 0.4rem;
  padding: 0.15rem 0.35rem;
  font-size: 0.78rem;
  cursor: pointer;
}
.fc .fc-event.fc-event-draggable {
  cursor: grab;
}
.calendar-page-legend {
  display: flex;
  gap: 1rem;
  padding: 0.6rem 0;
  font-size: 0.82rem;
  color: var(--color-neutral-600);
}
```

---

## React Query Keys (existing)

```typescript
sessions: {
  all: ['sessions'],
  byClient: (id: number) => ['sessions', { client_id: id }],
  byTreatment: (id: number) => ['sessions', { treatment_id: id }],
}
```

---

## Business Rules

1. **Only non-completed sessions are draggable** — completed and cancelled sessions are locked
2. Backend validates session dates: rejects closed weekdays, holidays, and closure ranges → frontend reverts on error
3. On successful reschedule → invalidate sessions, treatment detail, and treatment balance queries
4. Reuses existing `SessionDetailModal` for click-to-edit — no duplication
5. Permission: `session:view` to see the page, `session:update` to drag/edit

---

## Implementation Checklist

- [ ] Install FullCalendar packages (`@fullcalendar/core`, `react`, `daygrid`, `timegrid`, `interaction`)
- [ ] Create `SessionCalendarPage.tsx` with FullCalendar + drag-and-drop
- [ ] Map sessions to FullCalendar events with status-based colors
- [ ] Implement `eventDrop` handler (PATCH session_date, revert on error)
- [ ] Implement `eventClick` handler (open SessionDetailModal)
- [ ] Add calendar legend (scheduled / completed / cancelled)
- [ ] Add FullCalendar CSS overrides to `styles.css`
- [ ] Add sidebar nav item (Calendar with `CalendarRange` icon)
- [ ] Add router route `/sessions_calendar`
- [ ] Remove calendar toggle from `SessionListPage.tsx` (table-only)
- [ ] Delete `SessionCalendar.tsx`
- [ ] Test: drag scheduled session → verify date update
- [ ] Test: drag completed session → verify it's blocked
- [ ] Test: drag to closed day → verify error toast + revert
- [ ] Test: click event → verify modal opens
