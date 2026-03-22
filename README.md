# 🏥 KinéApp — Physiotherapy Cabinet Management System

A full-stack clinic management platform for physiotherapy (kinesitherapy) practices, built with **Django REST Framework** and **React + TypeScript**.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **Authentication** | JWT login/logout with access + refresh token rotation |
| **Clients** | CRUD with file number, profile photo upload, and per-client balance tracking |
| **Treatments** | Prescriptions with auto-generated sessions, progress tracking, and financial balance |
| **Sessions** | Table + full calendar views, mark as completed, drag-and-drop rescheduling |
| **Payments** | Record payments against treatments with ceiling validation |
| **Invoices** | Generate invoices with PDF export and data snapshot at creation |
| **Users** | Admin-managed user accounts with role-based access (admin / staff) |
| **Permissions** | Granular permission assignment per user and per module action |
| **Settings** | Manage dropdown options, holidays, clinic closed days, and closure ranges |
| **Activity Log** | Audit trail of all user actions across the platform |
| **Dashboard** | KPI cards, charts, and recent activity overview |

---

## 🛠 Tech Stack

### Backend
- **Python 3.12+**
- **Django 6.0** — Web framework
- **Django REST Framework 3.16** — RESTful API
- **SimpleJWT** — JWT authentication with token blacklisting
- **SQLite** (development) / **PostgreSQL** (production-ready via `psycopg2`)
- **Pillow** — Image handling for profile photos
- **django-cors-headers** — CORS support

### Frontend
- **React 18** + **TypeScript**
- **Vite 6** — Build tool
- **React Router 6** — Client-side routing
- **TanStack React Query** — Server state management
- **Zustand** — Auth state store
- **React Hook Form** + **Zod** — Form handling and validation
- **FullCalendar** — Drag-and-drop session calendar
- **Recharts** — Dashboard charts
- **Lucide React** — Icons
- **Sonner** — Toast notifications
- **Framer Motion** — Animations

---

## 📁 Project Structure

```
kine_app/
├── app/                    # Django project settings & root URL config
├── authentification/       # Login, logout, token refresh endpoints
├── users/                  # User CRUD (admin only)
├── permissions/            # Permission catalog, assignment & checking
├── clients/                # Client management + treatments + file uploads
├── client_sessions/        # Session tracking, mark completed
├── payments/               # Payment recording with ceiling validation
├── invoices/               # Invoice generation + PDF export
├── app_settings/           # AppOptions, holidays, closed days, closure ranges
├── activity_log/           # Audit trail for all user actions
├── manage.py
├── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios client & per-module API functions
│   │   ├── components/     # Shared UI components (Button, Card, Input, etc.)
│   │   ├── features/       # Feature modules (auth, clients, sessions, etc.)
│   │   ├── hooks/          # Custom hooks (useAuth, usePermissions, etc.)
│   │   ├── lib/            # Utilities (HTTP helpers, form validation)
│   │   ├── router/         # Routes & route guards
│   │   ├── store/          # Zustand auth store
│   │   ├── types/          # TypeScript API type definitions
│   │   └── styles.css      # Global design system
│   ├── package.json
│   └── vite.config.ts
│
└── plans/                  # Implementation task files per feature
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- npm 9+

### Backend Setup

```bash
# Clone the repository
git clone <repo-url>
cd kine_app

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Environment Variables below)
cp .env.example .env

# Run migrations
python manage.py migrate

# Create a superuser
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to `http://localhost:8000`.

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## 📡 API Endpoints

| Prefix | Module | Auth |
|--------|--------|------|
| `api/auth/` | Login, logout, refresh, current user | Public (login) / JWT |
| `api/users/` | User CRUD, deactivate | Admin only |
| `api/permissions/` | Catalog, my permissions, user permissions | JWT |
| `api/clients/` | Client CRUD | Permission-based |
| `api/clients/<id>/treatments/` | Treatment CRUD, balance | Permission-based |
| `api/sessions/` | Session list, update, mark completed | Permission-based |
| `api/payments/` | Payment CRUD | Permission-based |
| `api/invoices/` | Invoice CRUD, PDF generation | Permission-based |
| `api/settings/` | AppOptions, holidays, closed days, closures | Admin only |
| `api/activity-log/` | Activity audit log (read-only) | Admin only |

---

## 👥 Roles & Permissions

| Role | Access |
|------|--------|
| **Admin** | Full access to all modules including user management, settings, and activity log |
| **Staff** | Access determined by individually assigned permissions (e.g., `client:view`, `session:update`) |

Permission format: `module:action` (e.g., `client:create`, `treatment:view`, `payment:delete`)

---

## 🧪 Development

```bash
# Run backend tests
python manage.py test

# Build frontend for production
cd frontend && npm run build

# Preview production build
npm run preview
```

---

## 📄 License

Private project — all rights reserved.