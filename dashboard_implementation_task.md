# 📊 Dashboard — Implementation Task

## Overview

Main dashboard page showing key metrics, recent activity, and charts for the clinic. Visible to all authenticated users (data scoped by permissions).

**Depends on:** Foundation, Auth, Permissions, all other modules (data sources)

---

## Pages & Routes

| Route | Component       | Description        |
|-------|-----------------|--------------------|
| `/`   | `DashboardPage` | Main dashboard     |

---

## Dashboard Sections

### 1. Summary Cards (KPIs)
- **Total Active Clients** — count from `/api/clients/` (filtered `is_active=true`)
- **Today's Sessions** — count from `/api/sessions/?date=today`
- **Pending Payments** — sum of `total_remaining_amount` across active treatments
- **Monthly Revenue** — sum of payments for current month

### 2. Session Status Chart
- Pie/donut chart showing session distribution: scheduled, completed, cancelled
- Uses `recharts` `<PieChart>`
- Color-coded using status tokens

### 3. Revenue Chart
- Bar/line chart showing monthly payment totals
- Uses `recharts` `<BarChart>` or `<LineChart>`
- Last 6 or 12 months

### 4. Recent Activity
- Latest 5 sessions (with status badges)
- Latest 5 payments (with amounts)
- Quick links to relevant detail pages

### 5. Upcoming Sessions
- Next 5 scheduled sessions with client name, date, treatment info
- Quick "Mark Completed" action

---

## Components

### DashboardPage
- Grid layout with KPI cards at top
- Charts in middle row
- Recent activity / upcoming sessions at bottom
- Responsive: stack on mobile

### KPICard
- Icon, label, value, optional trend indicator
- Uses `framer-motion` for count-up animation

### SessionStatusChart
- `recharts` PieChart with status-colored segments
- Legend with counts

### RevenueChart
- `recharts` BarChart or AreaChart
- Monthly aggregation
- Formatted currency values (MAD)

---

## Data Fetching Strategy

Dashboard aggregates data from multiple APIs. Options:
1. **Multiple parallel queries** — fetch clients count, sessions, payments separately
2. **Custom backend endpoint** — add `/api/dashboard/` (would require backend changes)

> Recommended: Use multiple parallel React Query calls. The existing APIs support all needed filters.

---

## Implementation Checklist

- [ ] `features/dashboard/DashboardPage.tsx` — main dashboard layout
- [ ] `features/dashboard/KPICard.tsx` — summary card component
- [ ] `features/dashboard/SessionStatusChart.tsx` — recharts pie chart
- [ ] `features/dashboard/RevenueChart.tsx` — recharts bar/line chart
- [ ] `features/dashboard/RecentActivity.tsx` — latest sessions/payments
- [ ] `features/dashboard/UpcomingSessions.tsx` — upcoming scheduled sessions
- [ ] Parallel data fetching with React Query
- [ ] Responsive grid layout
- [ ] Framer Motion animations for KPI cards
